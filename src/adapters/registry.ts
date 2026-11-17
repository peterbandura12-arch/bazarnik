import type { ExternalSourceAdapter } from "./types";
import { exampleJsonFeedAdapter } from "./sources/json-feed.example";
import { universalFeedAdapter } from "./sources/universal-feed";

/**
 * Register adaptérov externých zdrojov.
 * Nový portál sa doplní pridaním adaptéra do tohto zoznamu – bez zásahu
 * do zvyšku aplikácie. Univerzálny adaptér pokrýva ľubovoľný partnerský
 * feed (JSON/XML/RSS) nastavený v external_sources.feed_url.
 */
export const ADAPTERS: ExternalSourceAdapter[] = [universalFeedAdapter, exampleJsonFeedAdapter];

export function getAdapter(slug: string): ExternalSourceAdapter | undefined {
  return ADAPTERS.find((a) => a.slug === slug);
}
