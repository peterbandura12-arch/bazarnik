import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExternalSearchClient } from "@/components/search/ExternalSearchClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hľadanie na inzertných portáloch",
  description:
    "Prehľadajte ponuky z Bazoša, Aukra, Vintedu a ďalších portálov naraz. Kliknutím prejdete na pôvodnú ponuku.",
};

export default function ExterneVyhladavaniePage() {
  const enabled = Boolean(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX);

  return (
    <div className="container-page py-10">
      <PageHeader
        title="Hľadanie na inzertných portáloch"
        description="Zadajte, čo hľadáte, a my vám ukážeme výsledky z najväčších inzertných portálov. Kliknutím na výsledok prejdete priamo na pôvodnú ponuku."
      />
      <ExternalSearchClient enabled={enabled} />
    </div>
  );
}
