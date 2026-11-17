import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Users, Package, Flag, Rss, LayoutDashboard } from "lucide-react";
import { getCurrentProfile, isSupabaseConfigured } from "@/lib/supabase/server";

const NAV = [
  { href: "/admin", label: "Štatistiky", icon: LayoutDashboard },
  { href: "/admin/pouzivatelia", label: "Používatelia", icon: Users },
  { href: "/admin/inzeraty", label: "Inzeráty", icon: Package },
  { href: "/admin/nahlasenia", label: "Nahlásenia", icon: Flag },
  { href: "/admin/zdroje", label: "Externé zdroje", icon: Rss },
];

export const metadata = { title: "Administrácia", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-xl font-bold">Administrácia nie je dostupná</h1>
        <p className="mt-2 text-sm text-ink-500">Vyžaduje pripojenú databázu Supabase.</p>
      </div>
    );
  }

  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "admin" || profile.is_blocked) {
    redirect("/prihlasenie?next=/admin");
  }

  return (
    <div className="container-page py-6">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-brand-600" />
        <h1 className="text-xl font-bold text-ink-900">Administrácia Bazárnika</h1>
      </div>
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-ink-200 bg-white p-2" aria-label="Navigácia administrácie">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 hover:text-brand-700"
          >
            <item.icon className="h-4 w-4 text-ink-400" />
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
