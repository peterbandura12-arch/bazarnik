import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Metavyhľadávanie na externých inzertných portáloch cez Google Custom Search
 * JSON API. Portály sú prehľadávané cez Google index, čo je legálny spôsob
 * zobrazenia výsledkov s presmerovaním na pôvodný portál.
 */

const querySchema = z.object({
  q: z.string().trim().min(2).max(100),
});

const DEFAULT_SITES = "bazos.sk,bazos.cz,aukro.cz,vinted.sk,autobazar.eu,bazar.sk";

export async function GET(request: Request) {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;

  if (!apiKey || !cx) {
    return NextResponse.json(
      { enabled: false, error: "Vyhľadávanie na portáloch nie je aktivované." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ q: searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatný dopyt." }, { status: 400 });
  }

  const sites = (process.env.EXTERNAL_SEARCH_SITES ?? DEFAULT_SITES)
    .split(",")
    .map((site) => site.trim())
    .filter(Boolean);

  const siteFilter = sites.map((site) => `site:${site}`).join(" OR ");
  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: `${parsed.data.q} ${siteFilter}`,
    num: "10",
    hl: "sk",
  });

  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const upstream = await res.text();
    let reason = `Google API vrátilo stav ${res.status}`;
    try {
      const parsed = JSON.parse(upstream) as { error?: { message?: string } };
      if (parsed.error?.message) reason = parsed.error.message;
    } catch {
      // zachováme základný dôvod
    }
    console.error("external-search failed:", reason);
    return NextResponse.json(
      { error: "Vyhľadávanie zlyhalo.", reason },
      { status: 502 }
    );
  }

  const data = (await res.json()) as { items?: Array<Record<string, unknown>> };
  const items = (data.items ?? []).map((item) => ({
    title: typeof item.title === "string" ? item.title : "",
    link: typeof item.link === "string" ? item.link : "",
    snippet: typeof item.snippet === "string" ? item.snippet : "",
    displayLink: typeof item.displayLink === "string" ? item.displayLink : "",
  }));

  return NextResponse.json({ enabled: true, items });
}
