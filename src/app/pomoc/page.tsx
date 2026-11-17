import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";

const FAQ = [
  {
    q: "Musím mať účet na prehliadanie inzerátov?",
    a: "Nie. Inzeráty môžete prehliadať a vyhľadávať bez registrácie. Účet je potrebný na pridávanie inzerátov, písanie správ a ukladanie obľúbených položiek.",
  },
  {
    q: "Ako pridám vlastný inzerát?",
    a: "Po prihlásení kliknite na výrazné tlačidlo „Pridať inzerát“ a prejdite päťkrokovým sprievodcom: kategória, informácie, fotografie, kontakt a kontrola.",
  },
  {
    q: "Čo sú externé inzeráty?",
    a: "Sú to ponuky z iných inzertných portálov, ktoré získavame výhradne z povolených zdrojov – oficiálnych API alebo partnerských feedov. Každý externý inzerát je označený zdrojom a obsahuje odkaz na pôvodnú ponuku.",
  },
  {
    q: "Prečo nevidím u externého inzerátu interný chat?",
    a: "Komunikácia vonkajších predávajúcich prebieha na pôvodnom portáli. Z detailu externého inzerátu preto prejdete priamo na pôvodnú ponuku.",
  },
  {
    q: "Ako fungujú uložené vyhľadávania?",
    a: "V sekcii Uložené vyhľadávania si môžete pomenovať aktuálnu kombináciu filtrov a zapnúť si notifikácie na nové zodpovedajúce inzeráty.",
  },
  {
    q: "Ako nahlásim podozrivý inzerát?",
    a: "V detaile každého inzerátu je tlačidlo „Nahlásiť“. Nahlásenie prejde priamo k moderátorom platformy.",
  },
  {
    q: "Ako si zmazem účet a údaje?",
    a: "V Nastaveniach účtu nájdete možnosť odstránenia účtu vrátane osobných údajov podľa pravidiel GDPR.",
  },
];

export const metadata: Metadata = {
  title: "Pomoc a FAQ",
  description:
    "Časté otázky k platforme Bazárnik – registrácia, inzeráty, externé ponuky, chat a bezpečnosť.",
};

export default function PomocPage() {
  return (
    <div className="container-page py-10">
      <PageHeader
        title="Pomoc a FAQ"
        description="Odpovede na najčastejšie otázky o používaní Bazárnika."
      />
      <div className="mt-8 space-y-4">
        {FAQ.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-ink-100 bg-white p-5"
          >
            <summary className="cursor-pointer list-none font-semibold text-ink-900 marker:hidden">
              {item.q}
            </summary>
            <p className="mt-3 text-ink-600">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
