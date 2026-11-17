import type { ExternalSourceAdapter } from "./types";
import { exampleJsonFeedAdapter } from "./sources/json-feed.example";

/**
 * Register adaptérov externých zdrojov.
 * Nový portál sa doplní pridaním adaptéra do tohto zoznamu – bez zásahu
 * do zvyšku aplikácie. Aktuálne nie je pripojený žiadny reálny zdroj.
 */
export const ADAPTERS: ExternalSourceAdapter[] = [exampleJsonFeedAdapter];

export function getAdapter(slug: string): ExternalSourceAdapter | undefined {
  return ADAPTERS.find((a) => a.slug === slug);
}
