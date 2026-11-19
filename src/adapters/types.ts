import type { ListingCondition } from "@/types/database";

/** Konfigurácia zdroja z tabuľky external_sources, ktorú adaptér dostane pri synchronizácii. */
export interface AdapterSourceConfig {
  /** Stabilný identifikátor zdroja, zhodný s external_sources.slug */
  slug: string;
  /** URL partnerského feedu z external_sources.feed_url (ak je nastavená) */
  feedUrl: string | null;
}

/** Normalizovaná externá ponuka – jednotný formát pre všetky zdroje. */
export interface NormalizedListing {
  externalId: string;
  url: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  condition: ListingCondition | null;
  brand: string | null;
  model: string | null;
  location: string | null;
  categorySlug: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
}

export interface SyncResult {
  imported: number;
  updated: number;
  markedUnavailable: number;
  skippedDuplicates: number;
  errors: string[];
}

/**
 * Adaptér externého inzertného zdroja.
 * Implementujte ho IBA pre oficiálne API, partnerské feedy alebo iné
 * povolené spôsoby získavania údajov. Scraping bez povolenia je zakázaný.
 */
export interface ExternalSourceAdapter {
  /** Stabilný identifikátor zdroja, zhodný s external_sources.slug */
  readonly slug: string;
  /** Ľudsky čitateľný názov zdroja */
  readonly name: string;
  /** URL zdrojového portálu */
  readonly websiteUrl: string;
  /** Popis spôsobu získavania údajov (API/feed) a jeho právneho základu */
  readonly accessDescription: string;

  /** Stiahne a normalizuje aktuálne ponuky zo zdroja. */
  fetchListings(config: AdapterSourceConfig): Promise<NormalizedListing[]>;

  /** Voliteľne odvodí slug kategórie Bazárnika z URL inzerátu – na doliečenie starých importov. */
  getCategoryFromUrl?(url: string): string | null;
}

export class UnsupportedSourceError extends Error {
  constructor(slug: string) {
    super(`Zdroj "${slug}" neposkytuje legálny spôsob získavania údajov a nie je podporovaný.`);
    this.name = "UnsupportedSourceError";
  }
}
