import { NextResponse } from "next/server";
import { z } from "zod";
import { generateFastJson, isAiEnabled, streamText } from "@/lib/ai";
import { searchListings } from "@/lib/listings";
import { safeSearchExternal, type ExternalResult } from "@/lib/meta-search";
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

/**
 * ROUTER – krátke a rýchle zadanie pre najrýchlejší model. Rozhodne, či
 * používateľ HĽADÁ tovar (a s akými parametrami), chce DOPTAŤ (Alza-štýl:
 * model → stav → rozpočet → mesto) alebo len POKECA/SA SPÝTA.
 * Vďaka krátkemu JSON trvá router zvyčajne ~1 s.
 */
const ROUTER_SYSTEM = [
  "Si rýchly router AI asistenta Bazárnik (slovenský inzertný agregátor ponúk z Bazoša, Bazar.sk a ďalších bazárov). Rozhodni o zámere používateľa podľa konverzácie.",
  "Vráť VÝHRADNE jeden JSON objekt bez ďalšieho textu, presne v jednom z týchto tvarov:",
  '{"intent":"search","q":"...","category":null,"minPrice":null,"maxPrice":null,"location":null,"condition":null}',
  '{"intent":"clarify","reply":"...","suggest":["...","..."]}',
  '{"intent":"chat"}',
  "PRAVIDLÁ:",
  "- intent=search: používateľ hľadá konkrétny tovar a z konverzácie JASNE vyplýva ČO hľadá (značka, model alebo aspoň typ). q = kľúčové slová presne tak, ako by ich napísal predajca v názve inzerátu (značka + model + variant, bez cien a miest). category = jeden slug zo zoznamu alebo null: " +
    CATEGORY_SLUGS.join(", ") +
    ". condition len jedno z: nove, ako_nove, pouzite, na_diely alebo null. minPrice/maxPrice = čísla v EUR alebo null. location = mesto alebo kraj v SR alebo null.",
  "- intent=clarify: používateľ používa hľadá tovar, ale zámer je príliš vágný (nevieš určiť presný model, typ ani variant). reply = JEDNA krátka priateľská otázka v slovenčine na najdôležitejšiu chýbajúcu vec, v tomto poradí priority: (1) presný model/typ/variant, (2) stav, (3) rozpočet (cena-do), (4) mesto. suggest = 2–4 krátke hotové odpovede na výber (max 30 znakov), napr. [\"do 150 €\",\"do 300 €\",\"nevadí cena\"]. Ak niečo z konverzácie už vieš, vyplň aj q/category/parametre.",
  "- intent=chat: všetko ostatné – otázky, rady, ceny, rozhovor.",
  "- DÔLEŽITÉ: ak používateľ používa hľadá a po predchádzajúcej otázke už aspoň niečo upresnil (alebo dotaz sám je dosť konkrétny), VRÁŤ intent=search a nepýtaj sa znova. Maximálne JEDNA upresňujúca otázka za celý rozhovor.",
  "- Ak používateľ upresňovaciu otázku ignoruje a opakuje rovnaký dotaz, vráť intent=search s tým, čo máš.",
].join("\n");

const routerSchema = z.object({
  intent: z.enum(["search", "clarify", "chat"]),
  q: z.string().max(200).optional().nullable(),
  category: z.string().max(60).optional().nullable(),
  minPrice: z.number().optional().nullable(),
  maxPrice: z.number().optional().nullable(),
  location: z.string().max(60).optional().nullable(),
  condition: z.enum(["nove", "ako_nove", "pouzite", "na_diely"]).optional().nullable(),
  reply: z.string().max(1500).optional().nullable(),
  suggest: z.array(z.string().max(60)).max(6).optional().nullable(),
});

const CHAT_SYSTEM = [
  "Si priateľský AI asistent webu Bazárnik, slovenskej inzertnej platformy, ktorá zhromažďuje ponuky z Bazoša, Bazar.sk a ďalších bazárov na jednom mieste.",
  "Odpovedaj VÝHRADNE v slovenčine, prirodzene a ľudsky.",
  "Odpovedaj na akúkoľvek otázku – rady pri nákupe a predaji, orientačné ceny použitých vecí, bezpečné obchodovanie, technické otázky, všeobecné znalosti, bežný rozhovor. Odmietaj len nebezpečné alebo neetické veci.",
  "Odpovede drž stručné a jasné (zvyčajne do 150 slov), pokiaľ si používateľ nepýta detail. Formátuj odrazkami, keď sa to hodí.",
  "Keď má zmysel, krátko na konci navrhni, že môže napísať čo hľadá (napr. „hladam iphone 13“) a nájdeš mu konkrétne inzeráty.",
].join("\n");

