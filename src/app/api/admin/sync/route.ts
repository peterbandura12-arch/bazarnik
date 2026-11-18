import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/server";
import { runSync } from "@/lib/sync";

/**
 * Manuálne spustenie synchronizácie externých ponúk z administrácie.
 * Dostupné iba pre prihláseného administrátora.
 */
export async function POST() {
  const profile = await getCurrentProfile().catch(() => null);
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Neautorizované." }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Databáza nie je pripojená." }, { status: 503 });
  }

  return NextResponse.json(await runSync());
}
