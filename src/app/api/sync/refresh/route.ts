import { NextResponse, after } from "next/server";

export const maxDuration = 300;

import { runSync } from "@/lib/sync";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public "kick" na synchronizaciu – vola ho stranka pri navstive.
 * Spusti synchronizaciu na pozadi, ak bezi menej ako 10 minut od poslednej;
 * inak iba potvrdi, ze data su cerstve. Funguje tak spoahlivo
 * aj v pripade, ze planovac (GitHub Actions) zlyha alebo sa oneskori.
 */
export async function POST() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, reason: "db-not-configured" }, { status: 503 });
  }

  try {
    const admin = createAdminClient();
    const { data: sources } = await admin
      .from("external_sources")
      .select("last_synced_at")
      .eq("is_active", true);

    const STALE_MS = 10 * 60 * 1000; // 10 minut
    const newest = (sources ?? [])
      .map((s) => (s.last_synced_at ? new Date(s.last_synced_at).getTime() : 0))
      .reduce((a, b) => Math.max(a, b), 0);

    if (Date.now() - newest < STALE_MS) {
      return NextResponse.json({ ok: true, synced: false, reason: "fresh" });
    }

    // Synchronizaciu spustime na pozadi a hned odpovieme (stranka nezdrzava).
    after(async () => {
      try {
        await runSync();
      } catch (err) {
        console.error("Background sync error:", err);
      }
    });

    return NextResponse.json({ ok: true, synced: true });
  } catch {
    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
