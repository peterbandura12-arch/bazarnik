import { generateText, isAiEnabled } from "@/lib/ai";
import { CATEGORY_TREE } from "@/lib/categories";

/**
 * AI klasifikator kategorii – Gemini analyzuje nazov (a cast opisu) inzeratu
 * a rozhodne, do ktorej kategorie patri. Pouziva sa pri synchronizacii ako
 * inteligentne "druhe oko" nad pravidlovym refine – postupne presunie aj
 * inzeraty, ktore pravidla nechytia (prekleby predavcov, netypicke nazvy…).
 *
 * Vystup je vzdy len slug z nasho kategoria stromu (validovany), inak sa
 * vysledok ignoruje – AI nikdy nesmie zvit ziadat ekvivalent.
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

const BATCH_SIZE = 25;
const MAX_BATCHES_PER_CALL = 2; // max ~50 inzeratov na jedno prebehnutie (casovy rozpocet)

const SYSTEM_PROMPT =
  "Si expert na triedenie inzerátov zo slovenských a českých bázarov do kategórií. " +
  "Pre každý inzerát určíš JEDNU najvhodnejšiu kategóriu z danej ponuky. " +
  "Vždy preferuj konkrétnu podkategóriu (napr. smart-hodinky pred mobilne-telefony, ak sa jedná o hodinky). " +
  "Príslušenstvo patrií k produktu, ktorého sa týka (kryt na iPhone → mobilne-telefony). " +
  "Odpovedaj VÝHRADNE validným JSON v uvedenom formáte, bez ďalšieho textu.";

function extractJson(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function aiClassifyCategories(items: AIClassifyInput[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!isAiEnabled() || items.length === 0) return result;

  const batchCount = Math.ceil(
    Math.min(items.length, BATCH_SIZE * MAX_BATCHES_PER_CALL) / BATCH_SIZE
  );

  for (let b = 0; b < batchCount; b++) {
    const batch = items.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const lines = batch
      .map((it, i) => {
        const desc = it.description ? ` | ${it.description.slice(0, 160).replace(/\s+/g, " ")}` : "";
        const cur = it.currentSlug ? ` (súčasná: ${it.currentSlug})` : "";
        return `${i + 1}. [${it.id}] ${it.title.slice(0, 140)}${desc}${cur}`;
      })
      .join("\n");

    const slugList = [...VALID_SLUGS].join(", ");
    const prompt =
      `Kategórie (používaj IBA tieto slugy): ${slugList}\n\n` +
      `Inzeráty:\n${lines}\n\n` +
      `Odpovedz JSON: {"klasifikacie":[{"id":"povodne id","kategoria":"slug"}]}`;

    const gen = await generateText({ system: SYSTEM_PROMPT, prompt, json: true, maxTokens: 1400 });
    if (!gen.ok || !gen.text) break;

    const parsed = extractJson(gen.text) as
      | { klasifikacie?: Array<{ id?: unknown; kategoria?: unknown }> }
      | null;
    if (!parsed || !Array.isArray(parsed.klasifikacie)) break;

    for (const entry of parsed.klasifikacie) {
      const id = typeof entry.id === "string" ? entry.id : null;
      const slug = typeof entry.kategoria === "string" ? entry.kategoria.trim() : null;
      if (!id || !slug || !VALID_SLUGS.has(slug)) continue;
      result.set(id, slug);
    }
  }

  return result;
}
