import type { UnifiedListing } from "@/types/database";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";

const UUID_REGEXP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

/** Rozlíši slug kategórie na zoznam ID (rodič zahrnie aj deti). Neznámy slug vráti prázdny zoznam. */
async function resolveCategoryIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string
): Promise<string[]> {
  const { data } = await supabase.from("categories").select("id, slug, parent_id");
  const rows = data ?? [];
  const root = rows.find((c) => c.slug === slug);
  if (!root) return [EMPTY_UUID];
  return [root.id, ...rows.filter((c) => c.parent_id === root.id).map((c) => c.id)];
}
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

/**
 * Politie hladania: znaky, ktore by rozbili syntax PostgREST `or(...)` filtra,
 * sa z hladaneho vyrazu odstrania.
 */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[(),*%"'\\]/g, " ").trim();
}

/**
 * Fulltext filter cez vsetky relevantne polia (nazov, popis, znacka, model)
 * pre jeden hladany vyraz.
 */
function anyFieldFilter(term: string): string {
  const t = sanitizeSearchTerm(term);
  if (!t) return "";
  return [
    `title.ilike.*${t}*`,
    `description.ilike.*${t}*`,
    `brand.ilike.*${t}*`,
    `model.ilike.*${t}*`,
  ].join(",");
}

/**
 * Rozdeli hladany vyraz na slova. Pri viacerych slovach sa hlada tak,
 * ze kazde slovo musi najst aspon v jednom poli (AND napriec poliami).
 */
function splitSearchWords(q: string): string[] {
  return sanitizeSearchTerm(q)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
}

/** Normalizuje text: mala pismena, bez diakritiky. */
function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Tokenizuje text na slova (pismena+cisla) bez diakritiky. */
function tokenize(s: string): string[] {
  return normalizeText(s).match(/[a-z0-9]+/g) ?? [];
}

/**
 * Presna zhoda slova v inzerate. Slovo sa musi najst ako CELÉ slovo
 * (token) v nazve/popise/znacke/modeli – preto "13" nesedi na "128 GB"
 * a "iphone 13" nesedi na "iphone 14". Tokien dlhsi ako 3 znaky
 * sa zapocita aj pri zlepsenom spellingu (napr. "iphone13" spolu).
 */
function rowMatchesWord(
  row: { title: string; description: string | null; brand: string | null; model: string | null },
  word: string,
  includeDescription: boolean
): boolean {
  const wordTokens = tokenize(word);
  if (wordTokens.length === 0) return false;
  const haystack = [row.title, row.brand, row.model, ...(includeDescription ? [row.description] : [])]
    .filter((v): v is string => Boolean(v))
    .join(" ");
  if (!haystack.trim()) return false;
  const rowTokens = new Set(tokenize(haystack));
  const compact = normalizeText(haystack).replace(/[^a-z0-9]/g, "");
  return wordTokens.every(
    (t) => rowTokens.has(t) || (t.length >= 4 && compact.includes(t))
  );
}

/**
 * Precizne vyhladavanie: kazde slovo musi byt najdene ako celé slovo.
 * PostgREST ilike vrati kandidatov (podretazec), precision robi filtr nad tokenmi.
 */
async function intersectWordIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  words: string[],
  cap: number,
  includeDescription = true,
  skipAccessoryTitles = false
): Promise<string[] | null> {
  let shared: string[] | null = null;
  for (const word of words) {
    const filter = anyFieldFilter(word);
    if (!filter) continue;
    const { data } = await supabase
      .from("v_listings_search")
      .select("id, title, description, brand, model")
      .or(filter)
      .limit(cap);
    const rows = (data ?? []) as {
      id: string;
      title: string;
      description: string | null;
      brand: string | null;
      model: string | null;
    }[];
    const matched = rows
      .filter(
        (row) =>
          !(skipAccessoryTitles && isAccessoryOnlyTitle(row.title)) &&
          rowMatchesWord(row, word, includeDescription)
      )
      .map((row) => row.id);
    if (matched.length === 0) return [];
    shared = shared === null ? matched : shared.filter((id) => matched.includes(id));
    if (shared.length === 0) return [];
  }
  return shared ? shared.slice(0, cap) : null;
}


const ACCESSORY_TOKEN = /^(kryt|krytty|krytk|obaly?|puzdro|puzdr|fond|folia|fólička?f?|foli|sklo|drziak|stojan|nabijacka?|nabij|kabel|adapter|bateria|baterka|naramok|remienok|diely|diel)/i;

/** Zhodnotí, či je väčá vyhľadávanie začína príslušenstvo (kryt, obal, batéria…). */
function isAccessoryQueryWord(word: string): boolean {
  return tokenize(word).some((t) => ACCESSORY_TOKEN.test(t));
}

/**
 * Vyfarbourje názvy, ktoré sú príslušenstvo a nie samotný produkt
 * (napr. „kryt na iPhone 13“ pri hľadaní „iphone 13“). Inzerát s produktom,
 * ku ktorému je príslušenstvo bonusom (napr. „iPhone 13 + kryt“), zostáva.
 */
function isAccessoryOnlyTitle(title: string): boolean {
  const tokens = tokenize(title);
  if (tokens.slice(0, 3).some((t) => ACCESSORY_TOKEN.test(t))) return true;
  const norm = normalizeText(title);
  return /vhodn[ye] na/.test(norm) || /\bdiely\b/.test(norm);
}

