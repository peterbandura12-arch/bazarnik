import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText, isAiEnabled } from "@/lib/ai";
import { searchListings } from "@/lib/listings";
import { CATEGORY_TREE } from "@/lib/categories";
import type { UnifiedListing } from "@/types/database";

export const maxDuration = 120;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(12),
});

const CATEGORY_SLUGS = CATEGORY_TREE.flatMap((p) => [
  p.slug,
  ...p.children.map((c) => c.slug),
]);

const SYSTEM_PROMPT = [
  "Si asistent Bazárnik, slovenského Bazára. Odpovedaj VÝHRADNE v slovenčine.",
  "Vždy vráť iba čistý JSON objekt bez ďalšieho textu v jednom z dvoch tvárov:",
  '1. Ak chceš vyhľadať inzeráty: {"type":"search","q":"vyhľadávací výraz","category":null,"minPrice":null,"maxPrice":null,"location":null,"text":"krátka slušná správa pre používateľa v slovenčine"}',
  '2. Ak pátranie nevyžaduje výsledky: {"type":"text","text":"odpoveď v slovenčine"}',
  "category musí byť jeden z týchto slugov: " + CATEGORY_SLUGS.join(", ") + " alebo null.",
  "minPrice/maxPrice sú čísla alebo null. location je mesto/kraj (napr. Bratislava, Žilina) alebo null.",
  "Ak používateľ hľadá tovar alebo popíše, čo chce kúpiť, predajcovač požaduje – použi type search.",
  "Ak sa pýta len na informácie, pomôž mu stručne a priateľsky a použi type text.",
].join("\n");

const aiDecisionSchema = z.object({
  type: z.enum(["search", "text"]),
  q: z.string().max(120).optional().nullable(),
  category: z.string().max(60).optional().nullable(),
  minPrice: z.number().min(0).max(1_000_000).optional().nullable(),
  maxPrice: z.number().min(0).max(1_000_000).optional().nullable(),
  location: z.string().max(60).optional().nullable(),
  text: z.string().max(1000).optional().nullable(),
});

export async function POST(request: Request) {
  if (!isAiEnabled()) {
    return NextResponse.json(
      { ok: false, error: "AI asistent nie je zapnutý. Doplňte GEMINI_API_KEY." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Nesprávna požiadavka." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Nesprávny formát správ." }, { status: 400 });
  }

  const history = parsed.data.messages
    .map((m) => `${m.role === "user" ? "Používateľ" : "Asistent"}: ${m.content}`)
    .join("\n");
  const prompt = `${history}\nAsistent (vráť iba JSON):`;

  const gen = await generateText({ system: SYSTEM_PROMPT, prompt, json: true, maxTokens: 512 });
  if (!gen.ok || !gen.text) {
    return NextResponse.json(
      { ok: false, error: `AI odpoveď sa nepodarilo získať (${gen.detail ?? "neznáma chyba"}).` },
      { status: 502 }
    );
  }
  const raw: string = gen.text;

  let decision: z.infer<typeof aiDecisionSchema>;
  try {
    let jsonText = raw.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
    }
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) jsonText = match[0];
    decision = aiDecisionSchema.parse(JSON.parse(jsonText));
  } catch {
    return NextResponse.json({
      ok: true,
      reply: { type: "text", text: raw.slice(0, 500) },
      items: [],
    });
  }

  if (decision.type !== "search" || !decision.q) {
    return NextResponse.json({
      ok: true,
      reply: { type: "text", text: decision.text?.trim() || "Ako vám môžem pomôcť?" },
      items: [] as UnifiedListing[],
    });
  }

  try {
    let result = await searchListings({
      q: decision.q,
      category: decision.category ?? undefined,
      minPrice: decision.minPrice != null ? String(decision.minPrice) : undefined,
      maxPrice: decision.maxPrice != null ? String(decision.maxPrice) : undefined,
      location: decision.location ?? undefined,
      sort: "relevantne",
      perPage: 6,
    });

    if (result.items.length === 0 && decision.category) {
      result = await searchListings({ q: decision.q, sort: "relevantne", perPage: 6 });
    }

    const fallbackText =
      decision.text?.trim() ||
      (result.items.length > 0
        ? "Tu sú relevantné ponuky:"
        : "Nič som nenašiel, skúste hľadať inak alebo v inej kategórií.");

    return NextResponse.json({
      ok: true,
      reply: {
        type: "search",
        text:
          result.items.length > 0
            ? fallbackText
            : "Nič som nenašiel – skúste zadávať širšiu alebo jednoduchšiu formuláciu.",
        q: decision.q,
      },
      items: result.items,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      reply: { type: "text", text: "Vyhľadávanie teraz nedostupné, skúste to o chvíľu." },
      items: [] as UnifiedListing[],
    });
  }
}
