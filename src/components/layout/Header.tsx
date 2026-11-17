import Link from "next/link";
import { Bell, Heart, MessageCircle, Plus, UserRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SearchBar } from "@/components/layout/SearchBar";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { MobileNav } from "@/components/layout/MobileNav";
import { UserMenu } from "@/components/layout/UserMenu";
import { ButtonLink } from "@/components/ui/Button";
import { getCurrentProfile, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

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
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 backdrop-blur">
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

        <div className="flex items-center gap-2 pb-2 md:hidden">
          <SearchBar />
        </div>

        <nav className="hidden items-center gap-1 pb-1 lg:flex" aria-label="Hlavná navigácia">
          <MegaMenu />
          <Link href="/inzeraty" className="rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-100">
            Všetky inzeráty
          </Link>
          <Link href="/inzeraty?source=external" className="rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-100">
            Externé ponuky
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
