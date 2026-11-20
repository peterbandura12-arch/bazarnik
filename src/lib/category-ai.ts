import { generateFastJson, generateFastJsonVision, isAiEnabled } from "@/lib/ai";
import { CATEGORY_TREE } from "@/lib/categories";
import sharp from "sharp";

/**
 * AI klasifikator kategorii – Gemini analyzuje nazov (a cast opisu) inzeratu
 * a rozhodne, do ktorej kategorie patri. Pouziva sa pri synchronizacii ako
 * inteligentne "druhe oko" nad pravidlovym refine – postupne presunie aj
 * inzeraty, ktore pravidla nechytia (prekleby predavcov, netypicke nazvy…).
 *
 * Vystup je vzdy len slug z nasho kategoria stromu (validovany), inak sa
 * vysledok ignoruje – AI nikdy nesmie vymysliet vlastnu kategoriu.
 */

export interface AIClassifyInput {
  id: string;
  title: string;
  description?: string | null;
  currentSlug?: string | null;
}

const ROOT_SLUGS = CATEGORY_TREE.map((p) => p.slug);
const CHILD_SLUGS = CATEGORY_TREE.flatMap((p) => (p.children ?? []).map((c) => c.slug));
const VALID_SLUGS = new Set<string>([...ROOT_SLUGS, ...CHILD_SLUGS]);

const BATCH_SIZE = 20;
const MAX_BATCHES_PER_CALL = 5; // max ~100 inzeratov na jedno prebehnutie (r\u00fdchly model)
const MAX_TOKENS = 3000;

const SYSTEM_PROMPT =
  "Si expert na triedenie inzer\u00e1tov zo slovensk\u00fdch a \u010desk\u00fdch b\u00e1zarov do kateg\u00f3ri\u00ed. " +
  "Pre ka\u017ed\u00fd inzer\u00e1t ur\u010d\u00ed\u0161 JEDNU najvhodnej\u0161iu kateg\u00f3riu z danej ponuky slugov. " +
  "V\u017edy preferuj konkr\u00e9tnu podkateg\u00f3riu (napr. smart-hodinky namiesto mobilne-telefony, ke\u010f sa jedn\u00e1 o hodinky, videogry namiesto herne-konzoly, ke\u010f sa jedn\u00e1 o hru). " +
  "Pr\u00edslu\u0161enstvo zara\u010f do \u0161pecializovanej kateg\u00f3rie pod\u013ea typu produktu (kryt/obal/nab\u00edja\u010dka na telef\u00f3n \u2192 prislusenstvo-elektronika, disky/pneumatiky \u2192 pneumatiky-a-disky, diely auta \u2192 autodiely). " +
  "Do osobne-automobily patria LEN cel\u00e9 osobn\u00e9 aut\u00e1, ni\u010d in\u00e9. " +
  "Odpovedaj V\u00ddHRADNE validn\u00fdm JSON v uvedenom tvare, bez \u010fal\u0161ieho textu.";

function normalizeSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  return VALID_SLUGS.has(slug) ? slug : null;
}

/** Parnutie cisla inzeratu zo zoznamu (1-based) na povodne id. */
function parseIndex(value: unknown, batch: AIClassifyInput[]): string | null {
  let n: number | null = null;
  if (typeof value === "number" && Number.isFinite(value)) n = value;
  else if (typeof value === "string") {
    const m = value.trim().match(/\d+/);
    if (m) n = Number(m[0]);
  }
  if (n === null || n < 1 || n > batch.length) return null;
  return batch[n - 1]?.id ?? null;
}

interface RawEntry {
  i?: unknown;
  id?: unknown;
  k?: unknown;
  kategoria?: unknown;
}

