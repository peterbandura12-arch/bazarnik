import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kontaktujte tím Bazárnik – otázky k inzerátom, účtu, spolupráci alebo hlásenie problému.",
};

export default function KontaktPage() {
  return (
    <div className="container-page py-10">
      <PageHeader
        title="Kontakt"
        description="Máte otázku, návrh alebo ste našli problém? Ozvite sa nám."
      />
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-ink-900">Všeobecné otázky</h2>
          <p className="mt-2 text-ink-600">
            Pre otázky k platforme, inzerátom alebo účtu nás kontaktujte e-mailom.
          </p>
          <p className="mt-3 font-medium text-brand-700">info@bazarnik.sk</p>
          <p className="mt-1 text-sm text-ink-500">
            Adresa e-mailovej schránky sa doplní po spustení produkčnej domény.
          </p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-ink-900">Nahlásenie problému</h2>
          <p className="mt-2 text-ink-600">
            Podozrivý alebo nevhodný inzerát môžete nahlásiť priamo z jeho detailu
            pomocou tlačidla „Nahlásiť“.
          </p>
          <p className="mt-3 font-medium text-brand-700">podpora@bazarnik.sk</p>
          <p className="mt-1 text-sm text-ink-500">
            Adresa e-mailovej schránky sa doplní po spustení produkčnej domény.
          </p>
        </div>
      </div>
    </div>
  );
}
