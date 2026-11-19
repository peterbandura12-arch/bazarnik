import type {
  AdapterSourceConfig,
  ExternalSourceAdapter,
  NormalizedListing,
} from "../types";
import type { ListingCondition } from "@/types/database";

/**
 * Adaptér pre Bazoš.sk – používa výhradne oficiálne verejné RSS kanály
 * (odkaz „RSS" v pätičke bazos.sk), nie scraping.
 *
 * Feed URL (external_sources.feed_url) môže byť ľubovoľný kanál Bazoša:
 * celý portál (https://www.bazos.sk/rss.php?skup=X) aj kanál konkrétnej
 * kategórie / filtrovanej stránky – odkazy na ne nájdete v pätičke príslušnej
 * stránky pod „RSS".
 */

const CONDITION_PATTERNS: Array<[RegExp, ListingCondition]> = [
  [/na\s*d(i|í)el(y|)/i, "na_diely"],
  [/ako\s*nov/i, "ako_nove"],
  [/^\s*nov/i, "nove"],
  [/pou\s*z/i, "pouzite"],
];

function mapCondition(raw: string | null): ListingCondition | null {
  if (!raw) return null;
  for (const [pattern, value] of CONDITION_PATTERNS) {
    if (pattern.test(raw)) return value;
  }
  return null;
}

