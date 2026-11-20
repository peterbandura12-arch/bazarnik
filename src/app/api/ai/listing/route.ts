import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText, isAiEnabled } from "@/lib/ai";
import { CATEGORY_TREE } from "@/lib/categories";

export const maxDuration  = 120;

const bodySchema = z.object({
  text: z.string().min(10, "Popíšte inzerát aspoň v jednej vete.").max(1000),
});

const CATEGORIES_INFO = CATEGORY_TREE.map(
  (p) => `${p.slug} (${p.children.map((c) => c.slug).join(", ")})`
).join("; ");

const SYSTEM_PROMPT = [
  "Si asistent Bazárnik, ktorý pripravuje inzeráty na predaj. Odpovedaj VÝHRADNE v slovenčine.",
  "Z popisu používateľa vytvor kvalitný návrh inzerátu a vráť IBA čistý JSON objekt:",
  '{"title":"...","description":"...","price":123,"condition":"nove|ako_nove|pouzite|na_diely","categorySlug":"slug podkategórie","brand":null,"model":null,"location":null}',
  "title: atraktívny, výstižný, 5–120 znakov. description: predajný, konkrétny, 2–6 viet, bez vymýšľania si skutočností.",
  "price: číslo v EUR (0 ak daruje, bez zvyšných znakov); ak používateľ cenu neuviedol, odhad zmysluplnú trhovú cenu.",
  "location: mesto, ak ho používateľ spomenul, inak null. brand/model len ak sú známe, inak null.",
  "categorySlug musí byť presne jeden z týchto slugov podkategórií (v zátvorke sú deti, hlavná kategória pred zátvorkou):",
  CATEGORIES_INFO,
].join("\n");

const AI_SCHEMA = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(6000),
  price: z.coerce.number().min(0).max(1_000_000),
  condition: z.string().max(30),
  categorySlug: z.string().max(60),
  brand: z.union([z.string(), z.number()]).optional().nullable(),
  model: z.union([z.string(), z.number()]).optional().nullable(),
  location: z.union([z.string(), z.number()]).optional().nullable(),
});

const VALID_SLUGS = new Set(
  CATEGORY_TREE.flatMap((p) => [p.slug, ...p.children.map((c) => c.slug)])
);

/** Normalizácia stavu – AI občas vráti "ako nový", "použitý"… */
function normalizeCondition(raw: string): "nove" | "ako_nove" | "pouzite" | "na_diely" {
  const t = raw.toLowerCase().trim().replace(/\s+/g, " ");
  if (/ako.?nov/.test(t)) return "ako_nove";
  if (/na.?diel|rozobran/.test(t)) return "na_diely";
  if (/nov[ýée]?$|neuz|nepouz/.test(t)) return "nove";
  return "pouzite";
}

/** Cena ako "450 €" alebo string → číslo. */
function coercePrice(raw: unknown): number {
  if (typeof raw === "string") {
    const digits = raw.replace(/[^0-9.,]/g, "").replace(/,(\\d+)$/, ".$1");
    const n = Number(digits.replace(/\\s/g, ""));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Slug kategórie: malé písmená, pomlčky namiesto medzier, bez diakritiky. */
function coerceSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fallbackCategory(slug: string): string {
  const normalized = coerceSlug(slug);
  if (VALID_SLUGS.has(normalized)) return normalized;

  // Časté varianty, ktoré AI používa pre kategórie.
  const aliases: Record<string, string> = {
    auta: "osobne-automobily",
    auto: "osobne-automobily",
    automobily: "osobne-automobily",
    mobil: "mobilne-telefony",
    mobily: "mobilne-telefony",
    telefony: "mobilne-telefony",
    pocitace: "pocitace-a-gaming",
    elektro: "elektronika",
    elektronika: "elektronika",
    kolo: "cyklistika",
    bicykle: "cyklistika",
    bicykel: "cyklistika",
    nabytok: "nabytok",
    deti: "deti-a-hracky",
    hracky: "deti-a-hracky",
    sport: "sport-a-outdoor",
    zviera: "zvierata",
    zvierata: "zvierata",
    oblecenie: "oblecenie-a-moda",
    moda: "oblecenie-a-moda",
    stroje: "naradie",
    nastroje: "naradie",
    dom: "dom-a-zahrada",
    zahrada: "dom-a-zahrada",
  };
  if (aliases[normalized]) return aliases[normalized];

  for (const parent of CATEGORY_TREE) {
    if (parent.slug === normalized) return parent.children[0]?.slug ?? "ostatne-inzeraty";
    for (const child of parent.children) {
      if (child.slug.startsWith(normalized) || normalized.startsWith(child.slug.slice(0, 10))) {
        return child.slug;
      }
    }
  }
  return "ostatne-inzeraty";
}

export async function POST(request: Request) {
  if (!isAiEnabled()) {
    return NextResponse.json(
      { ok: false, error: "AI nie je zapnutá. Doplňte GEMINI_API_KEY na Verceli." },
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
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Nesprávny formát." },
      { status: 400 }
    );
  }

  const gen = await generateText({
    system: SYSTEM_PROMPT,
    prompt: `Popis inzerátu od používateľa:\n"""${parsed.data.text}"""\nVráť iba JSON:`,
    json: true,
    maxTokens: 800,
  });

  if (!gen.ok || !gen.text) {
    return NextResponse.json(
      { ok: false, error: `AI teraz nedostupná (${gen.detail ?? "neznáma chyba"}) – skúste to o chvíľu.` },
      { status: 502 }
    );
  }
  const raw: string = gen.text;

  try {
    let jsonText = raw.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\\s*/, "").replace(/```\\s*$/, "");
    }
    const match = jsonText.match(/\\{[\\s\\S]*\\}/);
    if (match) jsonText = match[0];
    const data = AI_SCHEMA.parse(JSON.parse(jsonText));

    return NextResponse.json({
      ok: true,
      data: {
        title: data.title.trim(),
        description: data.description.trim(),
        price: Math.round(coercePrice(data.price)),
        condition: normalizeCondition(data.condition),
        categorySlug: fallbackCategory(data.categorySlug),
        brand: data.brand != null ? String(data.brand).trim().slice(0, 60) : "",
        model: data.model != null ? String(data.model).trim().slice(0, 60) : "",
        location: data.location != null ? String(data.location).trim().slice(0, 60) : "",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI odpoveď nebolo možné spracovať, skúste prepísať popis inak." },
      { status: 502 }
    );
  }
}
