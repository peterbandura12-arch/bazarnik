import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Metavyhladavanie na externych inzertnych portaloch cez vyhladavacie API
 * (Google Custom Search alebo Brave Search). Portaly su prehladavane cez ich
 * index, co je legalny sposob zobrazenia vysledkov s presmerovanim na
 * povodny portal. Nastaveny kluc urcuje, ktory poskyovatel sa pouzije;
 * ak prvy zlyha, skusi sa dalsi.
 */

const querySchema = z.object({
  q: z.string().trim().min(2).max(100),
});

const DEFAULT_SITES = "bazos.sk,bazos.cz,aukro.cz,vinted.sk,autobazar.eu,bazar.sk";

type ExternalSearchItem = {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  thumbnail: string | null;
};

async function searchGoogle(q: string, siteFilter: string): Promise<ExternalSearchItem[]> {
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

async function searchBrave(q: string, siteFilter: string): Promise<ExternalSearchItem[]> {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ q: searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatny dopyt." }, { status: 400 });
  }

  const sites = (process.env.EXTERNAL_SEARCH_SITES ?? DEFAULT_SITES)
    .split(",")
    .map((site) => site.trim())
    .filter(Boolean);
  const siteFilter = sites.map((site) => `site:${site}`).join(" OR ");

  const attempts: Array<{
    provider: string;
    enabled: boolean;
    run: () => Promise<ExternalSearchItem[]>;
  }> = [
    {
      provider: "Google",
      enabled: Boolean(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX),
      run: () => searchGoogle(parsed.data.q, siteFilter),
    },
    {
      provider: "Brave",
      enabled: Boolean(process.env.BRAVE_SEARCH_API_KEY),
      run: () => searchBrave(parsed.data.q, siteFilter),
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
      return NextResponse.json({ enabled: true, provider: attempt.provider, items });
    } catch (error) {
      reasons.push(
        `${attempt.provider}: ${error instanceof Error ? error.message : "neznama chyba"}`,
      );
    }
  }

  console.error("external-search failed:", reasons.join(" | "));

  const anyEnabled = attempts.some((attempt) => attempt.enabled);
  if (!anyEnabled) {
    return NextResponse.json(
      { enabled: false, error: "Vyhladavanie na portaloch nie je aktivovane." },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { error: "Vyhladavanie zlyhalo.", reason: reasons.join(" | ") },
    { status: 502 },
  );
}
