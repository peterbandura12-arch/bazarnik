import type { ExternalSourceAdapter, NormalizedListing, SyncResult } from "../types";

/**
 * VZOROVÝ ADAPTÉR – JSON feed.
 *
 * Slúži ako predloha pre pripojenie zdroja, ktorý poskytuje verejný
 * partnerský feed (napr. https://example.sk/feed.json).adaptér NEPOUŽÍVA
 * scraping – vyžaduje oficiálne poskytnutý feed.
 *
 * Ako pripojiť nový zdroj:
 * 1. Skopírujte tento súbor a upravte mapovanie polí na NormalizedListing.
 * 2. Zaregistrujte adaptér v src/adapters/registry.ts.
 * 3. Vložte záznam do tabuľky external_sources (admin → Externé zdroje)
 *    s is_active = true až po overení práv na použitie údajov.
 * 4. Spustite synchronizáciu cez /api/cron/sync.
 */
export const exampleJsonFeedAdapter: ExternalSourceAdapter = {
  slug: "priklad-json-feed",
  name: "Príklad JSON feed (nepripojený)",
  websiteUrl: "https://example.sk",
  accessDescription:
    "Vzorový adaptér pre partnerský JSON feed. Nie je pripojený na žiadny reálny portál.",

  async fetchListings(config: { feedUrl: string | null }): Promise<NormalizedListing[]> {
    const feedUrl = config.feedUrl ?? process.env.EXAMPLE_FEED_URL;
    if (!feedUrl) {
      // Zdroj nie je nakonfigurovaný – vrátime prázdny zoznam, nie demo dáta.
      return [];
    }

    const res = await fetch(feedUrl, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`Feed vrátil stav ${res.status}`);
    }

    type FeedItem = {
      id: string;
      url: string;
      title: string;
      description?: string;
      price?: number;
      currency?: string;
      condition?: string;
      brand?: string;
      model?: string;
      location?: string;
      category?: string;
      image?: string;
      published_at?: string;
    };

    const payload = (await res.json()) as { items?: FeedItem[] };

    return (payload.items ?? []).map((item) => ({
      externalId: String(item.id),
      url: item.url,
      title: item.title,
      description: item.description ?? null,
      price: item.price ?? null,
      currency: item.currency ?? "EUR",
      condition: null,
      brand: item.brand ?? null,
      model: item.model ?? null,
      location: item.location ?? null,
      categorySlug: item.category ?? null,
      imageUrl: item.image ?? null,
      publishedAt: item.published_at ?? new Date().toISOString(),
    }));
  },
};

export type { SyncResult };
