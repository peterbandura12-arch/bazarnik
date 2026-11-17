import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  action: z.enum(["block_user", "unblock_user", "delete_listing", "resolve_report"]),
  id: z.string().uuid(),
});

/**
 * Všetky admin akcie sa overujú na serveri – rola administrátora sa kontroluje
 * v relácii prihláseného používateľa, nie len v rozhraní.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Databáza nie je pripojená." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Neprihlásený používateľ." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_blocked")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || profile.is_blocked) {
    return NextResponse.json({ error: "Nemáte administrátorské oprávnenie." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatná požiadavka." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { action, id } = parsed.data;

  switch (action) {
    case "block_user": {
      const { error } = await admin.from("profiles").update({ is_blocked: true }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }
    case "unblock_user": {
      const { error } = await admin.from("profiles").update({ is_blocked: false }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }
    case "delete_listing": {
      const { error } = await admin.from("listings").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }
    case "resolve_report": {
      const { error } = await admin
        .from("reports")
        .update({ status: "resolved" })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
