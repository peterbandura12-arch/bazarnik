import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "Ochrana osobných údajov",
  description:
    "Zásady spracovania osobných údajov platformy Bazárnik podľa nariadenia GDPR.",
};

export default function OchranaOsobnychUdajovPage() {
  return (
    <div className="container-page py-10">
      <PageHeader
        title="Ochrana osobných údajov"
        description="Informácie o spracovaní osobných údajov na platforme Bazárnik."
      />
      <div className="mt-8 space-y-6 text-ink-700">
        <section>
          <h2 className="text-xl font-semibold text-ink-900">1. Rozsah spracovávaných údajov</h2>
          <p>
            Pri registrácii spracúvame e-mailovú adresu a meno používateľa.
            V súvislosti s inzerátmi spracúvame názov, opis, cenu, lokalitu
            a fotografie nahrané používateľom. V rámci chatu spracúvame obsah
            správ medzi používateľmi.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-ink-900">2. Účel a právny základ</h2>
          <ul className="list-disc pl-6">
            <li>Poskytovanie služby platformy – plnenie zmluvy.</li>
            <li>Notifikácie a e-maily podľa nastavení – oprávnený záujem alebo súhlas.</li>
            <li>Bezpečnosť a boj proti zneužitiu – oprávnený záujem.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-ink-900">3. Práva používateľa</h2>
          <p>
            Máte právo na prístup k údajom, ich opravu, vymazanie, obmedzenie
            spracovania a prenositeľnosť. Účet vrátane osobných údajov môžete
            odstrániť priamo v Nastaveniach účtu. Žiadosti môžete smerovať aj
            na kontaktnú e-mailovú adresu uvedenú na stránke Kontakt.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-ink-900">4. Uchovávanie a zabezpečenie</h2>
          <p>
            Údaje uchovávame po dobu aktivity účtu. Databáza je chránená
            pravidlami Row Level Security, prístup k údajom majú iba vlastníci
            záznamov a autorizovaní administrátori.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-ink-900">5. Upozornenie</h2>
          <p>
            Tento dokument je východiskový návrh. Pred produkčným spustením je
            potrebné ho doladiť s právnym špecialistom podľa konkrétnej
            prevádzkovateľskej entity, serverového umiestnenia a zoznamu
            spracovateľov (Supabase, e-mailová služba a ďalší).
          </p>
        </section>
      </div>
    </div>
  );
}
