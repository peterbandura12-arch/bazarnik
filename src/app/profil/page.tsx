import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Search, Star } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";

export const metadata = { title: "Prehľad účtu", robots: { index: false } };

export default async function ProfileOverviewPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/prihlasenie");

  const supabase = await createClient();

  const [listingsResult, favoritesResult, searchesResult] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase
      .from("saved_searches")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id),
  ]);

  const stats = [
    {
      label: "Moje inzeráty",
      value: listingsResult.count ?? 0,
      href: "/profil/inzeraty",
      icon: Package,
    },
    { label: "Obľúbené", value: favoritesResult.count ?? 0, href: "/profil/oblubene", icon: Star },
    {
      label: "Uložené vyhľadávania",
      value: searchesResult.count ?? 0,
      href: "/profil/ulozene-vyhladavania",
      icon: Search,
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-900">Prehľad účtu</h1>
      <p className="mt-1 text-sm text-ink-500">
        Vitajte, {profile.full_name ?? "používateľ"}. Tu je prehľad vašej aktivity.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-ink-200 bg-white p-5 transition-colors hover:border-brand-400"
          >
            <s.icon className="h-5 w-5 text-brand-600" />
            <p className="mt-3 text-2xl font-bold text-ink-900">{s.value}</p>
            <p className="text-sm text-ink-500">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-ink-200 bg-white p-5">
        <h2 className="text-sm font-bold text-ink-900">Rýchle akcie</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/pridat-inzerat"
            className="rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-600"
          >
            Pridať inzerát
          </Link>
          <Link
            href="/profil/spravy"
            className="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-800 hover:border-brand-400"
          >
            Prejsť na správy
          </Link>
          <Link
            href="/inzeraty"
            className="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-800 hover:border-brand-400"
          >
            Prezerať inzeráty
          </Link>
        </div>
      </div>
    </div>
  );
}
