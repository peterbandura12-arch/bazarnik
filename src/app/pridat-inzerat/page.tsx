import type { Metadata } from "next";
import Link from "next/link";
import { Database, LogIn } from "lucide-react";
import { AddListingWizard } from "@/components/listings/AddListingWizard";
import { ButtonLink } from "@/components/ui/Button";
import { getCurrentProfile, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pridať inzerát",
  description: "Pridajte vlastný inzerát na Bazárnik zdarma – za pár minút.",
  robots: { index: false },
};

export default async function AddListingPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page flex justify-center py-16">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Database className="mx-auto mb-3 h-10 w-10 text-amber-600" />
          <h1 className="text-lg font-bold text-amber-900">Databáza nie je pripojená</h1>
          <p className="mt-2 text-sm text-amber-800">
            Pridávanie inzerátov vyžaduje pripojenú databázu Supabase. Dopĺňte prihlasovacie
            údaje do <code>.env.local</code> podľa <code>.env.example</code> a spustite SQL
            skripty z priečinka <code>supabase/</code>.
          </p>
        </div>
      </div>
    );
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <div className="container-page flex justify-center py-16">
        <div className="max-w-md rounded-2xl border border-ink-200 bg-white p-8 text-center">
          <LogIn className="mx-auto mb-3 h-10 w-10 text-brand-600" />
          <h1 className="text-lg font-bold text-ink-900">Prihláste sa pre pridanie inzerátu</h1>
          <p className="mt-2 text-sm text-ink-500">
            Inzeráty môžu pridávať len registrovaní používatelia. Registrácia je zdarma
            a trvá menej ako minútu.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <ButtonLink href="/prihlasenie?next=/pridat-inzerat">Prihlásiť sa</ButtonLink>
            <ButtonLink href="/registracia" variant="outline">
              Registrácia
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="mb-1 text-center text-2xl font-bold text-ink-900">Pridať inzerát</h1>
      <p className="mb-8 text-center text-sm text-ink-500">
        Vyplňte päť jednoduchých krokov. Inzerát môžete kedykoľvek neskôr upraviť.
      </p>
      <AddListingWizard userEmail={profile.email} />
      <p className="mt-6 text-center text-sm text-ink-500">
        Rozmýšľate nad cenou?{" "}
        <Link href="/pomoc" className="text-brand-600 hover:underline">
          Prečítajte si tipy v sekcii Pomoc
        </Link>
        .
      </p>
    </div>
  );
}
