import { createClient } from "@/lib/supabase/server";

export default async function AdminStatsPage() {
  const supabase = await createClient();

  const [users, listings, external, reports, conversations] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("external_listings").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Registrovaní používatelia", value: users.count ?? 0 },
    { label: "Vlastné inzeráty", value: listings.count ?? 0 },
    { label: "Externé inzeráty", value: external.count ?? 0 },
    { label: "Nové nahlásenia", value: reports.count ?? 0 },
    { label: "Konverzácie", value: conversations.count ?? 0 },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-ink-200 bg-white p-5">
          <p className="text-2xl font-bold text-ink-900">{s.value}</p>
          <p className="mt-1 text-sm text-ink-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
