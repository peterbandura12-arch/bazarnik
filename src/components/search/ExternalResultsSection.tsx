import { ExternalLink } from "lucide-react";
import type { ExternalResult } from "@/lib/meta-search";

/**
 * Sekcia vysledkov z externych inzertnych portalov (bazar.sk, Aukro, Vinted…).
 * Zobrazuje sa pod lokalnymi vysledkami vyhladavania; klik ide na povodny portal.
 */
export function ExternalResultsSection({ items }: { items: ExternalResult[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <div aria-hidden className="mb-4 h-1 w-16 rounded-full bg-gradient-to-r from-brand-500 via-violet-400 to-accent-400" />
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <h2 className="animate-gradient-x bg-gradient-to-r from-brand-700 via-violet-600 to-accent-600 bg-clip-text text-lg font-extrabold text-transparent sm:text-xl">
          Nájdené aj na iných portáloch
        </h2>
        <p className="hidden text-xs text-ink-400 sm:block">
          Kliknutie prevedie na pôvodnú ponuku
        </p>
      </div>
      <p className="mb-4 text-sm text-ink-500">
        Ponuky z bazar.sk, Aukra, Vintedu a ďalších portálov – zobrazujeme ich cez oficiálne
        vyhľadávanie.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <a
            key={item.link}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group flex gap-3 overflow-hidden rounded-2xl border-2 border-brand-300/50 bg-white p-3 shadow-sm shadow-brand-200/30 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500 hover:shadow-lg hover:shadow-brand-200/40"
          >
            {item.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnail}
                alt=""
                loading="lazy"
                className="h-20 w-20 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 text-ink-300">
                <ExternalLink className="h-6 w-6" aria-hidden />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="w-fit rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-100">
                  {item.displayLink.replace(/^www\./, "")}
                </span>
              </span>
              <span className="mt-1 line-clamp-2 block text-sm font-semibold leading-snug text-ink-900 transition-colors group-hover:text-brand-700">
                {item.title}
              </span>
              <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-ink-500">
                {item.snippet}
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
