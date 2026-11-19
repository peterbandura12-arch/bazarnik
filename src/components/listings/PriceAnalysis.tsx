import { BarChart3 } from "lucide-react";
import type { PriceStats } from "@/lib/price-analysis";
import { formatPrice } from "@/lib/utils";

const fmt = (v: number | null) => (v == null ? "–" : formatPrice(Math.round(v), "EUR"));

export function PriceAnalysis({ stats }: { stats: PriceStats }) {
  if (stats.count < 3) return null;

  const maxCount = Math.max(...stats.buckets.map((b) => b.count), 1);

  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-ink-200 bg-white">
      <header className="flex items-center gap-2 border-b border-ink-100 bg-ink-50/60 px-4 py-2.5">
        <BarChart3 className="h-4 w-4 text-brand-600" aria-hidden />
        <h2 className="text-sm font-bold text-ink-900">Analýza cien</h2>
        <span className="ml-auto text-xs text-ink-400">{stats.count} inzerátov s cenou</span>
      </header>

      <div className="grid grid-cols-2 gap-px bg-ink-100 sm:grid-cols-4">
        {[
          { label: "Priemer", value: fmt(stats.average) },
          { label: "Medián", value: fmt(stats.median) },
          { label: "Najnižšia", value: fmt(stats.min) },
          { label: "Najvyššia", value: fmt(stats.max) },
        ].map((tile) => (
          <div key={tile.label} className="bg-white px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{tile.label}</p>
            <p className="mt-0.5 text-lg font-bold text-ink-900">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4 pt-3">
        <div className="flex h-28 items-end gap-1.5" role="img" aria-label="Histogram cien">
          {stats.buckets.map((b, i) => (
            <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
              <span className="mb-1 text-center text-[10px] font-semibold text-ink-500">
                {b.count > 0 ? b.count : ""}
              </span>
              <div
                className="rounded-t-md bg-gradient-to-t from-brand-500 to-brand-400 transition-all hover:from-brand-600 hover:to-brand-500"
                style={{
                  height: `${b.count === 0 ? 2 : Math.max(6, (b.count / maxCount) * 100)}%`,
                  display: b.count === 0 ? "opacity-40" : undefined,
                  opacity: b.count === 0 ? 0.25 : 1,
                }}
              />
              <span className="mt-1 truncate text-center text-[9px] leading-tight text-ink-400">
                {Math.round(b.from)}
              </span>
            </div>
          ))}
        </div>
        {stats.min != null && stats.max != null && (
          <p className="mt-1.5 text-center text-[11px] text-ink-400">
            Rozpätie cien: {fmt(stats.min)} – {fmt(stats.max)}
            {stats.percentiles.p25 != null && stats.percentiles.p75 != null && (
              <span className="ml-2 hidden sm:inline">
                · stredných 50 %: {fmt(stats.percentiles.p25)} – {fmt(stats.percentiles.p75)}
              </span>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
