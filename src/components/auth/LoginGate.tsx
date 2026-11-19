import Link from "next/link";
import { LockKeyhole, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Prihlasovacia brana – zobrazuje sa neprihlasenym navstevnikom namiesto
 * celeho obsahu inzeratu (alebo inych chranenych sekcií).
 */
export function LoginGate({
  next,
  teaser,
}: {
  next?: string;
  teaser?: { title: string; price: string; imageUrl?: string | null } | null;
}) {
  const withNext = (href: string) => (next ? `${href}?next=${encodeURIComponent(next)}` : href);

  return (
    <div className="relative mt-4 overflow-hidden rounded-2xl border-2 border-brand-300/70 bg-white shadow-xl shadow-brand-200/40">
      <div aria-hidden className="h-1 bg-gradient-to-r from-brand-500 via-violet-400 to-accent-400" />

      <div className="grid items-stretch gap-0 sm:grid-cols-2">
        {teaser && (
          <div className="relative min-h-44 overflow-hidden bg-ink-100">
            {teaser.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={teaser.imageUrl}
                alt=""
                aria-hidden
                className="h-full w-full scale-110 object-cover opacity-60 blur-sm"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-brand-50 to-accent-50" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-900/20 backdrop-blur-[2px]">
              <span
                aria-hidden
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-lg"
              >
                <LockKeyhole className="h-7 w-7" />
              </span>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-white drop-shadow">
                {teaser.price}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col justify-center p-6 sm:p-8">
          <h2 className="text-lg font-bold text-ink-900 sm:text-xl">
            Tento inzerát je len pre prihlásených
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Prihláste sa alebo si zdarma vytvorte účet – uvidíte celý inzerát, detaily,
            obľúbené aj AI asistenta. Trvá to len minútu.
          </p>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <ButtonLink href={withNext("/prihlasenie")} variant="primary" size="lg" className="flex-1">
              Prihlásiť sa
            </ButtonLink>
            <ButtonLink
              href={withNext("/registracia")}
              className="flex-1 bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-md shadow-brand-600/25 transition-all hover:from-brand-500 hover:to-violet-500 active:scale-95"
              size="lg"
            >
              Zaregistrovať sa
            </ButtonLink>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
            <Sparkles className="h-3.5 w-3.5 text-accent-500" />
            Registrácia je zdarma · bez záväzkov · po prihlásení sa vrátite späť na inzerát
          </p>

          <Link
            href="/inzeraty"
            className="mt-2 w-fit text-xs font-medium text-ink-500 hover:text-brand-700 hover:underline"
          >
            Zatiaľ len prehliadať inzeráty →
          </Link>
        </div>
      </div>
    </div>
  );
}
