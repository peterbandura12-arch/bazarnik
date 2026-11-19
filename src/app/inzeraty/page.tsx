import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingCard } from "@/components/listings/ListingCard";
import { FiltersPanel } from "@/components/listings/FiltersPanel";
import { SortSelect } from "@/components/listings/SortSelect";
import { Pagination } from "@/components/listings/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { searchListings, collectPricedSample, type SortOption } from "@/lib/listings";
import { getCategoryPath, getCategoryNavChips, CATEGORY_EMOJI } from "@/lib/categories";
import { computePriceStats, getPriceVerdict } from "@/lib/price-analysis";
import { PriceAnalysis } from "@/components/listings/PriceAnalysis";
import { safeSearchExternal } from "@/lib/meta-search";
import { ExternalResultsSection } from "@/components/search/ExternalResultsSection";
import { getCurrentProfile, isSupabaseConfigured } from "@/lib/supabase/server";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata: Metadata = {
  title: "Inzeráty – vyhľadávanie a filtre",
  description:
    "Prehľadajte všetky inzeráty na Bazárniku. Filtre podľa ceny, lokality, stavu produktu a kategórie.",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ListingsPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const filters = {
    q: first(sp.q),
    category: first(sp.category),
    minPrice: first(sp.minPrice),
    maxPrice: first(sp.maxPrice),
    location: first(sp.location),
    condition: first(sp.condition),
    source: first(sp.source),
    sort: (first(sp.sort) as SortOption) ?? "najnovsie",
    page: Number(first(sp.page) ?? "1") || 1,
    perPage: 24,
  };

  const profile = isSupabaseConfigured() ? await getCurrentProfile() : null;
  const [result, pricedSample, externalResults] = await Promise.all([
    searchListings(filters),
    filters.q ? collectPricedSample(filters) : Promise.resolve([]),
    filters.q ? safeSearchExternal(filters.q, 6) : Promise.resolve([]),
  ]);
  const priceStats = computePriceStats(pricedSample.map((p) => p.price));
  const priceVerdictById = new Map(
    pricedSample
      .map((p) => [p.id, getPriceVerdict(p.price, priceStats.median)] as const)
      .filter(([, v]) => v !== null)
  );
  const categoryPath = filters.category ? getCategoryPath(filters.category) : [];
  const categoryChips = filters.category ? getCategoryNavChips(filters.category) : [];

  const activeParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const val = first(v);
    if (val) activeParams[k] = val;
  }

  return (
    <div className="container-page py-6">
      <nav aria-label="Navigácia kategórií" className="mb-4 text-sm text-ink-500">
        <a href="/" className="hover:text-brand-700">Domov</a>
        <span className="mx-1.5">/</span>
        <a href="/inzeraty" className="hover:text-brand-700">Inzeráty</a>
        {categoryPath.map((c) => (
          <span key={c.slug}>
            <span className="mx-1.5">/</span>
            <span className="font-medium text-ink-800">{c.name}</span>
          </span>
        ))}
      </nav>

      {categoryChips.length > 0 && (
        <nav aria-label="Podkategórie" className="mb-4 flex flex-wrap gap-2">
          {categoryChips.map((chip) => (
            <a
              key={chip.slug}
              href={`/inzeraty?category=${chip.slug}`}
              className="group inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-sm font-medium text-ink-700 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm"
            >
              <span aria-hidden className="text-sm">
                {CATEGORY_EMOJI[chip.slug] ?? "📁"}
              </span>
              {chip.name}
            </a>
          ))}
        </nav>
      )}

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
          {filters.q
            ? `Výsledky pre „${filters.q}“`
            : categoryPath[categoryPath.length - 1]?.name ?? "Všetky inzeráty"}
        </h1>
        <p className="text-sm text-ink-500">
          {result.isDemo ? "Ukážkové dáta" : `${result.total} inzerátov`}
        </p>
      </div>

      <div className="mb-4 lg:hidden">
        <Suspense fallback={null}>
          <FiltersPanel compact />
        </Suspense>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-64 lg:shrink-0">
          <Suspense fallback={null}>
            <FiltersPanel />
          </Suspense>
        </div>

        <div className="min-w-0 flex-1">
          {filters.q && <PriceAnalysis stats={priceStats} />}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-500">
              Strana {result.page}
              {result.total > result.perPage &&
                ` z ${Math.max(1, Math.ceil(result.total / result.perPage))}`}
            </p>
            <Suspense fallback={null}>
              <SortSelect />
            </Suspense>
          </div>

          {result.items.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {result.items.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    isLoggedIn={Boolean(profile)}
                    priceVerdict={filters.q ? priceVerdictById.get(listing.id) ?? undefined : undefined}
                  />
                ))}
              </div>
              <Pagination
                page={result.page}
                total={result.total}
                perPage={result.perPage}
                params={activeParams}
              />
            </>
          ) : (
            <EmptyState
              title="Nenašli sme žiadne inzeráty"
              description="Skúste zmeniť vyhľadávací výraz alebo zrušiť časť filtrov."
              action={
                <ButtonLink href="/inzeraty" variant="outline">
                  Zrušiť všetky filtre
                </ButtonLink>
              }
            />
          )}

          <ExternalResultsSection items={externalResults} />
        </div>
      </div>
    </div>
  );
}
