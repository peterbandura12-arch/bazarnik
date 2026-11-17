import { FlaskConical } from "lucide-react";

export function DemoBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="container-page flex items-center gap-2 py-2 text-xs text-amber-900">
        <FlaskConical className="h-4 w-4 shrink-0" />
        <span>
          <strong>Ukážkový režim (demo).</strong> Databáza nie je pripojená – zobrazujú sa
          ukážkové inzeráty, ktoré nie sú reálnymi ponukami. Pre plnú funkčnosť doplňte
          prihlasovacie údaje Supabase do <code>.env.local</code> (viď <code>.env.example</code>).
        </span>
      </div>
    </div>
  );
}
