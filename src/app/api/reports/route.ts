import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const bodySchema = z
  .object({
    listingId: z.string().uuid().optional(),
    externalListingId: z.string().uuid().optional(),
    reason: z.enum(["spam", "nevhodny_obsah", "podvod", "duplicitny", "iny"]),
    details: z.string().max(2000).optional(),
  })
  .refine((data) => Boolean(data.listingId) !== Boolean(data.externalListingId), {
    message: "Nutné uviesť presne jeden typ inzerátu.",
  });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Databáza nie je pripojená – nahlásenie nie je dostupné v ukážkovom režime." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Pre nahlásenie inzerátu sa prihláste." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatné dáta nahlásenia." }, { status: 400 });
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    listing_id: parsed.data.listingId ?? null,
    external_listing_id: parsed.data.externalListingId ?? null,
    reason: parsed.data.reason,
    details: parsed.data.details ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "Nahlásenie sa nepodarilo uložiť." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
