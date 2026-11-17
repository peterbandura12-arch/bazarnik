import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Heart,
  LayoutDashboard,
  MessageCircle,
  Package,
  Search,
  Settings,
} from "lucide-react";
import { getCurrentProfile, isSupabaseConfigured } from "@/lib/supabase/server";

const NAV = [
  { href: "/profil", label: "Prehľad účtu", icon: LayoutDashboard },
  { href: "/profil/inzeraty", label: "Moje inzeráty", icon: Package },
  { href: "/profil/spravy", label: "Moje správy", icon: MessageCircle },
  { href: "/profil/oblubene", label: "Obľúbené", icon: Heart },
  { href: "/profil/ulozene-vyhladavania", label: "Uložené vyhľadávania", icon: Search },
  { href: "/profil/notifikacie", label: "Notifikácie", icon: Bell },
  { href: "/profil/nastavenia", label: "Nastavenia účtu", icon: Settings },
];

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-xl font-bold">Databáza nie je pripojená</h1>
        <p className="mt-2 text-sm text-ink-500">
          Používateľská zóna vyžaduje pripojenú databázu Supabase.
        </p>
      </div>
    );
  }

  const profile = await getCurrentProfile();
  if (!profile) redirect("/prihlasenie?next=/profil");

  return (
    <div className="container-page flex flex-col gap-6 py-6 lg:flex-row">
      <aside className="lg:w-64 lg:shrink-0">
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-sm font-bold text-ink-900">{profile.full_name ?? profile.email}</p>
          <p className="truncate text-xs text-ink-500">{profile.email}</p>
        </div>
        <nav
          className="mt-3 flex gap-1 overflow-x-auto rounded-xl border border-ink-200 bg-white p-2 lg:flex-col"
          aria-label="Navigácia profilu"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50 hover:text-brand-700"
            >
              <item.icon className="h-4 w-4 shrink-0 text-ink-400" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
