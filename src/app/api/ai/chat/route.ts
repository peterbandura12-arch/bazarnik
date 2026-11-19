import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText, isAiEnabled } from "@/lib/ai";
import { searchListings } from "@/lib/listings";
import { CATEGORY_TREE } from "@/lib/categories";
import type { UnifiedListing } from "@/types/database";

export const maxDuration = 120;

const SEARCH_MARKER = "@@SEARCH@@";

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
  "Si priateľský AI asistent webu Bazárnik, slovenskej inzertnej platformy, ktorá zhromažďuje ponuky z Bazoša, Bazar.sk, Vintedu a ďalších bazárov na jednom mieste.",
  "Odpovedaj VÝHRADNE v slovenčine, prirodzene a ľudsky.",
  "Odpovedaj na akúkoľvek otázku – rady pri nákupe a predaji, orientačné ceny použitých vecí, bezpečné obchodovanie, technické otázky, všeobecné znalosti, bežný rozhovor. Odmietaj len nebezpečné alebo neetické veci.",
  "ŠPECIÁLNE PRAVIDLO – ak používateľ hľadá konkrétny tovar alebo opisuje, čo chce kúpiť, sprav oboje:",
  "1) Odpovedz krátkou správnou vetou (napr. „Hľadám pre vás ponuky…“).",
  `2) Na úplne nový riadok potom pridaj blok presne v tvare: ${SEARCH_MARKER}{"q":"...","category":null,"minPrice":null,"maxPrice":null,"location":null,"condition":null}`,
  "V bloku: q = všetky kľúčové slová (značka, model, variant) tak, ako by ich napísal predajca v názve inzerátu; bez cien a miest.",
  "category musí byť jeden z týchto slugov: " + CATEGORY_SLUGS.join(", ") + " alebo null.",
  "condition môže byť len jedno z: nove, ako_nove, pouzite, na_diely, alebo null.",
  "minPrice/maxPrice sú čísla v EUR alebo null. location je mesto alebo kraj v Slovensku alebo null.",
  "Ak používateľ tovar NEHĽADÁ, blok vôbec nepridávaj – len odpovedz.",
].join("\n");

const searchSchema = z.object({
  q: z.string().max(200),
  category: z.string().max(60).optional().nullable(),
  minPrice: z.number().min(0).max(1_000_000).optional().nullable(),
  maxPrice: z.number().min(0).max(1_000_000).optional().nullable(),
  location: z.string().max(60).optional().nullable(),
  condition: z.enum(["nove", "ako_nove", "pouzite", "na_diely"]).optional().nullable(),
});

function parseSearchBlock(raw: string): { intro: string; search: z.infer<typeof searchSchema> } | null {
  const idx = raw.indexOf(SEARCH_MARKER);
  if (idx === -1) return null;
  const after = raw.slice(idx + SEARCH_MARKER.length);
  let jsonText = after.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }
  const match = jsonText.match(/\{[\s\S]*?\}/);
  if (!match) return null;
  try {
    const search = searchSchema.parse(JSON.parse(match[0]));
    const intro = raw.slice(0, idx).trim();
    return { intro, search };
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

  const gen = await generateText({ system: SYSTEM_PROMPT, prompt: history, maxTokens: 900 });
  if (!gen.ok || !gen.text) {
    return NextResponse.json(
      { ok: false, error: `AI odpoveď sa nepodarilo získať (${gen.detail ?? "neznáma chyba"}).` },
      { status: 502 }
    );
  }

  const raw = gen.text;
  const found = parseSearchBlock(raw);

  if (!found) {
    return NextResponse.json({
      ok: true,
      reply: { type: "text", text: raw.slice(0, 2000) },
      items: [] as UnifiedListing[],
    });
  }

  const s = found.search;
  const base = {
    q: s.q,
    category: s.category ?? undefined,
    minPrice: s.minPrice != null ? String(s.minPrice) : undefined,
    maxPrice: s.maxPrice != null ? String(s.maxPrice) : undefined,
    location: s.location ?? undefined,
    condition: s.condition ?? undefined,
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
            ? found.intro || "Tu sú najrelevantnejšie ponuky:"
            : "Nič som nenašiel – skúste jednoduchšie slová alebo širší rozsah ceny.",
        q: s.q,
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