/** Tolerantny parser – zvladne aj useknuty JSON (MAX_TOKENS) cez regex fallback. */
function extractEntries(text: string): RawEntry[] | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as
        | RawEntry[]
        | { klasifikacie?: RawEntry[] }
        | { results?: RawEntry[] }
        | null;
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") {
        const list = (parsed as { klasifikacie?: unknown }).klasifikacie ??
          (parsed as { results?: unknown }).results;
        if (Array.isArray(list)) return list as RawEntry[];
      }
    } catch {
      /* padne do regex fallbacku */
    }
  }

  // Regex fallback: najde vsetky {"i":3,"k":"mobilne-telefony"} fragmenty aj v porusenom JSON.
  const matches = [...cleaned.matchAll(/\{[^{}]*?"(?:i|id)"\s*:\s*(?:"([^"]*)"|(\d+))[^{}]*?"(?:k|kategoria)"\s*:\s*"([a-z0-9\-]+)"[^{}]*?\}/gi)];
  if (matches.length > 0) {
    return matches.map((m) => ({ i: m[2] ? Number(m[2]) : m[1], k: m[3] }));
  }
  // Obrateny poriadok klucov: {"k":"slug","i":3}
  const reversed = [...cleaned.matchAll(/\{[^{}]*?"(?:k|kategoria)"\s*:\s*"([a-z0-9\-]+)"[^{}]*?"(?:i|id)"\s*:\s*(?:"([^"]*)"|(\d+))[^{}]*?\}/gi)];
  if (reversed.length > 0) {
    return reversed.map((m) => ({ i: m[3] ? Number(m[3]) : m[2], k: m[1] }));
  }
  return null;
}

export interface AIClassifyOutput {
  map: Map<string, string>;
  sample: string | null;
}

export async function aiClassifyCategories(items: AIClassifyInput[]): Promise<AIClassifyOutput> {
  const result = new Map<string, string>();
  const fail = (sample: string | null): AIClassifyOutput => ({ map: result, sample });
  if (!isAiEnabled() || items.length === 0) return fail(null);

  const batchCount = Math.ceil(
    Math.min(items.length, BATCH_SIZE * MAX_BATCHES_PER_CALL) / BATCH_SIZE
  );

  for (let b = 0; b < batchCount; b++) {
    const batch = items.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const lines = batch
      .map((it, idx) => {
        const desc = it.description ? ` | ${it.description.slice(0, 140).replace(/\s+/g, " ")}` : "";
        const cur = it.currentSlug ? ` (súčasná: ${it.currentSlug})` : "";
        return `${idx + 1}. ${it.title.slice(0, 140)}${desc}${cur}`;
      })
      .join("\n");

    const slugList = [...VALID_SLUGS].join(", ");
    const prompt =
      `Kategórie (používaj IBA tieto slugy, presne takto): ${slugList}\n\n` +
      `Inzeráty (číslo na začiatku riadku je index inzerátu):\n${lines}\n\n` +
      `Pre KAŽDÝ inzerát zo zoznamu vráť jednu položku. ` +
      `Odpovedz VÝHRADNE JSON v tvare: {"klasifikacie":[{"i":1,"k":"slug"}]} ` +
      `kde "i" je index inzerátu (číslo) a "k" je slug kategórie.`;

    const gen = await generateFastJson({ system: SYSTEM_PROMPT, prompt, maxTokens: MAX_TOKENS });
    if (!gen.ok || !gen.text) return fail(gen.detail ?? null);

    const list = extractEntries(gen.text);
    if (!list) return fail(gen.text.slice(0, 400));

    let accepted = 0;
    for (const entry of list) {
      const id = parseIndex(entry.i ?? entry.id, batch);
      const slug = normalizeSlug(entry.k ?? entry.kategoria);
      if (!id || !slug) continue;
      result.set(id, slug);
      accepted++;
    }
    if (accepted === 0) return fail(gen.text.slice(0, 400));
  }

  return { map: result, sample: null };
}

// ---------------------------------------------------------------------------
// VIZUÁLNA klasifikácia – AI dostane NÁZOV aj FOTKU inzerátu a rozhodne podľa
// oboch. Fotka sa stiahne, zmenší na miniatúru (sharp) a pošle modelu ako
// inline obrázok. Inzeráty, ktorých fotka sa nepodarilo stiahnuť, sa klasifikujú
// len podľa textu – vizuálny režim nikdy nesmie spomaliť ani zastaviť sync.

type InlineImage = { mime_type: string; data: string };

const VISION_BATCH = 10;
const MAX_VISION_BATCHES = 5; // max ~50 inzerátov s fotkou na jedno prebehnutie
const IMAGE_TIMEOUT_MS = 6_000;
const IMAGE_MAX_BYTES = 4_000_000;

const VISION_SYSTEM_PROMPT =
  SYSTEM_PROMPT +
  " Dostaneš k dispozícii aj FOTKU každého inzeráta – rozhoduj podľa toho, čo je " +
  "NA FOTKE v popredí (ak je na fotke celé auto, je to osobné auto; ak sú na fotke " +
  "len disky alebo diel, nie je to auto; ak je na fotke hra pre konzolu, je to videogry). " +
  "Fotka má väčšiu váhu ako text, ak si odporujú.";

async function fetchImageAsJpeg(url: string): Promise<InlineImage | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BazarnikBot/1.0)" },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100 || buf.length > IMAGE_MAX_BYTES) return null;
    const jpeg = await sharp(buf)
      .resize({ width: 224, height: 224, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 60 })
      .toBuffer();
    return { mime_type: "image/jpeg", data: jpeg.toString("base64") };
  } catch {
    return null;
  }
}

