import { NextResponse } from "next/server";

export const maxDuration = 60;
import { runSync } from "@/lib/sync";

/**
 * Synchronizácia externých ponúk. Spúšťa sa plánovane (Vercel cron) s hlavičkou
 * Authorization: Bearer <CRON_SECRET>. Bez tajného kľúča odmietne požiadavku.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Neautorizované." }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Databáza nie je pripojená." }, { status: 503 });
  }

  return NextResponse.json(await runSync());
}

export async function POST(request: Request) {
  return handle(request);
}

/** Vercel Cron volá GET – presmerujeme na rovnakú logiku. */
export async function GET(request: Request) {
  return handle(request);
}
