import Link from "next/link";
import { Bell, Heart, MessageCircle, Plus, UserRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SearchBar } from "@/components/layout/SearchBar";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { MobileNav } from "@/components/layout/MobileNav";
import { UserMenu } from "@/components/layout/UserMenu";
import { ButtonLink } from "@/components/ui/Button";
import { getCurrentProfile, isSupabaseConfigured } from "@/lib/supabase/server";
import { CATEGORY_EMOJI, CATEGORY_TREE } from "@/lib/categories";
import type { Profile } from "@/types/database";

/** Pastelove farby chips kategorii v hlavicki. */
const HEADER_CHIP_STYLES = [
  "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100",
  "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
  "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
  "border-accent-200 bg-accent-50 text-accent-700 hover:bg-accent-100",
  "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
  "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100",
  "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
  "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100",
  "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100",
];

export async function Header() {
  let profile: Profile | null = null;
  if (isSupabaseConfigured()) {
    try {
      profile = await getCurrentProfile();
    } catch {
      profile = null;
    }
  }

  const isLoggedIn = Boolean(profile);
  const isAdmin = profile?.role === "admin";

  return (
    <header className="relative border-b border-ink-200 bg-white/95 backdrop-blur transition-all duration-300">
      <div className="container-page">
        <div className="flex h-16 items-center gap-3">
          <MobileNav isLoggedIn={isLoggedIn} isAdmin={isAdmin} />
          <Logo />
          <div className="hidden flex-1 md:block">
            <SearchBar />
          </div>
          <div className="ml-auto flex items-center gap-1">
            {isLoggedIn ? (
              <>
                <Link
                  href="/profil/oblubene"
                  aria-label="Obľúbené inzeráty"
                  className="hidden h-10 w-10 items-center justify-center rounded-lg text-ink-700 hover:bg-ink-100 sm:flex"
                >
                  <Heart className="h-5 w-5" />
                </Link>
                <Link
                  href="/profil/spravy"
                  aria-label="Správy"
                  className="hidden h-10 w-10 items-center justify-center rounded-lg text-ink-700 hover:bg-ink-100 sm:flex"
                >
                  <MessageCircle className="h-5 w-5" />
                </Link>
                <Link
                  href="/profil/notifikacie"
                  aria-label="Notifikácie"
                  className="hidden h-10 w-10 items-center justify-center rounded-lg text-ink-700 hover:bg-ink-100 sm:flex"
                >
                  <Bell className="h-5 w-5" />
                </Link>
                <UserMenu name={profile?.full_name ?? profile?.email ?? "Používateľ"} isAdmin={isAdmin} />
              </>
            ) : (
              <div className="hidden items-center gap-2 lg:flex">
                <ButtonLink href="/prihlasenie" variant="ghost" size="sm">
                  Prihlásenie
                </ButtonLink>
                <ButtonLink href="/registracia" variant="outline" size="sm">
                  Registrácia
                </ButtonLink>
              </div>
            )}
            <ButtonLink href="/pridat-inzerat" variant="accent" size="sm" className="ml-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Pridať inzerát</span>
            </ButtonLink>
          </div>
        </div>

        <div className="border-t border-ink-100">
          <div className="flex gap-1.5 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORY_TREE.map((cat, index) => (
              <Link
                key={cat.slug}
                href={`/inzeraty?category=${cat.slug}`}
                prefetch
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 ${HEADER_CHIP_STYLES[index % HEADER_CHIP_STYLES.length]}`}
              >
                <span aria-hidden>{CATEGORY_EMOJI[cat.slug] ?? "📦"}</span>
                {cat.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pb-2 md:hidden">
          <SearchBar />
        </div>

        <nav className="hidden items-center gap-1 pb-1 lg:flex" aria-label="Hlavná navigácia">
          <MegaMenu />
          <Link href="/inzeraty" className="rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-100">
            Všetky inzeráty
          </Link>
          <Link href="/externe-vyhladavanie" className="rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-100">
            Hľadať na portáloch
          </Link>
          {!isLoggedIn && (
            <Link
              href="/profil/oblubene"
              className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-100"
            >
              <Heart className="h-4 w-4" /> Obľúbené
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
