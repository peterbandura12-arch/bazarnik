import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdapter } from "@/adapters/registry";
import { computeFocalPoint } from "@/lib/image-focus";
import { slugify } from "@/lib/utils";

/**
 * Synchronizácia externých ponúk – spoločná logika pre cron endpoint
 * aj pre manuálne spustenie z administrácie.
 */

export interface SyncSourceSummary {
  source: string;
  imported: number;
  updated: number;
  archived: number;
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
      summary.push({ source: source.slug, imported: 0, updated: 0, archived: 0, errors: ["Adaptér neexistuje"] });
      continue;
    }

    try {
      const items = await adapter.fetchListings({
        slug: source.slug,
        feedUrl: source.feed_url,
      });
      let imported = 0;
      let updated = 0;

      const existingMap = new Map<string, { id: string; content_hash: string | null; category_id: string | null; location: string | null }>();
      for (let i = 0; i < items.length; i += 200) {
        const batch = items.slice(i, i + 200).map((item) => item.externalId);
        const { data: batchRows } = await admin
          .from("external_listings")
          .select("id, external_id, content_hash, category_id, location")
          .eq("source_id", source.id)
          .in("external_id", batch);
        for (const row of batchRows ?? []) {
          existingMap.set(row.external_id, { id: row.id, content_hash: row.content_hash, category_id: row.category_id, location: row.location });
        }
      }

      // Dotyk všetkých práve videných inzerátov – jeden dávkový dopyt (posunie fetched_at).
      const nowIso = new Date().toISOString();
      for (let i = 0; i < items.length; i += 200) {
        await admin
          .from("external_listings")
          .update({ fetched_at: nowIso })
          .eq("source_id", source.id)
          .in("external_id", items.slice(i, i + 200).map((item) => item.externalId));
      }

      for (const item of items) {
        const contentHash = createHash("sha256")
          .update(`${item.title}|${item.price}|${item.url}`)
          .digest("hex");

        const categoryId = item.categorySlug
          ? categoryIds.get(item.categorySlug) ?? null
          : null;

        const existing = existingMap.get(item.externalId);

        const slug = `${slugify(item.title) || "ponuka"}-${item.externalId}`;

        if (existing) {
          if (
            existing.content_hash !== contentHash ||
            existing.category_id !== categoryId ||
            existing.location !== item.location
          ) {
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

      // Vyradenie inzerátov, ktoré sa dlhšie neobjavujú v feedoch (sú z portálu predané/vymazané).
      const availabilityCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: stale } = await admin
        .from("external_listings")
        .select("id", { count: "exact", head: true })
        .eq("source_id", source.id)
        .eq("is_available", true)
        .lt("fetched_at", availabilityCutoff);
      if (stale && stale > 0) {
        await admin
          .from("external_listings")
          .update({ is_available: false })
          .eq("source_id", source.id)
          .eq("is_available", true)
          .lt("fetched_at", availabilityCutoff);
      }

      // Doplnenie kategórií inzerátom importovaným pred zavedením mapovania.
      const { data: uncategorized } = await admin
        .from("external_listings")
        .select("id, url")
        .eq("source_id", source.id)
        .is("category_id", null)
        .limit(500);
      for (const row of uncategorized ?? []) {
        const slug = adapter.getCategoryFromUrl?.(row.url) ?? null;
        const categoryId = slug ? categoryIds.get(slug) ?? null : null;
        if (categoryId) {
          await admin
            .from("external_listings")
            .update({ category_id: categoryId })
            .eq("id", row.id);
        }
      }

      // Doliečenie polohy inzerátom importovaným pred zavedením detekcie.
      const { data: unlocated } = await admin
        .from("external_listings")
        .select("id, title, description")
        .eq("source_id", source.id)
        .is("location", null)
        .limit(500);
      for (const row of unlocated ?? []) {
        const location = adapter.getLocationFromText?.(`${row.title}\n${row.description ?? ""}`) ?? null;
        if (location) {
          await admin
            .from("external_listings")
            .update({ location })
            .eq("id", row.id);
        }
      }

      // Auto-focus: vypocet bodu zajmu fotiek pre nove inzeraty (max 40 na beh).
      const { data: unfocused } = await admin
        .from("external_listings")
        .select("id, image_url")
        .eq("source_id", source.id)
        .is("focal_x", null)
        .not("image_url", "is", null)
        .limit(40);
      for (const row of unfocused ?? []) {
        try {
          const imgRes = await fetch(row.image_url, {
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
          });
          if (!imgRes.ok) continue;
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          if (imgBuffer.length > 3_000_000) continue;
          const focal = await computeFocalPoint(imgBuffer);
          if (focal) {
            await admin
              .from("external_listings")
              .update({ focal_x: focal.x, focal_y: focal.y })
              .eq("id", row.id);
          }
        } catch {
          // fotka sa preskoci
        }
      }

      await admin
        .from("external_sources")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", source.id);

      summary.push({ source: source.slug, imported, updated, archived: stale ?? 0, errors: [] });
    } catch (error) {
      summary.push({
        source: source.slug,
        imported: 0,
        updated: 0,
        archived: 0,
        errors: [error instanceof Error ? error.message : "Neznáma chyba"],
      });
    }
  }

  return { ok: true, summary };
}
