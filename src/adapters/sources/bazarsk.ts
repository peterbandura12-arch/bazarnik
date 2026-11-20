import type {
  AdapterSourceConfig,
  ExternalSourceAdapter,
  NormalizedListing,
} from "../types";
import { detectLocation } from "./bazos";

/**
 * Zhliadac verejnych inzeratov z Bazar.sk – cita IBA verejne strikturovane
 * udaje (schema.org JSON-LD), ktore su nativne do strancy vlozene pre
 * vyhladavace a indexery. Neobchadza ziadne ochrany, nepouziva privatne API,
 * nevyzaduje prihlasenie a bezi v skromnom objeme (niekolko dopytov za
 * synchronizaciu s pauzami). Kedze Bazar.sk nema RSS ani verejne API, citanie
 * ich vlastnych strukturovanych dat je najmenej narocny sposob, akym
 * agregujeme len verejne dostupne inzeraty – najlepsi legalny kompromis.
 * Zdroj sa da kedykolvek vypnut v external_sources.
 */

/** Mapovanie poddomen Bazar.sk na kategorie Bazarnika. */
const SUBDOMAIN_CATEGORY: Record<string, string> = {
  auto: "osobne-automobily",
  motorky: "motorky",
  elektro: "elektronika",
  mobily: "mobilne-telefony",
  pocitace: "pocitace-a-gaming",
  dom: "dom-a-zahrada",
  nabytok: "nabytok",
  deti: "deti-a-hracky",
  oblecenie: "oblecenie-a-moda",
  sport: "sport-a-outdoor",
  hudba: "hobby-a-volny-cas",
  knihy: "knihy",
  praca: "pracovne-ponuky",
  sluzby: "ostatne-sluzby",
  zvierata: "zvierata",
  reality: "reality",
  stroje: "naradie",
  starozitnosti: "zberatelstvo",
  ostatne: "ostatne-inzeraty",
};

/** Prednastavene poddomeny, ktore sa citaju pri synchronizacii (strana 1). */
const DEFAULT_SUBDOMAINS = [
  "mobily",
  "elektro",
  "pocitace",
  "auto",
  "dom",
  "nabytok",
  "deti",
  "oblecenie",
  "sport",
  "hudba",
  "knihy",
  "zvierata",
  "stroje",
  "ostatne",
];

/** Strana 2 len pre najvacsie kategorie (dost objemu na fair stranke). */
const SECOND_PAGE_SUBDOMAINS = new Set(["mobily", "elektro", "pocitace", "auto", "dom"]);

const PAUSE_MS = 700;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "sk-SK,sk;q=0.9",
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

interface SchemaOffer {
  "@type"?: string;
  serialNumber?: string;
  url?: string;
  price?: string | number;
  priceCurrency?: string;
}

interface SchemaProduct {
  "@type"?: string;
  name?: string;
  description?: string;
  image?: string | string[];
  url?: string;
  brand?: string | { name?: string };
  offers?: SchemaOffer;
}

/**
 * JSON-LD bloky majú v popisoch surové riadiace znaky (odradkovania),
 * ktoré zamietne klasické JSON.parse. Nahradíme ich medzerou – štruktúra
 * JSON zostane zachovaná a parsovanie prejde.
 */
function parseJsonLdBlocks(html: string): SchemaProduct[] {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    const sanitized = block[1].replace(/[\u0000-\u001f]/g, " ");
    let parsed: unknown;
    try {
      parsed = JSON.parse(sanitized);
    } catch {
      continue;
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as { "@type"?: unknown; itemListElement?: unknown };
      if (obj["@type"] === "ItemList" && Array.isArray(obj.itemListElement)) {
        return (obj.itemListElement as Array<{ item?: SchemaProduct }>)
          .map((entry) => entry.item)
          .filter((item): item is SchemaProduct => Boolean(item?.name && item?.offers));
      }
    }
  }
  return [];
}

