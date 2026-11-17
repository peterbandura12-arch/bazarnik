import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { NotificationsClient } from "@/components/profile/NotificationsClient";
import type { NotificationRow } from "@/types/database";

export const metadata = { title: "Notifikácie", robots: { index: false } };

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/prihlasenie");

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-ink-900">Notifikácie</h1>
      <p className="mb-4 text-sm text-ink-500">
        Upozornenia na nové správy, nové inzeráty v uložených vyhľadávaniach a zmeny stavu vašich inzerátov.
      </p>
      <NotificationsClient notifications={(data ?? []) as NotificationRow[]} />
    </div>
  );
}