/**
 * Dvojúrovňová presnosť: najskôr hľadá len v názve, značke a modeli (model musí
 * sedieť presne, príslušenstvo je vylúčené). Ak nič nenájde, rozšíri hľadanie
 * aj na popis inzerátu.
 */
async function preciseSearchIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  words: string[]
): Promise<string[]> {
  const accessoryQuery = words.some(isAccessoryQueryWord);
  const strict = await intersectWordIds(supabase, words, 1000, false, !accessoryQuery);
  if (strict && strict.length > 0) return strict;
  const extended = await intersectWordIds(supabase, words, 1000, true, false);
  return extended ?? [];
}

/** Doplnenie slugu kategórie k inszeratom (karta potrebuje nazov podla slugu, DB vracia len id). */
async function attachCategorySlugs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: UnifiedListing[]
): Promise<UnifiedListing[]> {
  const ids = Array.from(
    new Set(items.map((i) => i.category_id).filter((v): v is string => Boolean(v)))
  );
  if (ids.length === 0) return items;
  try {
    const { data: cats } = await supabase.from("categories").select("id, slug").in("id", ids);
    const slugById = new Map((cats ?? []).map((c) => [c.id, c.slug] as const));
    return items.map((item) =>
      item.category_id
        ? { ...item, category_slug: slugById.get(item.category_id) ?? null }
        : item
    );
  } catch {
    return items;
  }
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

  if (f.q) {
    const words = splitSearchWords(f.q);
    if (words.length > 0) {
      const ids = await preciseSearchIds(supabase, words);
      query = query.in("id", ids.length > 0 ? ids : [EMPTY_UUID]);
    }
  }
  if (f.category) {
    if (UUID_REGEXP.test(f.category)) {
      query = query.eq("category_id", f.category);
    } else {
      const ids = await resolveCategoryIds(supabase, f.category);
      query = query.in("category_id", ids);
    }
  }
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

  const items = await attachCategorySlugs(supabase, (data ?? []) as UnifiedListing[]);

  return {
    items,
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

const POPULAR_KEYWORDS = [
  "iphone",
  "playstation",
  "ps5",
  "xbox",
  "nintendo",
  "macbook",
  "notebook",
  "samsung",
  "xiaomi",
  "airpods",
  "apple watch",
  "bicykel",
  "e-bike",
  "lego",
  "nike",
  "adidas",
  "televizor",
  "brusle",
  "ligle",
  "stihac",
];

/** Inzeraty, ktore v nazve obsahuju casto hladane vyrazy (popularne produkty). */
export async function getPopularListings(perPage = 8): Promise<SearchResult> {
  const pool = await searchListings({ sort: "najnovsie", perPage: 400 });
  const popular = pool.items.filter((l) => {
    const t = l.title.toLowerCase();
    return POPULAR_KEYWORDS.some((k) => t.includes(k));
  });
  if (popular.length >= 4) {
    return { ...pool, items: popular.slice(0, perPage), total: popular.length };
  }
  return pool;
}


/** Počet aktívnych inzerátov (vlastné aj externé) na rodičovskú kategóriu. */
export async function getCategoryCounts(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured()) return {};
  try {
    const supabase = await createClient();
    const { data: categories } = await supabase.from("categories").select("id, slug, parent_id");
    const rows = categories ?? [];
    const roots = rows.filter((c) => !c.parent_id);
    const entries = await Promise.all(
      roots.map(async (root) => {
        const ids = [root.id, ...rows.filter((c) => c.parent_id === root.id).map((c) => c.id)];
        const { count } = await supabase
          .from("v_listings_search")
          .select("id", { count: "exact", head: true })
          .in("category_id", ids);
        return [root.slug, count ?? 0] as const;
      }),
    );
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export interface PricedSample {
  id: string;
  title: string;
  price: number;
}

/** Zber vzorky cien pre analýzu (rovnaké filtre ako searchListings, len položky s cenou). */
export async function collectPricedSample(
  f: ListingFilters,
  cap = 400
): Promise<PricedSample[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_LISTINGS.slice(0, cap)
      .map((l) => ({ id: l.id, title: l.title, price: Number(l.price ?? 0) }))
      .filter((r) => r.price > 0);
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .from("v_listings_search")
      .select("id, title, price")
      .not("price", "is", null)
      .gt("price", 0);

    if (f.q) {
      const words = splitSearchWords(f.q);
      if (words.length > 0) {
        const ids = await preciseSearchIds(supabase, words);
        query = query.in("id", ids.length > 0 ? ids : [EMPTY_UUID]);
      }
    }
    if (f.category) {
      if (UUID_REGEXP.test(f.category)) {
        query = query.eq("category_id", f.category);
      } else {
        const ids = await resolveCategoryIds(supabase, f.category);
        query = query.in("category_id", ids);
      }
    }
    if (f.minPrice) query = query.gte("price", Number(f.minPrice));
    if (f.maxPrice) query = query.lte("price", Number(f.maxPrice));
    if (f.location) query = query.ilike("location", `%${f.location}%`);
    if (f.condition) query = query.eq("condition", f.condition);
    if (f.source) query = query.eq("source_type", f.source);

    const { data, error } = await query.limit(cap);
    if (error) return [];
    const rows = (data ?? []) as { id: string; title: string; price: number | null }[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      price: Number(r.price ?? 0),
    })).filter((r) => r.price > 0);
  } catch {
    return [];
  }
}