const searchSchema = z.object({
  q: z.string().max(200),
  category: z.string().max(60).optional().nullable(),
  minPrice: z.number().optional().nullable(),
  maxPrice: z.number().optional().nullable(),
  location: z.string().max(60).optional().nullable(),
  condition: z.enum(["nove", "ako_nove", "pouzite", "na_diely"]).optional().nullable(),
});

function extractJsonObject(raw: string): unknown | null {
  let jsonText = raw.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }
  const match = jsonText.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
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

function sseLine(data: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(data) + "\n");
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

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (data: unknown) => controller.enqueue(sseLine(data));
      try {
        // 1) Rýchly router – ~1 s.
        const gen = await generateFastJson({
          system: ROUTER_SYSTEM,
          prompt: history,
          maxTokens: 400,
        });

        let router: z.infer<typeof routerSchema> | null = null;
        if (gen.ok && gen.text) {
          const obj = extractJsonObject(gen.text);
          const check = routerSchema.safeParse(obj);
          if (check.success) router = check.data;
        }

        // Router sa nepodaril → pokus o klasickú konverzačnú odpoveď (stream).
        if (!router || router.intent === "chat") {
          push({ type: "start" });
          let produced = false;
          for await (const chunk of streamText({
            system: CHAT_SYSTEM,
            prompt: history,
            maxTokens: 700,
          })) {
            produced = true;
            push({ type: "delta", text: chunk });
          }
          if (!produced) {
            push({
              type: "delta",
              text:
                "Prepáč, teraz sa mi nedarí odpovedať (AI je pretlačená). Skús to o chvíľu znova.",
            });
          }
          push({ type: "done" });
          controller.close();
          return;
        }

        if (router.intent === "clarify") {
          push({
            type: "message",
            text: router.reply?.trim() || "Napíšte mi, čo presne hľadáte.",
            suggest: (router.suggest ?? []).filter((s) => s.trim()).slice(0, 4),
          });
          push({ type: "done" });
          controller.close();
          return;
        }

        // intent === "search"
        const q = (router.q ?? "").trim();
        if (!q) {
          push({
            type: "message",
            text: "Napíšte mi, čo presne hľadáte (napr. „horský bicykel do 200 € v Žiline“) a nájdem ponuky.",
            suggest: ["horský bicykel", "iPhone 13", "hračky pre deti", "nábytok do 100 €"],
          });
          push({ type: "done" });
          controller.close();
          return;
        }

        push({ type: "status", text: "Hľadám ponuky…" });

        const category =
          router.category && CATEGORY_SLUGS.includes(router.category) ? router.category : undefined;
        const base = {
          q,
          category,
          minPrice: router.minPrice != null ? String(router.minPrice) : undefined,
          maxPrice: router.maxPrice != null ? String(router.maxPrice) : undefined,
          location: router.location ?? undefined,
          condition: router.condition ?? undefined,
        };

        let items: UnifiedListing[] = [];
        let externalItems: ExternalResult[] = [];
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

          // Výsledky z ďalších portálov – len keď sú kľúče nastavené.
          externalItems = await safeSearchExternal(base.q, 6);
          items = result.items;
        } catch {
          // necháme prázdne – správa dole ošetrí text
        }

        const intro =
          items.length > 0 || externalItems.length > 0
            ? `Tu sú ponuky na „${q}“:`
            : "Nič som nenašiel – skúste jednoduchšie slová alebo širšiu cenu.";

        push({
          type: "results",
          text: intro,
          q,
          items,
          externalItems,
        });
        push({ type: "done" });
        controller.close();
      } catch {
        try {
          push({
            type: "message",
            text: "Prepáčte, odpoveď sa nepodarila. Skúste to o chvíľu znova.",
          });
          push({ type: "done" });
          controller.close();
        } catch {
          // klient už odišiel
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
