import type {
  AdapterSourceConfig,
  ExternalSourceAdapter,
  NormalizedListing,
} from "../types";
import { detectLocation } from "./bazos";

/**
 * Cítatel verejných inzerátov z Bazar.sk – číta IBA verejne štruktúrované
 * údaje (schema.org JSON-LD) a verejné karty inzerátov (lokalita,
 * podkategória), bez obchádzania ochrán a bez súkromného API, v skromnom
 * objeme s pauzami. Bazar.sk nemá RSS ani verejné API; inzeráty bez fotky sa
 * neprijímajú. Zdroj sa dá kedykoľvek vypnúť v external_sources.
 */

/** Mapovanie poddomén Bazar.sk na kategórie Bazárnika (základná úroveň). */
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

/**
 * Mapovanie konkrétnych podkategórií Bazar.sk (slug z URL karty) na presné
 * kategórie Bazárnika – inzerát tak ide priamo správne, AI to len doladí.
 * Nezmapované podkategórie padajú na mapu poddomén.
 */
const SUBCATEGORY_CATEGORY: Record<string, string> = {
  // foto / kamera
  "fotoaparaty": "fotoaparaty",
  "doplnky-foto-kamery": "fotograficke-vybavenie",
  // mobily / elektro
  "sim-karty": "prislusenstvo-elektronika",
  "tablety": "tablety",
  "wifi-sietove-prvky": "prislusenstvo-elektronika",
  "tlaciarne": "prislusenstvo-elektronika",
  "zdroje-zalozne-zdroje": "prislusenstvo-elektronika",
  // audio
  "dj-technika": "audio-technika",
  "reproduktory": "audio-technika",
  "reproduktory-repro-sustavy": "audio-technika",
  "zvukova-technika": "audio-technika",
  "radia-magnetofony-a-hifi": "audio-technika",
  "mp3-prehravace": "audio-technika",
  // hudobné nástroje
  "klavesy": "hobby-a-volny-cas",
  "gitary": "hobby-a-volny-cas",
  "slacikove-nastroje": "hobby-a-volny-cas",
  // káble / nabíjanie
  "kable-a-konektory": "nabijacky-a-kable",
  "kable-a-redukcie": "nabijacky-a-kable",
  // PC
  "notebooky": "notebooky",
  "herne-konzoly": "herne-konzoly",
  // spotrebiče
  "chladnicky": "domace-spotrebice",
  "digestory": "domace-spotrebice",
  "pracky": "domace-spotrebice",
  "umyvacky-riadu": "domace-spotrebice",
  "zehlicky": "domace-spotrebice",
  "ostatne-elektro-spotrebice": "domace-spotrebice",
  // šport
  "fitness-kulturistika": "fitness",
  "cyklistika": "cyklistika",
  "futbal": "loptove-sporty",
  "korcule": "sport-a-outdoor",
  "lyzovanie": "lyzovanie",
  "kemping": "kemping",
  "altanky-stany-domceky": "kemping",
  "turistika-a-horolezectvo": "turistika",
  "rybolov": "polovnictvo-a-rybarstvo",
  "polovnictvo": "polovnictvo-a-rybarstvo",
  "stvorkolky": "stvorkolky",
  // motocykle (typy motocyklov)
  "skutre": "motocykle",
  "enduro": "motocykle",
  "chopper": "motocykle",
  "supersport": "motocykle",
  "tourist": "motocykle",
  "naked": "motocykle",
  "motokary": "stvorkolky",
  "motory": "motodiely",
  // autá (značky)
  "bmw": "osobne-automobily",
  "fiat": "osobne-automobily",
  "ford": "osobne-automobily",
  "jeep": "osobne-automobily",
  "mercedes": "osobne-automobily",
  "mitsubishi": "osobne-automobily",
  "seat": "osobne-automobily",
  "skoda": "osobne-automobily",
  "subaru": "osobne-automobily",
  "volkswagen": "osobne-automobily",
  "volvo": "osobne-automobily",
  "historicke": "osobne-automobily",
  // stroje
  "traktory": "naradie",
  "polnohospodarske-stroje": "naradie",
  "stavebne-stroje": "naradie",
  "drevoobrabacie-stroje": "naradie",
  "sijacie-stroje": "naradie",
  "naradie": "naradie",
  "zahradne-naradie": "zahradna-technika",
  // zvieratá
  "psy-a-steniatka": "psy",
  "macky-a-maciatka": "macki",
  "rybicky": "akvaristika",
  "terarijne": "teraristika",
  "hydina": "zvierata",
  "zajace-a-kraliky": "zvierata",
  "vtaky": "vtaky",
  "krmivo": "chovatelske-potreby",
  "chovatelske-potreby": "chovatelske-potreby",
  // nábytok / dom
  "bytove-doplnky": "dekoracie",
  "police-kniznice": "nabytok",
  "komody": "nabytok",
  "stoly": "nabytok",
  "obyvacky": "nabytok",
  "sedacky-sedacie-supravy": "nabytok",
  "postele-matrace": "nabytok",
  "kancelarsky-nabytok": "nabytok",
  "ostatny-nabytok": "nabytok",
  "nabytok-na-mieru": "nabytok",
  "detsky-nabytok": "deti-a-hracky",
  // deti
  "hracky": "deti-a-hracky",
  "kociky": "deti-a-hracky",
  "kolisky-hojdacky": "deti-a-hracky",
  "trojkolky": "deti-a-hracky",
  "zavinovacky-a-fusaky": "deti-a-hracky",
  // oblečenie
  "bundy": "oblecenie-a-moda",
  "bundy-kabaty-a-kombinezy": "oblecenie-a-moda",
  "kabaty": "oblecenie-a-moda",
  "ciapky-saly-a-rukavice": "oblecenie-a-moda",
  "nohavice-a-kratasy": "oblecenie-a-moda",
  "saty": "oblecenie-a-moda",
  "sukne": "oblecenie-a-moda",
  "svetre-a-rolaky": "oblecenie-a-moda",
  "tricka": "oblecenie-a-moda",
  "damska-obuv": "oblecenie-a-moda",
  "panska-obuv": "oblecenie-a-moda",
  "detska-obuv": "oblecenie-a-moda",
  "kabelky": "oblecenie-a-moda",
  "ostatne-modne-doplnky": "oblecenie-a-moda",
  "ostatne-oblecenie": "oblecenie-a-moda",
  "ostatne-detske-oblecenie": "oblecenie-a-moda",
  "spolocenske-saty": "oblecenie-a-moda",
  "svadobne-saty": "oblecenie-a-moda",
  "teplakove-supravy": "oblecenie-a-moda",
  // knihy / média
  "romany": "knihy",
  "poezia": "knihy",
  "ucebnice-zs-a-ss": "knihy",
  "detske-knihy": "knihy",
  "odborna-literatura": "knihy",
  "cudzojazycna-literatura": "knihy",
  "cestopisy": "knihy",
  "encyklopedie": "knihy",
  "chovatelska-literatura": "knihy",
  "ostatne-knihy": "knihy",
  "skolske-potreby": "knihy",
  "cd-dvd-lp-mc-hudba": "filmy-a-hudba",
  // lístky
  "vstupenky-a-listky": "vstupenky",
  "vstupenky-na-koncerty": "vstupenky",
  // práca
  "zivotopisy": "pracovne-ponuky",
  // dom / stavba
  "ploty-brany": "stavebny-material",
  "obklady-a-dlazby": "stavebny-material",
  "stavebne-drevo-rezivo": "stavebny-material",
  "nadrze-sachty-zumpy": "stavebny-material",
  "voda-odpady": "stavebny-material",
  "solarne-systemy-fotovoltaika": "vykurovanie",
  "palivove-drevo-pelety-brikety": "dom-a-zahrada",
  "stiepacky-dreva": "dom-a-zahrada",
  "zahradne-grily-krby": "zahradny-nabytok",
  "zahradny-nabytok": "zahradny-nabytok",
  "bazeny-doplnky": "bazeny",
  // ostatné
  "zlavove-kupony": "ostatne-inzeraty",
  "potraviny": "ruzne-predmety",
  "ostatne-inzeraty": "ostatne-inzeraty",
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

interface CardInfo {
  location: string | null;
  subcategory: string | null;
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

/**
 * Z verejných kariet inzerátov (hmr-primary) vyzvedne lokalitu a podkategóriu.
 * Každá karta je vyznačená `data-id`, lokalita je v neviditeľnom riadku
 * (span.location) – číta sa len to, čo si obyčajný návštevník vidí.
 */
function extractCardInfo(html: string): Map<string, CardInfo> {
  const info = new Map<string, CardInfo>();
  const starts = [...html.matchAll(/<div class="hmr-primary" data-id="(\d+)">/gi)].map(
    (m) => ({ id: m[1], index: m.index ?? 0 })
  );
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i].index;
    const to = i + 1 < starts.length ? starts[i + 1].index : Math.min(html.length, from + 40_000);
    const chunk = html.slice(from, to);
    const location =
      chunk.match(/<span class="location"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i)?.[1]?.trim() ?? null;
    const subcategory =
      chunk.match(/<a class="category" href="[^"]*\/([a-z0-9-]+)\/"/i)?.[1] ?? null;
    info.set(starts[i].id, { location: location ? decodeEntities(location) : null, subcategory });
  }
  return info;
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
    "Číta výhradne verejné štruktúrované dáta (schema.org JSON-LD) a verejné karty inzerátov (lokalita, podkategória), ktoré Bazar.sk natívne vkladá do svojich stránok pre vyhľadávače. Bez súkromného API, bez obchádzania ochrán, v skromnom objeme s pauzami medzi dopytmi. Inzeráty bez fotky sa neprijímajú.",

  async fetchListings(config: AdapterSourceConfig): Promise<NormalizedListing[]> {
    // Bazar.sk odmieta pripojenia z Vercelových dátových IP (fetch failed).
    // Import preto beží výlučne cez GitHub Actions skript
    // scripts/bazarsk-export.mjs, ktorý posiela dáta do /api/external-import.
    if (process.env.VERCEL) return [];

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
  const cards = extractCardInfo(html);
  const listings: NormalizedListing[] = [];

  for (const product of products) {
    const url = typeof product.offers?.url === "string" ? product.offers.url : null;
    const externalIdRaw = product.offers?.serialNumber;
    const externalId = externalIdRaw != null ? String(externalIdRaw).trim() : null;
    if (!url || !externalId || !externalId.trim()) continue;

    const title = decodeEntities(String(product.name)).replace(/\s+/g, " ").trim();
    if (!title) continue;

    const description = product.description
      ? decodeEntities(String(product.description)).replace(/\s+/g, " ").trim() || null
      : null;

    // Inzeráty bez fotky sa nezobrazujú – preskočíme ich.
    const imageUrl = Array.isArray(product.image) ? (product.image[0] ?? null) : (product.image ?? null);
    if (typeof imageUrl !== "string" || !imageUrl.startsWith("http")) continue;

    const priceRaw = product.offers?.price;
    const numericPrice = typeof priceRaw !== "undefined" && priceRaw !== null ? Number(priceRaw) : null;
    const price = numericPrice !== null && Number.isFinite(numericPrice) ? numericPrice : null;

    const card = cards.get(externalId.trim());
    const subdomainSlug = subdomainOf(url);
    const subcategory = card?.subcategory ?? null;
    const categorySlug = subcategory
      ? SUBCATEGORY_CATEGORY[subcategory] ?? (subdomainSlug ? SUBDOMAIN_CATEGORY[subdomainSlug] ?? null : null)
      : subdomainSlug
        ? SUBDOMAIN_CATEGORY[subdomainSlug] ?? null
        : null;

    const location =
      (card?.location && decodeEntities(card.location)) ?? detectLocation(`${title} ${description ?? ""}`);
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
      location,
      categorySlug,
      imageUrl,
      publishedAt: null,
    });
  }

  return listings;
}
