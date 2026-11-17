import type { UnifiedListing } from "@/types/database";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { DEMO_LISTINGS } from "@/lib/demo/data";
import type { SortOption } from "@/lib/sort";

export type { SortOption };
export { SORT_OPTIONS } from "@/lib/sort";



export interface ListingFilters {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  location?: string;
  condition?: string;
  source?: string;
  sort?: SortOption;
  page?: number;
  perPage?: number;
}

export interface SearchResult {
  items: UnifiedListing[];
  total: number;
  page: number;
  perPage: number;
  isDemo: boolean;
}


function filterDemo(items: UnifiedListing[], f: ListingFilters): UnifiedListing[] {
  let out = [...items];

  if (f.q) {
    const q = f.q.toLowerCase();
    out = out.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.brand ?? "").toLowerCase().includes(q) ||
        (l.model ?? "").toLowerCase().includes(q) ||
        (l.description ?? "").toLowerCase().includes(q)
    );
  }
  if (f.category) {
    const direct = out.filter((l) => l.category_id === f.category);
    if (direct.length > 0) {
      out = direct;
    } else {
      out = out.filter((l) => l.category_id?.startsWith(f.category!.slice(0, 4)));
    }
  }
  if (f.minPrice) out = out.filter((l) => l.price !== null && l.price >= Number(f.minPrice));
  if (f.maxPrice) out = out.filter((l) => l.price !== null && l.price <= Number(f.maxPrice));
  if (f.location)
    out = out.filter((l) => (l.location ?? "").toLowerCase().includes(f.location!.toLowerCase()));
  if (f.condition) out = out.filter((l) => l.condition === f.condition);
  if (f.source) out = out.filter((l) => l.source_type === f.source);

  switch (f.sort) {
    case "najstarsie":
      out.sort((a, b) => a.published_at.localeCompare(b.published_at));
      break;
    case "cena_vzostupne":
      out.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      break;
    case "cena_zostupne":
      out.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
      break;
    case "relevantne":
      out.sort((a, b) => {
        if (!f.q) return b.published_at.localeCompare(a.published_at);
        const score = (l: UnifiedListing) =>
          l.title.toLowerCase().includes(f.q!.toLowerCase()) ? 1 : 0;
        return score(b) - score(a) || b.published_at.localeCompare(a.published_at);
      });
      break;
    default:
      out.sort((a, b) => b.published_at.localeCompare(a.published_at));
  }

  return out;
}

function paginate(items: UnifiedListing[], page: number, perPage: number) {
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}

export async function searchListings(f: ListingFilters): Promise<SearchResult> {
  const page = Math.max(1, f.page ?? 1);
  const perPage = Math.min(48, Math.max(1, f.perPage ?? 24));

  if (!isSupabaseConfigured()) {
    const filtered = filterDemo(DEMO_LISTINGS, f);
    return {
      items: paginate(filtered, page, perPage),
      total: filtered.length,
      page,
      perPage,
      isDemo: true,
    };
  }

  const supabase = await createClient();
  let query = supabase.from("v_listings_search").select("*", { count: "exact" });

  if (f.q) query = query.ilike("title", `%${f.q}%`);
  if (f.category) query = query.eq("category_id", f.category);
  if (f.minPrice) query = query.gte("price", Number(f.minPrice));
  if (f.maxPrice) query = query.lte("price", Number(f.maxPrice));
  if (f.location) query = query.ilike("location", `%${f.location}%`);
  if (f.condition) query = query.eq("condition", f.condition);
  if (f.source) query = query.eq("source_type", f.source);

  switch (f.sort) {
    case "najstarsie":
      query = query.order("published_at", { ascending: true });
      break;
    case "cena_vzostupne":
      query = query.order("price", { ascending: true, nullsFirst: false });
      break;
    case "cena_zostupne":
      query = query.order("price", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order("published_at", { ascending: false });
  }

  const from = (page - 1) * perPage;
  const { data, error, count } = await query.range(from, from + perPage - 1);

  if (error) {
    console.error("Chyba pri vyhľadávaní inzerátov:", error.message);
    return { items: [], total: 0, page, perPage, isDemo: false };
  }

  return {
    items: (data ?? []) as UnifiedListing[],
    total: count ?? 0,
    page,
    perPage,
    isDemo: false,
  };
}

export async function getListingBySlug(slug: string): Promise<UnifiedListing | null> {
  if (!isSupabaseConfigured()) {
    return DEMO_LISTINGS.find((l) => l.slug === slug) ?? null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("v_listings_search")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return (data as UnifiedListing) ?? null;
}

export async function getSimilarListings(
  listing: UnifiedListing,
  limit = 4
): Promise<UnifiedListing[]> {
  const result = await searchListings({
    category: listing.category_id ?? undefined,
    perPage: limit + 1,
    sort: "najnovsie",
  });
  return result.items.filter((l) => l.id !== listing.id).slice(0, limit);
}

export async function getLatestListings(perPage = 8): Promise<SearchResult> {
  return searchListings({ sort: "najnovsie", perPage });
}

export async function getExternalListings(perPage = 4): Promise<SearchResult> {
  return searchListings({ source: "external", sort: "najnovsie", perPage });
}