function decodeEntities(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

function parsePriceText(raw: string): number | null {
  const cleaned = raw.replace(/\s|\u00a0/g, "");
  if (!/^[\d.,]+$/.test(cleaned)) return null;
  const normalized =
    cleaned.includes(",") && cleaned.includes(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

// Zoznam väčších miest SR/ČR – vyhľadáva sa koreň názvu (kryje tvary „Nitra/Nitre/nitriansky“ atď.).
const CITY_STEMS: Array<[string, string]> = [
  ["Bratislav", "Bratislava"],
  ["Košic", "Košice"],
  ["Preš(?:ov|ovsk|porsk)", "Prešov"],
  ["Žilin", "Žilina"],
  ["Nitr", "Nitra"],
  ["Bystric", "Banská Bystrica"],
  ["Trnav", "Trnava"],
  ["Trenč", "Trenčín"],
  ["Poprad", "Poprad"],
  ["Prievidz", "Prievidza"],
  ["Zvolen", "Zvolen"],
  ["Považsk", "Považská Bystrica"],
  ["Michalovc", "Michalovce"],
  ["Nov[éeý][ ]+Zámk", "Nové Zámky"],
  ["Spišsk", "Spišská Nová Ves"],
  ["Komárn", "Komárno"],
  ["Humenn", "Humenné"],
  ["Levic", "Levice"],
  ["Bardejov", "Bardejov"],
  ["Liptovsk", "Liptovský Mikuláš"],
  ["Ružomber", "Ružomberok"],
  ["Piešťan", "Piešťany"],
  ["Lučen", "Lučenec"],
  ["Topoľčan", "Topoľčany"],
  ["Pezin", "Pezinok"],
  ["Čadc", "Čadca"],
  ["Dunajsk", "Dunajská Streda"],
  ["Trebišov", "Trebišov"],
  ["Rimavsk", "Rimavská Sobota"],
  ["Šamorín", "Šamorín"],
  ["Senec", "Senec"],
  ["Malack", "Malacky"],
  ["Senic", "Senica"],
  ["Brezno", "Brezno"],
  ["Sabinov", "Sabinov"],
  ["Moravce", "Zlaté Moravce"],
  ["Rožňav", "Rožňava"],
  ["Štiavnic", "Banská Štiavnica"],
  ["Holíč", "Holíč"],
  ["Myjav", "Myjava"],
  ["Skalic", "Skalica"],
  ["Ľubovň", "Stará Ľubovňa"],
  ["Kežmar", "Kežmarok"],
  ["Svidník", "Svidník"],
  ["Vranov", "Vranov nad Topľou"],
  ["Kubín", "Dolný Kubín"],
  ["Krtíš", "Veľký Krtíš"],
  ["Detv", "Detva"],
  ["Revúc", "Revúca"],
  ["Kapušan", "Veľké Kapušany"],
  ["Krompach", "Krompachy"],
  ["Levoč", "Levoča"],
  ["Partizánsk", "Partizánske"],
  ["Stropkov", "Stropkov"],
  ["Nosovic", "Zlaté Moravce"],
  ["Sereď", "Sereď"],
  ["Hlohov", "Hlohovec"],
  ["Nové[ ]+Mesto[ ]+nad[ ]+V", "Nové Mesto nad Váhom"],
  ["Šaľ", "Šaľa"],
  ["Galant[ay]", "Galanta"],
  ["Púchov", "Púchov"],
  ["Ilav", "Ilava"],
  ["Kysuck", "Kysucké Nové Mesto"],
  ["Praha|Prae|Prahy|Prahu|Prahou|Pražsk|Pražan", "Praha"],
  ["Praž", "Praha"],
  ["Brn(?:o|a|e|u|ou|ensk|nensk)", "Brno"],
  ["Ostrav", "Ostrava"],
  ["Olomouc", "Olomouc"],
  ["Plzeň", "Plzeň"],
  ["Hradec", "Hradec Králové"],
];

function detectLocation(text: string | null): string | null {
  if (!text) return null;
  const explicit = text.match(/\b(?:mesto|lokalita|kraj|okres|miesto)\s*:\s*([^\n<,;.]{2,40})/i);
  if (explicit) {
    const value = explicit[1].trim().replace(/\s+/g, " ");
    if (value && !/^(neuveden|nie je|dohod)/i.test(value)) return value;
  }
  for (const [stem, city] of CITY_STEMS) {
    if (new RegExp(`\\b${stem}`, "i").test(text)) return city;
  }
  return null;
}

function mapBazosCategory(url: string, domain: string): string | null {
  const sub = url.match(new RegExp(`^https:\\/\\/([^.]+)\\.bazos\\.${domain}\\/`))?.[1] ?? null;
  return sub ? CATEGORY_MAP[sub] ?? null : null;
}

/** Názov inzerátu v RSS má formát „Názov: cena“ – cena môže byť aj textom. */
function splitTitle(rawTitle: string): { title: string; price: number | null } {
  const title = rawTitle.replace(/\s+/g, " ").trim();
  const separator = title.lastIndexOf(": ");
  if (separator === -1) return { title, price: null };
  const priceText = title.slice(separator + 2).trim();
  const name = title.slice(0, separator).trim();
  const price = parsePriceText(priceText);
  if (price === null && !/^(dohodou|v texte|zadarmo|pon\u00faknite|ponuknite)$/i.test(priceText)) {
    return { title, price: null };
  }
  return { title: name || title, price };
}

// Mapovanie oficiálnych Bazoš kategórií (subdomén) na kategórie Bazárnika.
const CATEGORY_MAP: Record<string, string> = {
  mobil: "mobilne-telefony",
  elektro: "elektronika",
  foto: "fotoaparaty",
  pc: "pocitace-a-gaming",
  auto: "osobne-automobily",
  motocykle: "motocykle",
  autodiel: "autodiely",
  stroje: "naradie",
  nabytok: "nabytok",
  dom: "dom-a-zahrada",
  deti: "deti-a-hracky",
  oblecenie: "oblecenie-a-moda",
  sport: "sport-a-outdoor",
  hudba: "hobby-a-volny-cas",
  knihy: "knihy",
  praca: "pracovne-ponuky",
  sluzby: "ostatne-sluzby",
  zvierata: "zvierata",
  reality: "reality",
  vstupenky: "vstupenky",
  ostatne: "ostatne-inzeraty",
  www: "ostatne-inzeraty",
};

// Oficiálne regionálne RSS kanály (hlokalita = PSČ centra, humkreis = okolie v km).
const SK_REGION_CENTERS: Array<{ psc: string; radius: string; label: string }> = [
  { psc: "81101", radius: "75", label: "Bratislava a okolie" },
  { psc: "91701", radius: "60", label: "Trnava a okolie" },
  { psc: "91101", radius: "50", label: "Trenčín a okolie" },
  { psc: "94901", radius: "60", label: "Nitra a okolie" },
  { psc: "01001", radius: "60", label: "Žilina a okolie" },
  { psc: "97401", radius: "60", label: "Banská Bystrica a okolie" },
  { psc: "96001", radius: "50", label: "Zvolen a okolie" },
  { psc: "97201", radius: "50", label: "Prievidza a okolie" },
  { psc: "05801", radius: "60", label: "Poprad a okolie" },
  { psc: "08001", radius: "60", label: "Prešov a okolie" },
  { psc: "04001", radius: "70", label: "Košice a okolie" },
  { psc: "07101", radius: "50", label: "Michalovce a okolie" },
];

const CZ_REGION_CENTERS: Array<{ psc: string; radius: string; label: string }> = [
  { psc: "11000", radius: "60", label: "Praha a okolie" },
  { psc: "60200", radius: "60", label: "Brno a okolie" },
  { psc: "70200", radius: "60", label: "Ostrava a okolie" },
  { psc: "30100", radius: "50", label: "Plzeň a okolie" },
  { psc: "77100", radius: "50", label: "Olomouc a okolie" },
  { psc: "50001", radius: "50", label: "Hradec Králové a okolie" },
  { psc: "46001", radius: "50", label: "Liberec a okolie" },
  { psc: "37001", radius: "50", label: "České Budějovice a okolie" },
  { psc: "40001", radius: "50", label: "Ústí nad Labem a okolie" },
  { psc: "76001", radius: "50", label: "Zlín a okolie" },
];

function createBazosAdapter(slug: string, domain: "sk" | "cz"): ExternalSourceAdapter {
  const regionCenters = domain === "sk" ? SK_REGION_CENTERS : CZ_REGION_CENTERS;

  return {
  slug,
  name: domain === "sk" ? "Bazoš.sk (oficiálny RSS)" : "Bazoš.cz (oficiálny RSS)",
  websiteUrl: `https://www.bazos.${domain}`,
  accessDescription: `Číta výhradne oficiálne verejné RSS kanály Bazoša (odkaz RSS v pätičke portálu), vrátane regionálnych kanálov. Bez scrapingu. Feed URL sa nastavuje v external_sources.feed_url.`,

  async fetchListings(config: AdapterSourceConfig): Promise<NormalizedListing[]> {
    const feedUrl = config.feedUrl;
    if (!feedUrl) {
      return [];
    }

    const domain = /bazos\.cz/.test(feedUrl) ? "cz" : "sk";
    const headers = { Accept: "application/rss+xml, application/xml, text/xml, */*" };
    const res = await fetch(feedUrl, { headers, cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Bazoš RSS vrátil stav ${res.status}`);
    }
    const baseXml = await res.text();

    const byId = new Map<string, NormalizedListing>();
    for (const listing of parseFeed(baseXml, null, domain)) {
      byId.set(listing.externalId, listing);
    }

    if (/rss\.php/.test(feedUrl) && /bazos\.(sk|cz)/.test(feedUrl)) {
      for (const center of regionCenters) {
        try {
          const url = new URL(feedUrl);
          url.searchParams.set("hlokalita", center.psc);
          url.searchParams.set("humkreis", center.radius);
          const regionRes = await fetch(url, { headers, cache: "no-store" });
          if (!regionRes.ok) continue;
          const regionXml = await regionRes.text();
          for (const listing of parseFeed(regionXml, center.label, domain)) {
            const current = byId.get(listing.externalId);
            if (!current) {
              byId.set(listing.externalId, listing);
            } else if (!current.location) {
              current.location = listing.location;
            }
          }
        } catch {
          continue;
        }
      }
    }

    return [...byId.values()];
  },

  getCategoryFromUrl(url: string): string | null {
    return mapBazosCategory(url, domain);
  },

  getLocationFromText(text: string): string | null {
    return detectLocation(text);
  },
  };
}

export const bazosAdapter = createBazosAdapter("bazos", "sk");
export const bazosCzAdapter = createBazosAdapter("bazos-cz", "cz");

function parseFeed(xml: string, fallbackLocation: string | null = null, domain: string = "sk"): NormalizedListing[] {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  const listings: NormalizedListing[] = [];

  for (const block of blocks) {
    const tag = (name: string): string | null => {
      const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
      return match ? match[1].trim() : null;
    };

    const rawLink = tag("link") ?? tag("guid");
    if (!rawLink || rawLink.startsWith("&lt;")) continue;
    const url = decodeEntities(rawLink);

    const rawTitle = tag("title");
    if (!rawTitle) continue;
    const { title, price } = splitTitle(decodeEntities(rawTitle));

    const externalIdMatch = url.match(/\/inzerat\/(\d+)\//);
    const externalId = externalIdMatch ? externalIdMatch[1] : url;

    const descriptionRaw = tag("description");
    let imageUrl: string | null = null;
    let description: string | null = null;
    if (descriptionRaw) {
      const cdata = descriptionRaw.replace(/^<!\[CDATA\[|\]\]>$/g, "");
      const imgMatch = cdata.match(/<img[^>]*src=["']([^"']+)["']/i);
      if (imgMatch) imageUrl = imgMatch[1];
      const text = stripHtml(cdata.replace(/<img[^>]*>/gi, " "));
      description = text || null;
    }

    const bodyText = description ?? "";
    let condition: ListingCondition | null = null;
    for (const [pattern, value] of CONDITION_PATTERNS) {
      if (pattern.test(bodyText)) {
        condition = value;
        break;
      }
    }
    listings.push({
      externalId,
      url,
      title,
      description,
      price,
      currency: "EUR",
      condition,
      brand: null,
      model: null,
      location: detectLocation(`${bodyText}\n${title}`) ?? fallbackLocation,
      categorySlug: mapBazosCategory(url, domain),
      imageUrl,
      publishedAt: tag("pubDate") ?? new Date().toISOString(),
    });
  }

  return listings;
}
