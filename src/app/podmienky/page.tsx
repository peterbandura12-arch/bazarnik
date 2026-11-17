import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "Podmienky používania",
  description:
    "Podmienky používania platformy Bazárnik – pravidlá inzerovania, účty a zodpovednosť.",
};

export default function PodmienkyPage() {
  return (
    <div className="container-page py-10">
      <PageHeader
        title="Podmienky používania"
        description="Nasledujúce podmienky upravujú používanie platformy Bazárnik."
      />
      <div className="mt-8 space-y-6 text-ink-700">
        <section>
          <h2 className="text-xl font-semibold text-ink-900">1. Všeobecné ustanovenia</h2>
          <p>
            Platforma Bazárnik slúži na zverejňovanie vlastných inzerátov
            používateľmi a na prehliadanie externých ponúk získaných z povolených
            zdrojov. Prevádzkovateľ nie je stranou obchodov medzi používateľmi
            a nezodpovedá za obsah inzerátov vytvorených používateľmi.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-ink-900">2. Používateľský účet</h2>
          <p>
            Účet si môže vytvoriť každá osoba s platnou e-mailovou adresou.
            Používateľ je zodpovedný za ochranu svojich prihlasovacích údajov
            a za činnosť vykonanú pod svojím účtom. Účet nesmie byť používaný
            na podvodné, nelegálne alebo obťažujúce aktivity.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-ink-900">3. Pravidlá inzerovania</h2>
          <ul className="list-disc pl-6">
            <li>Inzerát musí obsahovať pravdivé informácie a vlastné fotografie alebo fotografie s povolením na použitie.</li>
            <li>Zakázané je inzerovanie nelegálneho tovaru a služieb, falzifikátov a nebezpečných predmetov.</li>
            <li>Jeden predmet patrí do jednej kategórie; opakované duplicitné inzeráty môžu byť odstránené.</li>
            <li>Prevádzkovateľ môže inzerát, ktorý porušuje pravidlá, odstrániť a účet obmedziť.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-ink-900">4. Externé inzeráty</h2>
          <p>
            Externé ponuky pochádzajú z oficiálnych API alebo partnerských feedov
            tretích strán. Za ich obsah zodpovedá pôvodný portál. Externé inzeráty
            sú vždy označené zdrojom a obsahujú odkaz na pôvodnú ponuku.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-ink-900">5. Obmedzenie zodpovednosti</h2>
          <p>
            Prevádzkovateľ nezodpovedá za škody vzniknuté v dôsledku obchodov
            uzatvorených medzi používateľmi ani za dočasnú nedostupnosť služby.
            Tieto podmienky sú všeobecný rámec a pred spustením produkčnej
            prevádzky je potrebné ich právne overenie pre konkrétnu prevádzkovateľskú entitu.
          </p>
        </section>
      </div>
    </div>
  );
}
