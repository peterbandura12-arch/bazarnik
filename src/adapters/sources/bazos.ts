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

export const bazosAdapter: ExternalSourceAdapter = {
  slug: "bazos",
  name: "Bazoš.sk (oficiálny RSS)",
  websiteUrl: "https://www.bazos.sk",
  accessDescription:
    "Číta výhradne oficiálne verejné RSS kanály Bazoša (odkaz RSS v pätičke portálu). Bez scrapingu. Feed URL sa nastavuje v external_sources.feed_url.",

  async fetchListings(config: AdapterSourceConfig): Promise<NormalizedListing[]> {
    const feedUrl = config.feedUrl;
    if (!feedUrl) {
      return [];
    }

    const res = await fetch(feedUrl, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Bazoš RSS vrátil stav ${res.status}`);
    }

    const xml = await res.text();
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
        location: null,
        categorySlug: url.match(/^https:\/\/([^.]+)\.bazos\.sk\//)?.[1] ?? null,
        imageUrl,
        publishedAt: tag("pubDate") ?? new Date().toISOString(),
      });
    }

    return listings;
  },
};
