import type {
  AdapterSourceConfig,
  ExternalSourceAdapter,
  NormalizedListing,
} from "../types";
import type { ListingCondition } from "@/types/database";

/**
 * UNIVERZÁLNY ADAPTÉR pre partnerské feedy (JSON aj XML/RSS/Atom).
 *
 * Umožňuje pripojiť ľubovoľný zdroj, ktorý poskytuje verejný partnerský feed,
 * bez písania kódu: v admin sekcii (Externé zdroje) vložte záznam s
 * adapter = "universal-feed", feed_url = URL feedu a is_active = true.
 *
 * Nepoužíva scraping – vyžaduje oficiálne poskytnutý feed.
 */

const CONDITION_MAP: Array<[RegExp, ListingCondition]> = [
  [/na\s*d(i|í)el(y|y)/i, "na_diely"],
  [/ako\s*nov/i, "ako_nove"],
  [/^\s*nov/i, "nove"],
  [/pou\s*z/i, "pouzite"],
];

function mapCondition(raw: string | null): ListingCondition | null {
  if (!raw) return null;
  for (const [pattern, value] of CONDITION_MAP) {
    if (pattern.test(raw)) return value;
  }
  return null;
}

function parsePrice(raw: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/\s/g, "");
  if (!cleaned) return null;
  const normalized =
    cleaned.includes(",") && cleaned.includes(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function decodeEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeEntities(match[1]).replace(/<[^>]+>/g, "").trim() : null;
}

function extractAttr(block: string, tag: string, attr: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["']`, "i"));
  return match ? decodeEntities(match[1]) : null;
}

function firstString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

type UniversalItem = Record<string, unknown>;

function mapItem(raw: UniversalItem): NormalizedListing | null {
  const externalId = firstString(raw, ["id", "guid", "external_id", "externalId"]);
  const url = firstString(raw, ["url", "link", "href"]);
  const title = firstString(raw, ["title", "name", "heading"]);
  if (!externalId || !url || !title) return null;

  return {
    externalId,
    url,
    title,
    description: firstString(raw, ["description", "text", "summary", "content", "detail"]),
    price: parsePrice(firstString(raw, ["price", "amount", "cost"])),
    currency: firstString(raw, ["currency", "currency_code"]) ?? "EUR",
    condition: mapCondition(firstString(raw, ["condition", "state", "stav"])),
    brand: firstString(raw, ["brand", "manufacturer", "znacka"]),
    model: firstString(raw, ["model", "typ"]),
    location: firstString(raw, ["location", "city", "address", "mesto", "lokalita"]),
    categorySlug: firstString(raw, ["category", "category_slug", "kategoria"]),
    imageUrl: firstString(raw, ["image", "image_url", "imageUrl", "photo", "thumbnail", "img"]),
    publishedAt: firstString(raw, ["published_at", "publishedAt", "published", "pubDate", "date", "created_at"]) ?? new Date().toISOString(),
  };
}

function itemsFromJson(payload: unknown): UniversalItem[] {
  if (Array.isArray(payload)) return payload as UniversalItem[];
  if (payload && typeof payload === "object") {
    for (const key of ["items", "listings", "ads", "results", "data", "entries", "offers"]) {
      const value = (payload as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as UniversalItem[];
    }
  }
  return [];
}

function itemBlocksFromXml(xml: string): string[] {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/gi) ?? [];
  return blocks;
}

function mapXmlBlock(block: string): NormalizedListing | null {
  const externalId =
    extractTag(block, "guid") ??
    extractTag(block, "item_id") ??
    extractTag(block, "id") ??
    extractTag(block, "code") ??
    extractAttr(block, "item", "id") ??
    extractAttr(block, "entry", "id") ??
    extractAttr(block, "shopitem", "id");
  const url =
    extractAttr(block, "link", "href") ??
    extractTag(block, "link") ??
    extractTag(block, "url") ??
    extractTag(block, "product_url");
  const title =
    extractTag(block, "title") ??
    extractTag(block, "productname") ??
    extractTag(block, "product") ??
    extractTag(block, "name");
  if (!externalId || !url || !title) return null;

  const imageUrl =
    extractTag(block, "imgurl") ??
    extractTag(block, "imgurl_alternative") ??
    extractAttr(block, "enclosure", "url") ??
    extractTag(block, "image") ??
    extractTag(block, "image_url") ??
    extractTag(block, "img") ??
    extractAttr(block, "media:content", "url") ??
    extractAttr(block, "media:thumbnail", "url");

  return {
    externalId,
    url,
    title,
    description:
      extractTag(block, "description") ??
      extractTag(block, "short_description") ??
      extractTag(block, "summary") ??
      extractTag(block, "content") ??
      extractTag(block, "text"),
    price: parsePrice(
      extractTag(block, "price") ??
        extractTag(block, "price_vat") ??
        extractTag(block, "price_amount") ??
        extractAttr(block, "price", "value")
    ),
    currency: extractTag(block, "currency") ?? extractTag(block, "currencyid") ?? "EUR",
    condition: mapCondition(extractTag(block, "condition") ?? extractTag(block, "stav")),
    brand:
      extractTag(block, "brand") ??
      extractTag(block, "manufacturer") ??
      extractTag(block, "vyrobca"),
    model: extractTag(block, "model") ?? extractTag(block, "typ"),
    location: extractTag(block, "location") ?? extractTag(block, "city"),
    categorySlug: extractTag(block, "category") ?? extractTag(block, "categorytext"),
    imageUrl,
    publishedAt:
      extractTag(block, "pubDate") ??
      extractTag(block, "published") ??
      extractTag(block, "updated") ??
      new Date().toISOString(),
  };
}

export const universalFeedAdapter: ExternalSourceAdapter = {
  slug: "universal-feed",
  name: "Univerzálny partnerský feed (JSON/XML/RSS)",
  websiteUrl: "https://bazarnik.vercel.app",
  accessDescription:
    "Číta partnerský feed nastavený v stĺpci feed_url daného zdroja. Podporuje JSON, XML, RSS aj Atom. Bez feedu od partnera sa zdroj nesynchronizuje.",

  async fetchListings(config: AdapterSourceConfig): Promise<NormalizedListing[]> {
    const feedUrl = config.feedUrl;
    if (!feedUrl) {
      return [];
    }

    const res = await fetch(feedUrl, {
      headers: { Accept: "application/json, application/xml, text/xml, */*" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Feed vrátil stav ${res.status}`);
    }

    const body = await res.text();
    const trimmed = body.trim();

    if (trimmed.startsWith("<")) {
      return itemBlocksFromXml(trimmed)
        .map(mapXmlBlock)
        .filter((item): item is NormalizedListing => item !== null);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(trimmed);
    } catch {
      throw new Error("Feed nie je platný JSON ani XML.");
    }

    return itemsFromJson(payload)
      .map(mapItem)
      .filter((item): item is NormalizedListing => item !== null);
  },
};
