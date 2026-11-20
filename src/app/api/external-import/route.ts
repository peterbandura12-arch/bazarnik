import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { refineCategoryByTitle } from "@/lib/category-refine";

export const maxDuration = 300;

/**
 * Import externých inzerátov z mimo-Vercelu bežiacich zberačov (GitHub
 * Actions). Používa sa pre zdroje, ktoré blokujú dátové IP rozsahy PaaS
 * (napr. Bazar.sk). Vyhľadávací skript beží v Actions a výsledok pošle sem
 * s tajným kľúčom – táto logika potom originálne uloží a upsertuje dáta
 * presne tak, ako robí bežná synchronizácia.
 */

const itemSchema = z.object({
  externalId: z.string().min(1).max(120),
  url: z.string().url().max(2048),
  title: z.string().min(1).max(400),
  description: z.string().max(8000).nullable().optional(),
  price: z.number().nullable().optional(),
  currency: z.string().optional(),
  location: z.string().max(160).nullable().optional(),
  categorySlug: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

const bodySchema = z.object({
  source: z.string().min(1).max(60),
  items: z.array(itemSchema).max(1000),
});

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Neautorizované." }, { status: 401 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Databáza nie je pripojená." }, { status: 503 });
  }

  let bodyRaw: unknown;
  try {
    bodyRaw = await request.json();
  } catch {
    return NextResponse.json({ error: "Neplatné JSON." }, { status: 400 });
  }
  const parsedBody = bodySchema.safeParse(bodyRaw);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Neplatné dáta.", detail: parsedBody.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 }
    );
  }
  const { source: sourceSlug, items } = parsedBody.data;

  const admin = createAdminClient();
  const { data: source } = await admin
    .from("external_sources")
    .select("id, slug")
    .eq("slug", sourceSlug)
    .maybeSingle();
  if (!source) {
    return NextResponse.json({ error: `Zdroj "${sourceSlug}" neexistuje.` }, { status: 404 });
  }

  const { data: categories } = await admin.from("categories").select("id, slug");
  const categoryIds = new Map((categories ?? []).map((c) => [c.slug, c.id]));

  // existujúce inzeráty podľa external_id
  const existingMap = new Map<string, { id: string; content_hash: string | null }>();
  for (let i = 0; i < items.length; i += 200) {
    const { data: rows } = await admin
      .from("external_listings")
      .select("id, external_id, content_hash")
      .eq("source_id", source.id)
      .in("external_id", items.slice(i, i + 200).map((it) => it.externalId));
    for (const row of rows ?? []) {
      existingMap.set(row.external_id, { id: row.id, content_hash: row.content_hash });
    }
  }

  const nowIso = new Date().toISOString();
  let imported = 0;
  let updated = 0;
  let errors = 0;

  for (const item of items) {
    const contentHash = createHash("sha256")
      .update(`${item.title}|${item.price ?? ""}|${item.url}`)
      .digest("hex");
    const categorySlug = item.categorySlug
      ? refineCategoryByTitle(item.title, item.categorySlug)
      : null;
    const categoryId = categorySlug ? categoryIds.get(categorySlug) ?? null : null;
    const listingSlug = `${slugify(item.title) || "ponuka"}-${item.externalId}`;
    const existing = existingMap.get(item.externalId);

    if (existing) {
      if (existing.content_hash !== contentHash) {
        const { error } = await admin
          .from("external_listings")
          .update({
            title: item.title,
            description: item.description ?? null,
            price: item.price ?? null,
            currency: item.currency ?? "EUR",
            location: item.location ?? null,
            category_id: categoryId,
            image_url: item.imageUrl ?? null,
            content_hash: contentHash,
            fetched_at: nowIso,
            is_available: true,
          })
          .eq("id", existing.id);
        if (error) errors++;
        else updated++;
      } else {
        await admin
          .from("external_listings")
          .update({ fetched_at: nowIso, is_available: true })
          .eq("id", existing.id);
      }
    } else {
      const { error } = await admin.from("external_listings").insert({
        source_id: source.id,
        external_id: item.externalId,
        slug: listingSlug,
        url: item.url,
        title: item.title,
        description: item.description ?? null,
        price: item.price ?? null,
        currency: item.currency ?? "EUR",
        condition: null,
        brand: null,
        model: null,
        location: item.location ?? null,
        category_id: categoryId,
        image_url: item.imageUrl ?? null,
        published_at: null,
        content_hash: contentHash,
      });
      if (error) errors++;
      else imported++;
    }
  }

  return NextResponse.json({ ok: true, imported, updated, errors, received: items.length });
}

export async function POST(request: Request) {
  return handle(request);
}
