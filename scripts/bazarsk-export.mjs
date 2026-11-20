/**
 * Zber verejných štruktúrovaných dát (JSON-LD) z Bazar.sk a import do
 * Bazárnika cez /api/external-import. Beží v GitHub Actions, lebo Bazar.sk
 * odmieta pripojenia z Vercelových dátových IP.
 *
 * Použitie: node scripts/bazarsk-export.mjs
 * Env: CRON_SECRET (tajný kľúč), BAZARNIK_URL (default https://bazarnik.vercel.app)
 */

const BASE = process.env.BAZARNIK_URL ?? "https://bazarnik.vercel.app";
const SECRET = process.env.CRON_SECRET;
if (!SECRET) {
  console.error("Chýba CRON_SECRET.");
  process.exit(1);
}

const SUBDOMAIN_CATEGORY = {
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

const DEFAULT_SUBDOMAINS = [
  "mobily", "elektro", "pocitace", "auto", "dom", "nabytok", "deti",
  "oblecenie", "sport", "hudba", "knihy", "zvierata", "stroje", "ostatne",
];
const SECOND_PAGE_SUBDOMAINS = new Set(["mobily", "elektro", "pocitace", "auto", "dom"]);

const PAUSE_MS = 700;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "sk-SK,sk;q=0.9",
};

function decodeEntities(input) {
  return input
    .replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(Number(c)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, c) => String.fromCodePoint(parseInt(c, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function parseJsonLdProducts(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    const sanitized = block[1].replace(/[\u0000-\u001f]/g, " ");
    let parsed;
    try {
      parsed = JSON.parse(sanitized);
    } catch {
      continue;
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed["@type"] === "ItemList") {
      if (Array.isArray(parsed.itemListElement)) {
        return parsed.itemListElement
          .map((e) => e.item)
          .filter((it) => it && it.name && it.offers);
      }
    }
  }
  return [];
}

function subdomainOf(url) {
  const m = url.match(/^https?:\/\/([a-z0-9-]+)\.bazar\.sk\//i);
  return m ? m[1].toLowerCase() : null;
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      console.warn(`  ${url} -> HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`  ${url} -> chyba: ${String(err && err.message ? err.message : err).slice(0, 80)}`);
    return null;
  }
}

function parseAndNormalize(html) {
  const products = parseJsonLdProducts(html);
  const listings = [];
  for (const p of products) {
    const url = typeof p.offers?.url === "string" ? p.offers.url : null;
    const externalId = p.offers?.serialNumber != null ? String(p.offers.serialNumber).trim() : null;
    if (!url || !externalId) continue;

    const title = decodeEntities(String(p.name)).replace(/\s+/g, " ").trim();
    if (!title) continue;

    const description = p.description
      ? decodeEntities(String(p.description)).replace(/\s+/g, " ").trim() || null
      : null;

    const numeric = p.offers?.price != null ? Number(p.offers.price) : null;
    const price = numeric !== null && Number.isFinite(numeric) ? numeric : null;
    const img = Array.isArray(p.image) ? p.image[0] ?? null : p.image ?? null;
    const sub = subdomainOf(url);

    listings.push({
      externalId,
      url,
      title,
      description,
      price,
      currency: "EUR",
      location: null,
      categorySlug: sub ? SUBDOMAIN_CATEGORY[sub] ?? null : null,
      imageUrl: typeof img === "string" && img.startsWith("http") ? img : null,
    });
  }
  return listings;
}

async function main() {
  const byId = new Map();
  let pagesOk = 0;
  let pagesFail = 0;

  for (const sub of DEFAULT_SUBDOMAINS) {
    const pageNumbers = [1, ...(SECOND_PAGE_SUBDOMAINS.has(sub) ? [2] : [])];
    for (const page of pageNumbers) {
      const url = page > 1 ? `https://${sub}.bazar.sk/?p[page]=${page}` : `https://${sub}.bazar.sk/`;
      const html = await fetchPage(url);
      if (html === null) {
        pagesFail++;
        continue;
      }
      pagesOk++;
      for (const item of parseAndNormalize(html)) {
        if (!byId.has(item.externalId)) byId.set(item.externalId, item);
      }
      await sleep(PAUSE_MS);
    }
  }

  console.log(`Bazar.sk: stránok OK=${pagesOk}, failed=${pagesFail}, inzerátov=${byId.size}`);
  if (byId.size === 0) {
    console.warn("Žiadne dáta – pravdepodobne blokované na úrovni siete. Koniec bez importu.");
    process.exit(2);
  }

  const items = [...byId.values()];
  const res = await fetch(`${BASE}/api/external-import`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ source: "bazarsk", items }),
    signal: AbortSignal.timeout(120000),
  });
  const text = await res.text();
  console.log(`Import: HTTP ${res.status} ${text.slice(0, 500)}`);
  if (res.status !== 200) process.exit(3);
}

main().catch((err) => {
  console.error("Spracovanie zlyhalo:", err);
  process.exit(1);
});
