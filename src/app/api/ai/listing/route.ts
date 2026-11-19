import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText, isAiEnabled } from "@/lib/ai";
import { CATEGORY_TREE } from "@/lib/categories";

export const maxDuration = 60;

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
  title: z.string().min(5).max(120),
  description: z.string().min(10).max(4000),
  price: z.number().min(0).max(100000),
  condition: z.enum(["nove", "ako_nove", "pouzite", "na_diely"]),
  categorySlug: z.string().max(60),
  brand: z.string().max(60).optional().nullable(),
  model: z.string().max(60).optional().nullable(),
  location: z.string().max(60).optional().nullable(),
});

const VALID_SLUGS = new Set(
  CATEGORY_TREE.flatMap((p) => [p.slug, ...p.children.map((c) => c.slug)])
);

function fallbackCategory(slug: string): string {
  if (VALID_SLUGS.has(slug)) return slug;
  for (const parent of CATEGORY_TREE) {
    if (parent.children.some((c) => slug.startsWith(c.slug.slice(0, 8)))) return parent.children[0]?.slug ?? "ostatne-inzeraty";
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
    maxTokens: 1200,
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
      jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
    }
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) jsonText = match[0];
    const data = AI_SCHEMA.parse(JSON.parse(jsonText));

    return NextResponse.json({
      ok: true,
      data: {
        title: data.title.trim(),
        description: data.description.trim(),
        price: Math.round(data.price),
        condition: data.condition,
        categorySlug: fallbackCategory(data.categorySlug),
        brand: data.brand?.trim() || "",
        model: data.model?.trim() || "",
        location: data.location?.trim() || "",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI odpoveď nebolo možné spracovať, skúste prepísať popis inak." },
      { status: 502 }
    );
  }
}
