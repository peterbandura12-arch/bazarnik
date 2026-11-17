import Link from "next/link";
import { ArrowRight, Megaphone, Plus, ShieldCheck, Sparkles, Tag, Zap } from "lucide-react";
import { SearchBar } from "@/components/layout/SearchBar";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ListingCard } from "@/components/listings/ListingCard";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CATEGORY_TREE } from "@/lib/categories";
import { getLatestListings, getExternalListings, searchListings } from "@/lib/listings";
import { getCurrentProfile, isSupabaseConfigured } from "@/lib/supabase/server";

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

  const [latest, external, deals] = await Promise.all([
    getLatestListings(8),
    getExternalListings(4),
    searchListings({ sort: "cena_vzostupne", perPage: 4 }),
  ]);

  return (
    <div className="pb-16">
      {/* Hero s vyhľadávaním */}
      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="container-page py-10 text-center sm:py-14">
          <Badge tone="brand" className="mb-4">
            <Sparkles className="h-3 w-3" /> Inzeráty aj externé ponuky na jednom mieste
          </Badge>
          <h1 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Kúpte a predajte ľahko na <span className="text-brand-600">Bazárniku</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-ink-600 sm:text-base">
            Inzerovanie zdarma. Prehľadné kategórie, pokročilé filtre a ponuky z viacerých
            zdrojov – to všetko v jednom portáli.
          </p>
          <div className="mx-auto mt-6 max-w-2xl">
            <SearchBar />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/pridat-inzerat" variant="accent" size="lg">
              <Plus className="h-5 w-5" /> Pridať inzerát zdarma
            </ButtonLink>
            <ButtonLink href="/inzeraty" variant="outline" size="lg">
              Prezerať inzeráty
            </ButtonLink>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-brand-600" /> Overená komunita
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-brand-600" /> Rýchle zverejnenie
            </span>
            <span className="flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-brand-600" /> Inzerovanie zdarma
            </span>
          </div>
        </div>
      </section>

      {/* Hlavné kategórie */}
      <section className="container-page pt-10">
        <SectionHeader
          title="Hlavné kategórie"
          subtitle="Vyberte si z rozsiahleho katalógu kategórií a podkategórií"
          href="/inzeraty"
          linkLabel="Všetky inzeráty"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {CATEGORY_TREE.map((cat) => (
            <Link
              key={cat.slug}
              href={`/inzeraty?category=${cat.slug}`}
              className="group flex flex-col items-center gap-2 rounded-xl border border-ink-200 bg-white p-4 text-center transition-colors hover:border-brand-400 hover:shadow-sm"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                <CategoryIcon slug={cat.slug} className="h-6 w-6" />
              </span>
              <span className="text-sm font-medium text-ink-800 group-hover:text-brand-700">
                {cat.name}
              </span>
              <span className="text-xs text-ink-400">
                {cat.children.length} podkategórií
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Najnovšie inzeráty */}
      <section className="container-page pt-12">
        <SectionHeader
          title="Najnovšie inzeráty"
          subtitle="Čerstvo pridané ponuky od používateľov Bazárniku"
          href="/inzeraty"
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

      {/* Výhodné ponuky */}
      {deals.items.length > 0 && (
        <section className="container-page pt-12">
          <SectionHeader
            title="Výhodné ponuky"
            subtitle="Najnižšie ceny z aktuálnych inzerátov"
            href="/inzeraty?sort=cena_vzostupne"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {deals.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        </section>
      )}

      {/* Externé inzeráty */}
      <section className="container-page pt-12">
        <SectionHeader
          title="Externé ponuky"
          subtitle="Inzeráty z iných inzertných portálov – vždy s odkazom na pôvodnú ponuku"
          href="/inzeraty?source=external"
        />
        {external.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {external.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-ink-200 bg-white p-8 text-center">
            <Megaphone className="mx-auto mb-3 h-8 w-8 text-ink-300" />
            <p className="text-sm font-medium text-ink-700">Externé zdroje ešte nie sú pripojené</p>
            <p className="mx-auto mt-1 max-w-lg text-sm text-ink-500">
              Architektúra adaptérov je pripravená. Po pripojení oficiálneho API alebo
              partner feedu sa tu zobrazia externé ponuky, vždy jasne označené zdrojom.
            </p>
          </div>
        )}
      </section>

      {/* Výzva na pridanie inzerátu */}
      <section className="container-page pt-12">
        <div className="overflow-hidden rounded-2xl bg-brand-700 px-6 py-10 text-center sm:px-12">
          <h2 className="text-2xl font-bold text-white">Máte niečo, čo už nepotrebujete?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-brand-100 sm:text-base">
            Pridajte inzerát za pár minút. Fotografia, cena, popis – a vaša ponuka sa zobrazí
            tisícom návštevníkov.
          </p>
          <ButtonLink href="/pridat-inzerat" variant="accent" size="lg" className="mt-6">
            <Plus className="h-5 w-5" /> Pridať inzerát
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
