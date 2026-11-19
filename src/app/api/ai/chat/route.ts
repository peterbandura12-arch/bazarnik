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

const EXTRACT_SYSTEM_PROMPT = [
  "Si modul rozhodovania asistenta slovenského bazára Bazárnik.",
  "Vždy vráť IBA čistý JSON objekt v jednom z dvoch tvarov:",
  '1. Ak používateľ hľadá konkrétny tovar alebo opisuje, čo chce kúpiť/predať: {"type":"search","q":"...","category":null,"minPrice":null,"maxPrice":null,"location":null,"condition":null,"text":"krátka správa pre používateľa v slovenčine"}',
  '2. Pri všetkom ostatnom (otázky o Bazárniku, rady pri kúpe alebo predaji, orientačné ceny, všeobecné znalosti, bežná konverzácia): {"type":"text","text":"odpoveď prostredníctvom skrátenej formulácie, používateľovi odporúčame, že zodpovieme hneď"}',
  "Pravidlá pre q: prelož všetky dôležité kľúčové slová (značka, model, typ, veľkosť, variant) do podoby, akou by predajca napísal názov inzerátu. Nepis cenu ani mesto do q – ceny do minPrice/maxPrice, mesto do location.",
  "category musí byť jeden z týchto slugov: " + CATEGORY_SLUGS.join(", ") + " alebo null.",
  "condition môže byť len jedno z: nove, ako_nove, pouzite, na_diely, alebo null.",
  "minPrice/maxPrice sú čísla v EUR alebo null. location je mesto alebo kraj v Slovensku alebo null.",
].join("\n");

const CHAT_SYSTEM_PROMPT = [
  "Si priateľský AI asistent webu Bazárnik, slovenskej inzertnej platformy, ktorá zhromažďuje ponuky z Bazoša, Bazar.sk a Vintedu na jednom mieste.",
  "Odpovedaj VÝHRADNE v slovenčine, prirodzene a ľudsky.",
  "Odpovedaj na akúkoľvek otázku – rady pri nákupe a predaji, orientačné ceny použitých vecí, bezpečné obchodovanie, technické otázky, všeobecné znalosti aj bežný rozhovor.",
  "Keď sa hodí, navrhni, že ti v Bazárniku vieš nájsť aj konkrétne ponuky – nech používateľ napíše, čo hľadá (napr. „hľadám horský bicykel do 200 € v Žiline”).",
  "Buď konkrétny a vecný, odpovedaj v primeranej dĺžke.",
].join("\n");

const aiDecisionSchema = z.object({
  type: z.enum(["search", "text"]),
  q: z.string().max(200).optional().nullable(),
  category: z.string().max(60).optional().nullable(),
  minPrice: z.number().min(0).max(1_000_000).optional().nullable(),
  maxPrice: z.number().min(0).max(1_000_000).optional().nullable(),
  location: z.string().max(60).optional().nullable(),
  condition: z.enum(["nove", "ako_nove", "pouzite", "na_diely"]).optional().nullable(),
  text: z.string().max(1000).optional().nullable(),
});

function parseDecision(raw: string): z.infer<typeof aiDecisionSchema> | null {
  try {
    let jsonText = raw.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
    }
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) jsonText = match[0];
    return aiDecisionSchema.parse(JSON.parse(jsonText));
  } catch {
    return null;
  }
}

async function runSearch(params: {
  q: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  location?: string;
  condition?: string;
}) {
  return searchListings({
    q: params.q,
    category: params.category,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    location: params.location,
    condition: params.condition,
    sort: "relevantne",
    perPage: 6,
  });
}

async function conversationalReply(history: string, fallback: string) {
  const conv = await generateText({
    system: CHAT_SYSTEM_PROMPT,
    prompt: history,
    maxTokens: 1024,
  });
  return conv.ok && conv.text ? conv.text : fallback;
}

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

  const { messages } = parsed.data;
  const history = messages
    .map((m) => `${m.role === "user" ? "Používateľ" : "Asistent"}: ${m.content}`)
    .join("\n");

  const gen = await generateText({
    system: EXTRACT_SYSTEM_PROMPT,
    prompt: `${history}\nAsistent (vráť iba JSON):`,
    json: true,
    maxTokens: 700,
  });
  if (!gen.ok || !gen.text) {
    return NextResponse.json(
      { ok: false, error: `AI odpoveď sa nepodarilo získať (${gen.detail ?? "neznáma chyba"}).` },
      { status: 502 }
    );
  }

  const decision = parseDecision(gen.text);

  if (!decision || decision.type !== "search" || !decision.q) {
    const fallback = decision?.text?.trim() || "Ako vám môžem pomôcť?";
    const text = await conversationalReply(history, fallback);
    return NextResponse.json({
      ok: true,
      reply: { type: "text", text },
      items: [] as UnifiedListing[],
    });
  }

  const base = {
    q: decision.q,
    category: decision.category ?? undefined,
    minPrice: decision.minPrice != null ? String(decision.minPrice) : undefined,
    maxPrice: decision.maxPrice != null ? String(decision.maxPrice) : undefined,
    location: decision.location ?? undefined,
    condition: decision.condition ?? undefined,
  };

  try {
    let result = await runSearch(base);

    if (result.items.length === 0 && base.category) {
      result = await runSearch({ ...base, category: undefined });
    }
    if (result.items.length === 0) {
      result = await runSearch({ q: base.q, location: base.location });
    }
    if (result.items.length === 0) {
      const firstWords = base.q.split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
      if (firstWords && firstWords !== base.q) {
        result = await runSearch({ q: firstWords });
      }
    }

    return NextResponse.json({
      ok: true,
      reply: {
        type: "search",
        text:
          result.items.length > 0
            ? decision.text?.trim() || "Tu sú najrelevantnejšie ponuky:"
            : "Nič som nenašiel – skúste jednoduchšie slová alebo širší rozsah ceny.",
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