function subdomainOf(url: string): string | null {
  return url.match(/^https?:\/\/([a-z0-9-]+)\.bazar\.sk\//i)?.[1]?.toLowerCase() ?? null;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export const bazarskAdapter: ExternalSourceAdapter = {
  slug: "bazarsk",
  name: "Bazar.sk (verejn\u00e9 \u0161trukt\u00farovan\u00e9 d\u00e1ta)",
  websiteUrl: "https://www.bazar.sk",
  accessDescription:
    "Cita výhradne verejné štruktúrované dáta (schema.org JSON-LD), ktoré Bazar.sk natívne vkladá do svojich stránok pre vyľadávače. Bez súrekého API, bez obchádzania ochrán, v skromnom objeme s pauzami medzi dopytmi. Ideálne by bol oficiálny dátový feed ako má Bazoš – po dorozumení s prevádzkovateľom sa adaptér jednoducho prepne na neho.",

  async fetchListings(config: AdapterSourceConfig): Promise<NormalizedListing[]> {
    if (config.feedUrl) {
      // Kedze feedUrl nastavena, citaju sa konkretne stranky zoznamu (niekedy podla filtra).
      const pages = config.feedUrl
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter((u) => /^https?:\/\/[a-z0-9.-]*bazar\.sk/.test(u));
      const seen = new Map<string, NormalizedListing>();
      for (const page of pages) {
        const html = await fetchPage(page);
        if (!html) continue;
        for (const item of parseAndNormalize(html)) {
          if (!seen.has(item.externalId)) seen.set(item.externalId, item);
        }
        await sleep(PAUSE_MS);
      }
      return [...seen.values()];
    }

    const byId = new Map<string, NormalizedListing>();
    for (const sub of DEFAULT_SUBDOMAINS) {
      for (const page of [1, ...(SECOND_PAGE_SUBDOMAINS.has(sub) ? [2] : [])]) {
        const url = `https://${sub}.bazar.sk/${page > 1 ? `?p[page]=${page}` : ""}`;
        const html = await fetchPage(url);
        if (!html) continue;
        for (const item of parseAndNormalize(html)) {
          if (!byId.has(item.externalId)) byId.set(item.externalId, item);
        }
        await sleep(PAUSE_MS);
      }
    }
    return [...byId.values()];
  },

  getCategoryFromUrl(url: string): string | null {
    const sub = subdomainOf(url);
    return sub ? SUBDOMAIN_CATEGORY[sub] ?? null : null;
  },

  getLocationFromText(text: string): string | null {
    return detectLocation(text);
  },
};

function parseAndNormalize(html: string): NormalizedListing[] {
  const products = parseJsonLdBlocks(html);
  const listings: NormalizedListing[] = [];

  for (const product of products) {
    const url = typeof product.offers?.url === "string" ? product.offers.url : null;
    const externalId = product.offers?.serialNumber != null ? String(product.offers.serialNumber) : null;
    if (!url || !externalId) continue;

    const title = decodeEntities(String(product.name)).replace(/\s+/g, " ").trim();
    if (!title) continue;

    const description = product.description
      ? decodeEntities(String(product.description)).replace(/\s+/g, " ").trim() || null
      : null;

    const priceRaw = product.offers?.price;
    const price = typeof priceRaw !== "undefined" && priceRaw !== null ? Number(priceRaw) : null;
    const imageUrl = Array.isArray(product.image) ? (product.image[0] ?? null) : (product.image ?? null);

    const sub = subdomainOf(url);
    listings.push({
      externalId,
      url,
      title,
      description,
      price: price != null && Number.isFinite(price) ? price : null,
      currency:
        product.offers?.priceCurrency && product.offers.priceCurrency !== "EUR"
          ? product.offers.priceCurrency
          : "EUR",
      condition: null,
      brand: null,
      model: null,
      location: detectLocation(`${title ?? ""} ${description ?? ""}`) ?? null,
      categorySlug: sub ? SUBDOMAIN_CATEGORY[sub] ?? null : null,
      imageUrl: typeof imageUrl === "string" && imageUrl.startsWith("http") ? imageUrl : null,
      publishedAt: null,
    });
  }

  return listings;
}
