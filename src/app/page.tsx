import Link from "next/link";
import { ArrowRight, Dog, Sparkles } from "lucide-react";
import { SearchBar } from "@/components/layout/SearchBar";
import { ListingCard } from "@/components/listings/ListingCard";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CATEGORY_EMOJI, CATEGORY_TREE } from "@/lib/categories";
import { getLatestListings, getCategoryCounts, searchListings } from "@/lib/listings";
import { getCurrentProfile, isSupabaseConfigured } from "@/lib/supabase/server";

const POPULAR_SEARCHES = [
  "iPhone 13",
  "PlayStation 5",
  "Škoda Octavia",
  "MacBook Air M1",
  "Horský bicykel",
];

const TILE_BG_CLASSES = [
  "bg-brand-50",
  "bg-violet-50",
  "bg-sky-50",
  "bg-accent-50",
  "bg-emerald-50",
  "bg-rose-50",
  "bg-amber-50",
  "bg-indigo-50",
  "bg-teal-50",
  "bg-orange-50",
  "bg-cyan-50",
  "bg-fuchsia-50",
];

function formatCount(count: number): string {
  return count.toLocaleString("sk-SK");
}

function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-ink-900 sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
        >
          {linkLabel ?? "Zobraziť všetko"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const profile = isSupabaseConfigured() ? await getCurrentProfile() : null;
  const isLoggedIn = Boolean(profile);

  const [latest, deals, categoryCounts] = await Promise.all([
    getLatestListings(8),
    searchListings({ sort: "cena_vzostupne", perPage: 4 }),
    getCategoryCounts(),
  ]);

  return (
    <div className="pb-16">
      {/* Hero s vyhľadávaním */}
      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="container-page py-12 text-center sm:py-16">
          <Badge tone="brand" className="mb-5">
            <Sparkles className="h-3 w-3" /> Bazoš · Bazar.sk · Vinted · jedno hľadanie
          </Badge>
          <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            Všetky slovenské bazáre. <span className="text-brand-600">Jedno hľadanie.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-ink-600 sm:text-base">
            Prehľadávame Bazoš, Bazar.sk, Vinted aj autobazáre naraz. Porovnáme ceny a ukážeme ti
            len to, čo je naozaj výhodné.
          </p>
          <div className="mx-auto mt-7 max-w-2xl">
            <SearchBar />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-ink-400">Populárne:</span>
            {POPULAR_SEARCHES.map((term) => (
              <Link
                key={term}
                href={`/inzeraty?q=${encodeURIComponent(term)}`}
                className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Čo hľadáš? – kategórie */}
      <section className="container-page pt-10">
        <SectionHeader
          title="Čo hľadáš?"
          subtitle="Vyber kategóriu a pozri si ponuky zo všetkých zdrojov"
          href="/inzeraty"
          linkLabel="Všetky inzeráty"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {CATEGORY_TREE.map((cat, index) => (
            <Link
              key={cat.slug}
              href={`/inzeraty?category=${cat.slug}`}
              className="group flex flex-col items-center gap-2 rounded-xl border border-ink-200 bg-white p-5 text-center transition-colors hover:border-brand-400 hover:shadow-sm"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-transform group-hover:scale-110 ${
                  TILE_BG_CLASSES[index % TILE_BG_CLASSES.length]
                }`}
                aria-hidden
              >
                {CATEGORY_EMOJI[cat.slug] ?? "📦"}
              </span>
              <span className="text-sm font-medium text-ink-800 group-hover:text-brand-700">
                {cat.name}
              </span>
              {categoryCounts[cat.slug] !== undefined && (
                <span className="text-xs text-ink-400">
                  {formatCount(categoryCounts[cat.slug] ?? 0)} inzerátov
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Najlepšie ceny dnes */}
      {deals.items.length > 0 && (
        <section className="container-page pt-12">
          <SectionHeader
            title="Najlepšie ceny dnes"
            subtitle="Ponuky, ktorých cena je výrazne pod mediánom podobných inzerátov"
            href="/inzeraty?sort=cena_vzostupne"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {deals.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        </section>
      )}

      {/* Čerstvo pridané */}
      <section className="container-page pt-12">
        <SectionHeader
          title="Čerstvo pridané"
          subtitle="Najnovšie inzeráty zo všetkých zdrojov"
          href="/inzeraty?sort=najnovsie"
        />
        {latest.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {latest.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
            Zatiaľ nie sú žiadne inzeráty. Buďte prvý, kto pridá svoju ponuku.
          </p>
        )}
      </section>

      {/* Strážny pes */}
      <section className="container-page pt-12">
        <div className="overflow-hidden rounded-2xl bg-ink-900 px-6 py-10 text-center sm:px-12">
          <span className="flex mx-auto h-14 w-14 items-center justify-center rounded-2xl bg-ink-800 text-3xl" aria-hidden>
            <Dog className="h-7 w-7 text-brand-300" />
          </span>
          <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">Strážny pes</h2>
          <p className="mt-2 text-sm font-medium text-brand-300 sm:text-base">
            Nehľadaj. Nechaj psa, nech strieha novinky.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-ink-300">
            Ulož si hľadanie a maximálnu cenu. Keď sa objaví nový inzerát, pošleme ti e-mail.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/profil/ulozene-vyhladavania" variant="accent" size="lg">
              Vytvoriť strážneho psa
            </ButtonLink>
          </div>
          <p className="mt-3 text-xs text-ink-400">Zadarmo až 3 strážne psy</p>
        </div>
      </section>
    </div>
  );
}
