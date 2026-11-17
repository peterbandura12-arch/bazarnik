import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "O nás",
  description:
    "Bazárnik je moderná slovenská inzertná platforma, ktorá spája vlastné inzeráty používateľov a overené externé ponuky na jednom mieste.",
};

export default function ONasPage() {
  return (
    <div className="container-page py-10">
      <PageHeader
        title="O nás"
        description="Bazárnik je moderná slovenská inzertná platforma vytvorená pre všetkých, ktorí chcú jednoducho predávať, kupovať a prehliadať ponuky na jednom mieste."
      />
      <div className="prose-custom mt-8 space-y-6 text-ink-700">
        <section>
          <h2 className="text-xl font-semibold text-ink-900">Naša misia</h2>
          <p>
            Chceme ponúknuť prehľadný a dôveryhodný bazár, v ktorom používatelia
            pridávajú vlastné inzeráty a zároveň vidia overené ponuky z externých
            inzertných portálov. Každý externý inzerát je jasne označený zdrojom
            a odkazuje na pôvodnú ponuku.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-ink-900">Čo robíme inak</h2>
          <ul className="list-disc pl-6">
            <li>Jednotný katalóg vlastných aj externých inzerátov s jasným označením pôvodu.</li>
            <li>Rozsiahly systém kategórií od elektroniky až po reality.</li>
            <li>Interný chat medzi používateľmi v reálnom čase.</li>
            <li>Obľúbené položky, uložené vyhľadávania a notifikácie.</li>
            <li>Transparentnosť – nikdy neprezentujeme externé ani ukážkové dáta ako vlastné ponuky.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-ink-900">Dôveryhodnosť</h2>
          <p>
            Dbáme na bezpečnosť účtov, ochranu osobných údajov a možnosť nahlásiť
            podozrivý inzerát. Obsah moderujeme a každý používateľ môže kedykoľvek
            požiadať o odstránenie svojho účtu a údajov.
          </p>
        </section>
      </div>
    </div>
  );
}