async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

export interface AIClassifyVisionInput extends AIClassifyInput {
  imageUrl?: string | null;
}

export async function aiClassifyCategoriesVision(
  items: AIClassifyVisionInput[]
): Promise<AIClassifyOutput> {
  const result = new Map<string, string>();
  if (!isAiEnabled() || items.length === 0) return { map: result, sample: null };

  // Stiahni fotky paralelne (max 8 naraz, každá max 10 s).
  const images = await mapLimited(items, 12, (it) =>
    it.imageUrl ? fetchImageAsJpeg(it.imageUrl) : Promise.resolve<InlineImage | null>(null)
  );

  const maxBatches = Math.min(Math.ceil(items.length / VISION_BATCH), MAX_VISION_BATCHES);
  let lastSample: string | null = null;

  for (let b = 0; b < maxBatches; b++) {
    const batch = items.slice(b * VISION_BATCH, (b + 1) * VISION_BATCH);
    const batchImages = images.slice(b * VISION_BATCH, (b + 1) * VISION_BATCH);
    if (batch.length === 0) break;

    const lines: string[] = [];
    const inlineImages: InlineImage[] = [];
    batch.forEach((it, idx) => {
      const desc = it.description ? ` | ${it.description.slice(0, 120).replace(/\s+/g, " ")}` : "";
      const cur = it.currentSlug ? ` (súčasná: ${it.currentSlug})` : "";
      const hasImg = Boolean(batchImages[idx]);
      lines.push(`${idx + 1}. ${it.title.slice(0, 140)}${desc}${cur}${hasImg ? "" : " (fotka nie je dostupná)"}`);
      if (batchImages[idx]) {
        inlineImages.push(batchImages[idx]!);
      }
    });

    // Po textovom zozname pošleme fotky s číslami v poradí – 1 fotka = 1 inzerát.
    const prompt =
      `Kategórie (používaj IBA tieto slugy, presne takto): ${[...VALID_SLUGS].join(", ")}\n\n` +
      `Inzeráty (číslo na začiatku riadku je index inzerátu; fotky nasledujú V ROVNAKOM PORADÍ ako čísla):\n${lines.join("\n")}\n\n` +
      `Pre KAŽDÝ inzerát zo zoznamu vráť jednu položku. ` +
      `Odpovedz VÝHRADNE JSON v tvare: {"klasifikacie":[{"i":1,"k":"slug"}]} ` +
      `kde "i" je index inzerátu (číslo) a "k" je slug kategórie.`;

    const gen = await generateFastJsonVision({
      system: VISION_SYSTEM_PROMPT,
      prompt,
      images: inlineImages,
      maxTokens: MAX_TOKENS,
    });
    if (!gen.ok || !gen.text) {
      lastSample = gen.detail ?? null;
      continue; // vision dávka nebola – skúsime ďalšiu, nespadne celý beh
    }

    const list = extractEntries(gen.text);
    if (!list) {
      lastSample = gen.text.slice(0, 400);
      continue;
    }

    for (const entry of list) {
      const id = parseIndex(entry.i ?? entry.id, batch);
      const slug = normalizeSlug(entry.k ?? entry.kategoria);
      if (!id || !slug) continue;
      result.set(id, slug);
    }
  }

  return { map: result, sample: lastSample };
}
