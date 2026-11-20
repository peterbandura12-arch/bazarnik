import type {
  AdapterSourceConfig,
  ExternalSourceAdapter,
  NormalizedListing,
} from "../types";
import { detectLocation } from "./bazos";

/**
 * Cítatel verejných inzerátov z Bazar.sk – číta IBA verejne štruktúrované
 * údaje (schema.org JSON-LD), ktoré sú natively do stránky vložené pre
 * vyhladávače a indexery. Neobchádza žiadne ochrany, nepoužíva súkromné API,
 * nevyžaduje prihlásenie a beží v skromnom objeme (pár dopytov za
 * synchronizáciu s pauzami). Bazar.sk nemá RSS ani verejné API, takže toto je
 * najmenší možný spôsob, ako agregovať len verejne dostupné inzeráty.
 * Zdroj sa dá kedykoľvek vypnúť v external_sources.
 */

/** Mapovanie poddomén Bazar.sk na kategórie Bazárnika. */
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

/** Prednastavené poddomény, ktoré sa čítajú pri synchronizácii (strana 1). */
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

/** Strana 2 len pre najväčšie kategórie (dost objemu, ešte vždy skromné). */
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
function parseJsonLdProducts(html: string): SchemaProduct[] {
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

type PageResult = { html: string; status: number } | { html: null; status: number | null; reason?: string };

async function fetchPage(url: string): Promise<PageResult> {
  try {
    const res = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return { html: null, status: res.status };
    return { html: await res.text(), status: 200 };
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 80) : "chyba dopytu";
    return { html: null, status: null, reason: msg };
  }
}

function statusLabel(result: PageResult): string {
  if (result.html !== null) return "OK";
  if (result.status !== null) return `HTTP ${result.status}`;
  return `chyba: ${result.reason ?? "neznáma"}`;
}

export const bazarskAdapter: ExternalSourceAdapter = {
  slug: "bazarsk",
  name: "Bazar.sk (verejné štruktúrované dáta)",
  websiteUrl: "https://www.bazar.sk",
  accessDescription:
    "Číta výhradne verejné štruktúrované dáta (schema.org JSON-LD), ktoré Bazar.sk natívne vkladá do svojich stránok pre vyhľadávače. Bez súkromného API, bez obchádzania ochrán, v skromnom objeme s pauzami medzi dopytmi. Ideálne by bol oficiálny dátový feed ako má Bazoš – po dorozumení s prevádzkovateľom sa adaptér jednoducho prepne na neho.",

  async fetchListings(config: AdapterSourceConfig): Promise<NormalizedListing[]> {
    if (config.feedUrl) {
      // Keď je feedUrl nastavená, čítajú sa konkrétne stránky zoznamov (možné aj podľa filtra).
      const pages = config.feedUrl
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter((u) => /^https?:\/\/[a-z0-9.-]*bazar\.sk/.test(u));
      const seen = new Map<string, NormalizedListing>();
      const failures: string[] = [];
      for (const page of pages) {
        const result = await fetchPage(page);
        if (result.html === null) {
          failures.push(`${page} → ${statusLabel(result)}`);
          continue;
        }
        for (const item of parseAndNormalize(result.html)) {
          if (!seen.has(item.externalId)) seen.set(item.externalId, item);
        }
        await sleep(PAUSE_MS);
      }
      if (seen.size === 0 && failures.length > 0) {
        throw new Error(`Bazar.sk nevrátil dáta: ${failures.slice(0, 3).join("; ")}`);
      }
      return [...seen.values()];
    }

    const byId = new Map<string, NormalizedListing>();
    const failures: string[] = [];
    for (const sub of DEFAULT_SUBDOMAINS) {
      for (const page of [1, ...(SECOND_PAGE_SUBDOMAINS.has(sub) ? [2] : [])]) {
        const url = page > 1 ? `https://${sub}.bazar.sk/?p[page]=${page}` : `https://${sub}.bazar.sk/`;
        const result = await fetchPage(url);
        if (result.html === null) {
          failures.push(`${sub} s${page} → ${statusLabel(result)}`);
          continue;
        }
        for (const item of parseAndNormalize(result.html)) {
          if (!byId.has(item.externalId)) byId.set(item.externalId, item);
        }
        await sleep(PAUSE_MS);
      }
    }
    if (byId.size === 0 && failures.length > 0) {
      throw new Error(`Bazar.sk nevrátil dáta: ${failures.slice(0, 3).join("; ")}`);
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
  const products = parseJsonLdProducts(html);
  const listings: NormalizedListing[] = [];

  for (const product of products) {
    const url = typeof product.offers?.url === "string" ? product.offers.url : null;
    const externalIdRaw = product.offers?.serialNumber;
    const externalId = externalIdRaw != null ? String(externalIdRaw) : null;
    if (!url || !externalId || !externalId.trim()) continue;

    const title = decodeEntities(String(product.name)).replace(/\s+/g, " ").trim();
    if (!title) continue;

    const description = product.description
      ? decodeEntities(String(product.description)).replace(/\s+/g, " ").trim() || null
      : null;

    const priceRaw = product.offers?.price;
    const numericPrice = typeof priceRaw !== "undefined" && priceRaw !== null ? Number(priceRaw) : null;
    const price = numericPrice !== null && Number.isFinite(numericPrice) ? numericPrice : null;

    const imageUrl = Array.isArray(product.image) ? (product.image[0] ?? null) : (product.image ?? null);
    const currencyOffered = product.offers?.priceCurrency;

    listings.push({
      externalId: externalId.trim(),
      url,
      title,
      description,
      price,
      currency: currencyOffered && currencyOffered !== "EUR" ? currencyOffered : "EUR",
      condition: null,
      brand: null,
      model: null,
      location: detectLocation(`${title} ${description ?? ""}`),
      categorySlug: subdomainOf(url) ? SUBDOMAIN_CATEGORY[subdomainOf(url) as string] ?? null : null,
      imageUrl: typeof imageUrl === "string" && imageUrl.startsWith("http") ? imageUrl : null,
      publishedAt: null,
    });
  }

  return listings;
}
