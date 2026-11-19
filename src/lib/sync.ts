import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdapter } from "@/adapters/registry";
import { slugify } from "@/lib/utils";

/**
 * Synchronizácia externých ponúk – spoločná logika pre cron endpoint
 * aj pre manuálne spustenie z administrácie.
 */

export interface SyncSourceSummary {
  source: string;
  imported: number;
  updated: number;
  errors: string[];
}

export async function runSync(): Promise<{ ok: true; summary: SyncSourceSummary[] }> {
  const admin = createAdminClient();
  const { data: sources } = await admin
    .from("external_sources")
    .select("*")
    .eq("is_active", true);

  const { data: categories } = await admin
    .from("categories")
    .select("id, slug, parent_id");
  const categoryIds = new Map((categories ?? []).map((c) => [c.slug, c.id]));

  const summary: SyncSourceSummary[] = [];

  for (const source of sources ?? []) {
    const adapter = getAdapter(source.slug);
    if (!adapter) {
      summary.push({ source: source.slug, imported: 0, updated: 0, errors: ["Adaptér neexistuje"] });
      continue;
    }

    try {
      const items = await adapter.fetchListings({
        slug: source.slug,
        feedUrl: source.feed_url,
      });
      let imported = 0;
      let updated = 0;

      for (const item of items) {
        const contentHash = createHash("sha256")
          .update(`${item.title}|${item.price}|${item.url}`)
          .digest("hex");

        const categoryId = item.categorySlug
          ? categoryIds.get(item.categorySlug) ?? null
          : null;

        const { data: existing } = await admin
          .from("external_listings")
          .select("id, content_hash, category_id")
          .eq("source_id", source.id)
          .eq("external_id", item.externalId)
          .maybeSingle();

        const slug = `${slugify(item.title) || "ponuka"}-${item.externalId}`;

        if (existing) {
          if (existing.content_hash !== contentHash || existing.category_id !== categoryId) {
            await admin
              .from("external_listings")
              .update({
                title: item.title,
                description: item.description,
                price: item.price,
                condition: item.condition,
                brand: item.brand,
                model: item.model,
                location: item.location,
                category_id: categoryId,
                image_url: item.imageUrl,
                content_hash: contentHash,
                fetched_at: new Date().toISOString(),
                is_available: true,
              })
              .eq("id", existing.id);
            updated++;
          }
        } else {
          await admin.from("external_listings").insert({
            source_id: source.id,
            external_id: item.externalId,
            slug,
            url: item.url,
            title: item.title,
            description: item.description,
            price: item.price,
            currency: item.currency,
            condition: item.condition,
            brand: item.brand,
            model: item.model,
            location: item.location,
            category_id: categoryId,
            image_url: item.imageUrl,
            published_at: item.publishedAt,
            content_hash: contentHash,
          });
          imported++;
        }
      }

      await admin
        .from("external_sources")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", source.id);

      summary.push({ source: source.slug, imported, updated, errors: [] });
    } catch (error) {
      summary.push({
        source: source.slug,
        imported: 0,
        updated: 0,
        errors: [error instanceof Error ? error.message : "Neznáma chyba"],
      });
    }
  }

  return { ok: true, summary };
}
