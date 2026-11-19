import Link from "next/link";
import { Store } from "lucide-react";
import { CATEGORY_TREE, EXTERNAL_SOURCES } from "@/lib/categories";

const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL;

export function Footer() {
  const topCategories = CATEGORY_TREE.slice(0, 6);

  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-5">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Store className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold tracking-tight">
              Bazár<span className="text-brand-600">nik</span>
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-ink-500">
            Všetky slovenské bazáre na jednom mieste. Porovnaj ceny, nájdi výhodné
            ponuky a nechaj si strážiť novinky.
          </p>
          <div className="mt-4">
            {INSTAGRAM_URL ? (
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:border-brand-400 hover:text-brand-700"
              >
                <InstagramIcon /> Sledujte nás na Instagrame
              </a>
            ) : (
              <span
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-ink-200 px-3 py-2 text-sm text-ink-400"
                title="Odkaz na Instagram bude doplnený po vytvorení profilu"
              >
                <InstagramIcon /> Instagram už čoskoro
              </span>
            )}
          </div>
        </div>

        <nav aria-label="Hlavné kategórie">
          <h3 className="text-sm font-semibold text-ink-900">Hlavné kategórie</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            {topCategories.map((cat) => (
              <li key={cat.slug}>
                <Link href={`/inzeraty?category=${cat.slug}`} className="hover:text-brand-700">
                  {cat.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/inzeraty" className="font-medium text-brand-600 hover:underline">
                Všetky kategórie
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Informácie">
          <h3 className="text-sm font-semibold text-ink-900">Informácie</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li><Link href="/o-nas" className="hover:text-brand-700">O nás</Link></li>
            <li><Link href="/kontakt" className="hover:text-brand-700">Kontakt</Link></li>
            <li><Link href="/pomoc" className="hover:text-brand-700">Pomoc a FAQ</Link></li>
            <li><Link href="/podmienky" className="hover:text-brand-700">Podmienky používania</Link></li>
            <li><Link href="/ochrana-osobnych-udajov" className="hover:text-brand-700">Ochrana osobných údajov</Link></li>
          </ul>
        </nav>

        <nav aria-label="Pre používateľov">
          <h3 className="text-sm font-semibold text-ink-900">Pre používateľov</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li><Link href="/pridat-inzerat" className="hover:text-brand-700">Pridať inzerát</Link></li>
            <li><Link href="/prihlasenie" className="hover:text-brand-700">Prihlásenie</Link></li>
            <li><Link href="/registracia" className="hover:text-brand-700">Registrácia</Link></li>
          </ul>
        </nav>

        <nav aria-label="Prehľadávame tieto zdroje">
          <h3 className="text-sm font-semibold text-ink-900">Prehľadávame tieto zdroje</h3>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-600">
            {EXTERNAL_SOURCES.map((source) => (
              <li key={source.name}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="hover:text-brand-700"
                >
                  {source.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-ink-100 py-5">
        <div className="container-page space-y-1 text-center text-xs text-ink-400">
          <p>© {new Date().getFullYear()} Bazárnik</p>
          <p>Inzeráty patria ich pôvodným zdrojom. Zobrazujeme len náhľad a odkaz na pôvodný inzerát.</p>
        </div>
      </div>
    </footer>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
