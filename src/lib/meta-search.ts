/**
 * Metavyhladavanie na externych inzertnych portaloch cez vyhladavacie API
 * (Google Custom Search alebo Brave Search -> fallback). Vysledky su len
 * nazov + odkaz + ukezka + nahliad, klik vedie na povodny portal – to je
 * legalny sposob zobrazenia ponuk ostatnych portalov (aggregator).
 *
 * Aktivuje sa automaticky, ked su nastavene kluce:
 *   GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX, alebo BRAVE_SEARCH_API_KEY.
 */

export interface ExternalResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  thumbnail: string | null;
}

const DEFAULT_SITES = "bazos.sk,bazos.cz,aukro.cz,vinted.sk,autobazar.eu,bazar.sk";

export function isMetaSearchEnabled(): boolean {
  return Boolean(
    (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX) ||
      process.env.BRAVE_SEARCH_API_KEY
  );
}

async function searchGoogle(q: string, siteFilter: string): Promise<ExternalResult[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!apiKey || !cx) throw new Error("missing-credentials");

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: `${q} ${siteFilter}`,
    num: "10",
    hl: "sk",
  });

  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const upstream = await res.text();
    let reason = `Google API vratilo stav ${res.status}`;
    try {
      const parsed = JSON.parse(upstream) as { error?: { message?: string } };
      if (parsed.error?.message) reason = parsed.error.message;
    } catch {
      // zachovame zakladny dovod
    }
    throw Object.assign(new Error(reason), { provider: "Google" });
  }

  const data = (await res.json()) as { items?: Array<Record<string, unknown>> };
  return (data.items ?? []).map((item) => {
    const pagemap = item.pagemap as
      | { cse_image?: Array<{ src?: string }>; cse_thumbnail?: Array<{ src?: string }> }
      | undefined;
    const thumbnail =
      pagemap?.cse_thumbnail?.[0]?.src ?? pagemap?.cse_image?.[0]?.src ?? null;
    return {
      title: typeof item.title === "string" ? item.title : "",
      link: typeof item.link === "string" ? item.link : "",
      snippet: typeof item.snippet === "string" ? item.snippet : "",
      displayLink: typeof item.displayLink === "string" ? item.displayLink : "",
      thumbnail: typeof thumbnail === "string" ? thumbnail : null,
    };
  });
}

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
  meta_url?: { hostname?: string };
}

async function searchBrave(q: string, siteFilter: string): Promise<ExternalResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) throw new Error("missing-credentials");

  const params = new URLSearchParams({
    q: `${q} (${siteFilter})`,
    count: "10",
    country: "sk",
    search_lang: "sk",
  });

  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    let reason = `Brave API vratilo stav ${res.status}`;
    try {
      const parsed = (await res.json()) as { error?: string };
      if (parsed.error) reason = parsed.error;
    } catch {
      // zachovame zakladny dovod
    }
    throw Object.assign(new Error(reason), { provider: "Brave" });
  }

  const data = (await res.json()) as { web?: { results?: BraveWebResult[] } };
  return (data.web?.results ?? []).map((item) => ({
    title: item.title ?? "",
    link: item.url ?? "",
    snippet: item.description ?? "",
    displayLink: item.meta_url?.hostname ?? "",
    thumbnail: null,
  }));
}

/** Vyhlada na externych portaloch; vrati prve `limit` vysledkov. */
export async function searchExternal(q: string, limit = 10): Promise<ExternalResult[]> {
  const sites = (process.env.EXTERNAL_SEARCH_SITES ?? DEFAULT_SITES)
    .split(",")
    .map((site) => site.trim())
    .filter(Boolean);
  const siteFilter = sites.map((site) => `site:${site}`).join(" OR ");

  const attempts: Array<{ provider: string; enabled: boolean; run: () => Promise<ExternalResult[]> }> =
    [
      {
        provider: "Google",
        enabled: Boolean(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX),
        run: () => searchGoogle(q, siteFilter),
      },
      {
        provider: "Brave",
        enabled: Boolean(process.env.BRAVE_SEARCH_API_KEY),
        run: () => searchBrave(q, siteFilter),
      },
    ];

  const reasons: string[] = [];
  for (const attempt of attempts) {
    if (!attempt.enabled) {
      reasons.push(`${attempt.provider}: kluc nie je nastaveny`);
      continue;
    }
    try {
      const items = await attempt.run();
      return items.filter((i) => i.link).slice(0, limit);
    } catch (error) {
      reasons.push(
        `${attempt.provider}: ${error instanceof Error ? error.message : "neznama chyba"}`
      );
    }
  }

  throw new Error(reasons.join(" | "));
}

/** Bezpecna verzia – nikdy nezlyha, pri chybe vrati prazdny zoznam. */
export async function safeSearchExternal(q: string, limit = 8): Promise<ExternalResult[]> {
  if (!isMetaSearchEnabled() || !q.trim()) return [];
  try {
    return await searchExternal(q, limit);
  } catch {
    return [];
  }
}
