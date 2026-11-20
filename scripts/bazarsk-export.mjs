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

/**
 * Mapovanie konkretnych podkategori Bazar.sk (slug z URL karty) na presne
 * kategorie Bazarnika – inzerat ide priamo spravne, AI to len doladi.
 */
const SUBCATEGORY_CATEGORY = {
  "fotoaparaty": "fotoaparaty",
  "doplnky-foto-kamery": "fotograficke-vybavenie",
  "sim-karty": "prislusenstvo-elektronika",
  "tablety": "tablety",
  "wifi-sietove-prvky": "prislusenstvo-elektronika",
  "tlaciarne": "prislusenstvo-elektronika",
  "zdroje-zalozne-zdroje": "prislusenstvo-elektronika",
  "dj-technika": "audio-technika",
  "reproduktory": "audio-technika",
  "reproduktory-repro-sustavy": "audio-technika",
  "zvukova-technika": "audio-technika",
  "radia-magnetofony-a-hifi": "audio-technika",
  "mp3-prehravace": "audio-technika",
  "klavesy": "hobby-a-volny-cas",
  "gitary": "hobby-a-volny-cas",
  "slacikove-nastroje": "hobby-a-volny-cas",
  "kable-a-konektory": "nabijacky-a-kable",
  "kable-a-redukcie": "nabijacky-a-kable",
  "notebooky": "notebooky",
  "herne-konzoly": "herne-konzoly",
  "hry": "videohry",
  "videohry": "videohry",
  "chladnicky": "domace-spotrebice",
  "digestory": "domace-spotrebice",
  "pracky": "domace-spotrebice",
  "umyvacky-riadu": "domace-spotrebice",
  "zehlicky": "domace-spotrebice",
  "ostatne-elektro-spotrebice": "domace-spotrebice",
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
  "skutre": "motocykle",
  "enduro": "motocykle",
  "chopper": "motocykle",
  "supersport": "motocykle",
  "tourist": "motocykle",
  "naked": "motocykle",
  "motokary": "stvorkolky",
  "motory": "motodiely",
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
  "traktory": "naradie",
  "polnohospodarske-stroje": "naradie",
  "stavebne-stroje": "naradie",
  "drevoobrabacie-stroje": "naradie",
  "sijacie-stroje": "naradie",
  "naradie": "naradie",
  "zahradne-naradie": "zahradna-technika",
  "psy-a-steniatka": "psy",
  "macky-a-maciatka": "macki",
  "rybicky": "akvaristika",
  "terarijne": "teraristika",
  "hydina": "zvierata",
  "zajace-a-kraliky": "zvierata",
  "vtaky": "vtaky",
  "krmivo": "chovatelske-potreby",
  "chovatelske-potreby": "chovatelske-potreby",
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
  "hracky": "deti-a-hracky",
  "kociky": "deti-a-hracky",
  "kolisky-hojdacky": "deti-a-hracky",
  "trojkolky": "deti-a-hracky",
  "zavinovacky-a-fusaky": "deti-a-hracky",
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
  "vstupenky-a-listky": "vstupenky",
  "vstupenky-na-koncerty": "vstupenky",
  "zivotopisy": "pracovne-ponuky",
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
  "zlavove-kupony": "ostatne-inzeraty",
  "potraviny": "ruzne-predmety",
  "ostatne-inzeraty": "ostatne-inzeraty",
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

/**
 * Tolerantne JSON.parse - Bazar.sk vklada do JSON-LD surove riadiace znaky
 * a obcas aj neescapovane uvodzovky v popise (napr. 19"/20"), ktore zamietne
 * klasicky JSON.parse. Riadiace znaky nahradime medzerou a chýbajúce spätne
 * lomky dodame iterativne podla poziici chyb parsera.
 */
function tolerantJsonParse(input) {
  let s = input;
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      return JSON.parse(s);
    } catch (err) {
      const pos = /position (\d+)/.exec(String(err && err.message ? err.message : ""));
      if (!pos) return null;
      const p = Number(pos[1]);
      let q = -1;
      for (let i = p; i >= Math.max(0, p - 60); i--) {
        if (s[i] === '"') {
          q = i;
          break;
        }
      }
      if (q < 0) return null;
      s = `${s.slice(0, q)}\\"${s.slice(q + 1)}`;
    }
  }
  return null;
}

function parseJsonLdProducts(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    const sanitized = block[1].replace(/[\u0000-\u001f]/g, " ");
    const parsed = tolerantJsonParse(sanitized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
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

/**
 * Z verejnych kariet inzeratov vyzvedne lokalitu a podkategoriu.
 * Kazda karta (aj nepromo) obsahuje oblubene tlacidlo
 * `<span class="badge-heart..." data-id="ID">` - to je spolahliva kotva.
 * Promo karty navyse maju hmr-primary, tych je len niekolko.
 */
function extractCardInfo(html) {
  const info = new Map();
  let starts = [...html.matchAll(/<span class="badge-heart[^"]*" data-id="(\d+)"/gi)].map(
    (m) => ({ id: m[1], index: m.index ?? 0 })
  );
  if (starts.length === 0) {
    // Rezervny variant, keby Bazar.sk zmenil markup oblubenych tlacidiel.
    starts = [...html.matchAll(/<div class="hmr-primary" data-id="(\d+)">/gi)].map(
      (m) => ({ id: m[1], index: m.index ?? 0 })
    );
  }
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i].index;
    const to = i + 1 < starts.length ? starts[i + 1].index : Math.min(html.length, from + 40000);
    const chunk = html.slice(from, to);
    const location = chunk.match(/<span class="location"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i)?.[1]?.trim() ?? null;
    const subcategory = chunk.match(/<a class="category" href="[^"]*\/([a-z0-9-]+)\/"/i)?.[1] ?? null;
    info.set(starts[i].id, { location: location ? decodeEntities(location) : null, subcategory });
  }
  return info;
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
  const cards = extractCardInfo(html);
  const listings = [];
  for (const p of products) {
    const url = typeof p.offers?.url === "string" ? p.offers.url : null;
    const externalId = p.offers?.serialNumber != null ? String(p.offers.serialNumber).trim() : null;
    if (!url || !externalId) continue;

    const title = decodeEntities(String(p.name)).replace(/\s+/g, " ").trim();
    if (!title) continue;

    const description = p.description
      ? decodeEntities(String(p.description)).replace(/\s+/g, " ").trim().slice(0, 8000) || null
      : null;

    // Inzeraty bez fotky sa nezobrazuju - preskocime ich.
    const img = Array.isArray(p.image) ? p.image[0] ?? null : p.image ?? null;
    if (typeof img !== "string" || !img.startsWith("http")) continue;

    const numeric = p.offers?.price != null ? Number(p.offers.price) : null;
    const price = numeric !== null && Number.isFinite(numeric) ? numeric : null;

    const card = cards.get(externalId);
    const sub = subdomainOf(url);
    const subcategory = card?.subcategory ?? null;
    const categorySlug = subcategory
      ? SUBCATEGORY_CATEGORY[subcategory] ?? (sub ? SUBDOMAIN_CATEGORY[sub] ?? null : null)
      : sub
        ? SUBDOMAIN_CATEGORY[sub] ?? null
        : null;

    listings.push({
      externalId,
      url,
      title,
      description,
      price,
      currency: "EUR",
      location: (card?.location && decodeEntities(card.location)) ?? null,
      categorySlug,
      imageUrl: img,
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
