import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdapter } from "@/adapters/registry";
import { upgradeBazosImageUrl } from "@/adapters/sources/bazos";
import { computeFocalPoint } from "@/lib/image-focus";
import { refineCategoryByTitle } from "@/lib/category-refine";
import { aiClassifyCategories } from "@/lib/category-ai";
import { isAiEnabled } from "@/lib/ai";
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
  refined?: number;
  scanned?: number;
  aiRefined?: number;
  aiChecked?: number;
  aiProposed?: number;
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
          ? categoryIds.get(refineCategoryByTitle(item.title, item.categorySlug)) ?? null
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

      // Prehodnotenie kategórií podľa názvu (napr. smart hodinky z Bazoš sekcie mobil).
      const slugById = new Map((categories ?? []).map((c) => [c.id, c.slug]));
      let refined = 0;
      let scanned = 0;
      const REFINE_BATCH = 800;
      for (let offset = 0; offset < 5000; offset += REFINE_BATCH) {
        const { data: forRefine } = await admin
          .from("external_listings")
          .select("id, title, category_id")
          .eq("source_id", source.id)
          .order("fetched_at", { ascending: true })
          .range(offset, offset + REFINE_BATCH - 1);
        if (!forRefine || forRefine.length === 0) break;
        scanned += forRefine.length;
        for (const row of forRefine) {
          const currentSlug = row.category_id ? slugById.get(row.category_id) ?? null : null;
          const better = refineCategoryByTitle(row.title, currentSlug);
          if (better && better !== currentSlug) {
            const betterId = categoryIds.get(better);
            if (betterId) {
              const { error: refineError } = await admin
                .from("external_listings")
                .update({ category_id: betterId })
                .eq("id", row.id);
              if (!refineError) refined++;
            }
          }
        }
        if (forRefine.length < REFINE_BATCH) break;
      }

      // AI klasifikacia – inteligentne "okno" nad pravidlami. Kazdy beh checkne
      // novych 50 inzeratov (nekategorizovani maju prioritu) a spravne presunie i take,
      // ktore pravidlovy refine nechyt.
      let aiRefined = 0;
      let aiChecked = 0;
      let aiProposed = 0;
      let aiError: string | null = null;
      let aiSample: string | null = null;
      if (isAiEnabled()) {
        try {
          const { data: aiPool } = await admin
            .from("external_listings")
            .select("id, title, description, category_id")
            .eq("source_id", source.id)
            .order("fetched_at", { ascending: false })
            .limit(120);

          const pool = (aiPool ?? []).map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            currentSlug: row.category_id ? slugById.get(row.category_id) ?? null : null,
          }));

          // priorita: 1) bez kategorie, 2) najnovsi
          const ordered = [
            ...pool.filter((p) => !p.currentSlug),
            ...pool.filter((p) => p.currentSlug),
          ].slice(0, 50);
          aiChecked = ordered.length;

          const aiOut = await aiClassifyCategories(ordered);
          const aiMap = aiOut.map;
          aiProposed = aiMap.size;
          if (aiProposed === 0) aiSample = aiOut.sample;
          for (const [id, slug] of aiMap) {
            const item = ordered.find((p) => p.id === id);
            if (!item) continue;
            const betterId = categoryIds.get(slug);
            if (!betterId || betterId === item.currentSlug) continue;
            const { error: aiErr } = await admin
              .from("external_listings")
              .update({ category_id: betterId })
              .eq("id", id);
            if (!aiErr) aiRefined++;
          }
        } catch (err) {
          // AI klasifikacia nikdy nesmie spadnut synchronizaciu
          aiError = err instanceof Error ? err.message.slice(0, 200) : "neznama chyba";
        }
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

      // Backfill: male nahliady z RSS vymeň za plné verzie fotiek
      // (a vynuť prepočet bodu záujmu na väčšom obrázku).
      const { data: tinyImages } = await admin
        .from("external_listings")
        .select("id, image_url")
        .or("image_url.ilike.%/img/1m/%,image_url.ilike.%/img/1t/%")
        .limit(200);
      for (const row of tinyImages ?? []) {
        if (!row.image_url) continue;
        const upgraded = upgradeBazosImageUrl(row.image_url);
        if (upgraded !== row.image_url) {
          await admin
            .from("external_listings")
            .update({ image_url: upgraded, focal_x: null, focal_y: null })
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

      const summaryEntry: SyncSourceSummary = { source: source.slug, imported, updated, archived: stale ?? 0, refined, scanned, aiRefined, aiChecked, aiProposed, errors: [] };
      if (aiError) summaryEntry.errors.push(`AI: ${aiError}`);
      if (aiSample) summaryEntry.errors.push(`AI sample: ${aiSample}`);
      summary.push(summaryEntry);
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
