import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const bodySchema = z.object({
  listingId: z.string().uuid(),
  message: z.string().trim().min(1).max(5000),
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Databáza nie je pripojená – chat nie je dostupný v ukážkovom režime." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Pre odoslanie správy sa prihláste." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatné dáta požiadavky." }, { status: 400 });
  }

  const { listingId, message } = parsed.data;

  const { data: listing } = await supabase
    .from("listings")
    .select("id, user_id, status, title")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Inzerát nebol nájdený." }, { status: 404 });
  }

  if (listing.user_id === user.id) {
    return NextResponse.json(
      { error: "Vlastnému inzerátu sa nedá napísať správa." },
      { status: 400 }
    );
  }

  let conversationId: string;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (existing) {
    conversationId = existing.id;
  } else {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ listing_id: listingId, buyer_id: user.id, seller_id: listing.user_id })
      .select("id")
      .single();

    if (error || !created) {
      return NextResponse.json({ error: "Konverzáciu sa nepodarilo vytvoriť." }, { status: 500 });
    }
    conversationId = created.id;
  }

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: message,
  });

  if (messageError) {
    return NextResponse.json({ error: "Správu sa nepodarilo odoslať." }, { status: 500 });
  }

  await supabase.from("notifications").insert({
    user_id: listing.user_id,
    type: "message",
    title: "Nová správa k inzerátu",
    body: message.slice(0, 120),
    link: `/profil/spravy?c=${conversationId}`,
  });

  return NextResponse.json({ conversationId });
}
