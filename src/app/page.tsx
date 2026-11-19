import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { SearchBar } from "@/components/layout/SearchBar";
import { ListingCard } from "@/components/listings/ListingCard";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";
import { OpenChatButton } from "@/components/ui/OpenChatButton";
import { CATEGORY_EMOJI, CATEGORY_TREE } from "@/lib/categories";
import { getCategoryCounts, getPopularListings } from "@/lib/listings";
import { getCurrentProfile, isSupabaseConfigured } from "@/lib/supabase/server";

const POPULAR_SEARCHES = [
  "iPhone 13",
  "PlayStation 5",
  "Škoda Octavia",
  "MacBook Air M1",
  "Horský bicykel",
];

const TILE_GRADIENTS = [
  "from-brand-200/60 via-brand-50/40 to-violet-100/50",
  "from-violet-200/60 via-white to-sky-100/50",
  "from-sky-200/60 via-white to-emerald-100/50",
  "from-accent-200/60 via-white to-rose-100/50",
  "from-emerald-200/60 via-white to-teal-100/50",
  "from-rose-200/60 via-white to-fuchsia-100/50",
  "from-amber-200/60 via-white to-orange-100/50",
  "from-indigo-200/60 via-white to-brand-100/50",
  "from-teal-200/60 via-white to-cyan-100/50",
  "from-orange-200/60 via-white to-amber-100/50",
  "from-cyan-200/60 via-white to-sky-100/50",
  "from-fuchsia-200/60 via-white to-violet-100/50",
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

  const [popular, categoryCounts] = await Promise.all([
    getPopularListings(8),
    getCategoryCounts(),
  ]);

  return (
    <div className="pb-16">
      {/* Hero s vyhľadávaním */}
      <section className="relative overflow-hidden border-b border-ink-200 bg-gradient-to-b from-brand-50 via-white to-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float-slow absolute -left-16 top-4 h-56 w-56 rounded-full bg-brand-300/30 blur-3xl" />
          <div
            className="animate-float-slow absolute -right-10 top-24 h-64 w-64 rounded-full bg-violet-300/30 blur-3xl"
            style={{ animationDelay: "-3.5s" }}
          />
          <div
            className="animate-float-slow absolute left-1/3 -top-16 h-48 w-48 rounded-full bg-accent-300/25 blur-3xl"
            style={{ animationDelay: "-2s" }}
          />
        </div>
        <div className="container-page relative py-12 text-center sm:py-16">
          <Badge tone="brand" className="animate-fade-up mb-5">
            <Sparkles className="h-3 w-3" /> Bazoš · Bazar.sk · Vinted · jedno hľadanie
          </Badge>
          <h1
            className="animate-fade-up mx-auto max-w-3xl text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl"
            style={{ animationDelay: "0.1s" }}
          >
            Všetky slovenské bazáre. <span className="animate-gradient-x bg-gradient-to-r from-brand-600 via-violet-600 to-accent-500 bg-clip-text text-transparent">Jedno hľadanie.</span>
          </h1>
          <p
            className="animate-fade-up mx-auto mt-4 max-w-xl text-sm text-ink-600 sm:text-base"
            style={{ animationDelay: "0.2s" }}
          >
            Prehľadávame Bazoš, Bazar.sk, Vinted aj autobazáre naraz. Porovnáme ceny a ukážeme ti
            len to, čo je naozaj výhodné.
          </p>
          <div
            className="animate-fade-up mx-auto mt-7 max-w-2xl"
            style={{ animationDelay: "0.3s" }}
          >
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
      <section className="container-page pt-14">
        <Reveal>
          <SectionHeader
            title="Čo hľadáš?"
            subtitle="Vyber kategóriu a pozri si ponuky zo všetkých zdrojov"
            href="/inzeraty"
            linkLabel="Všetky inzeráty"
          />
        </Reveal>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {CATEGORY_TREE.map((cat, index) => (
            <Reveal key={cat.slug} delay={(index % 6) * 60}>
              <Link
                href={`/inzeraty?category=${cat.slug}`}
                className="group relative flex h-full flex-col items-center overflow-hidden rounded-2xl border border-ink-200 bg-white p-5 text-center transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-xl"
              >
                <div
                  aria-hidden
                  className={`absolute inset-0 bg-gradient-to-br ${TILE_GRADIENTS[index % TILE_GRADIENTS.length]} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />
                <span
                  aria-hidden
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50 text-3xl shadow-inner ring-1 ring-ink-100 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                >
                  {CATEGORY_EMOJI[cat.slug] ?? "📦"}
                </span>
                <span className="relative mt-3 text-sm font-semibold text-ink-900 transition-colors group-hover:text-brand-700">
                  {cat.name}
                </span>
                {categoryCounts[cat.slug] !== undefined && (
                  <span className="relative mt-1.5 rounded-full bg-ink-100 px-2.5 py-0.5 text-[11px] font-medium text-ink-500 transition-colors group-hover:bg-white/70">
                    {formatCount(categoryCounts[cat.slug] ?? 0)} inzerátov
                  </span>
                )}
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Populárne produkty */}
      <section className="container-page pt-12">
<Reveal>
          <SectionHeader
            title="Populárne produkty"
            subtitle="Inzeráty, ktoré ľudia hľadajú najviac"
            href="/inzeraty"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {popular.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        </Reveal>
      </section>

      {/* AI asistent */}
      <section className="container-page pb-14 pt-12">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-800 to-violet-900 px-6 py-12 text-center sm:px-12">
          <div
            aria-hidden
            className="animate-float-slow pointer-events-none absolute -left-10 top-6 h-40 w-40 rounded-full bg-violet-400/20 blur-3xl"
          />
          <div
            aria-hidden
            className="animate-float-slow pointer-events-none absolute -right-8 bottom-4 h-44 w-44 rounded-full bg-brand-400/20 blur-3xl"
            style={{ animationDelay: "-3s" }}
          />
          <div className="relative">
            <span
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur"
              aria-hidden
            >
              <Sparkles className="h-7 w-7 text-brand-200" />
            </span>
            <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">Nechaj AI, nech ti vyhľadá</h2>
            <p className="mt-2 text-sm font-medium text-brand-200 sm:text-base">
              Hľadanie inzerátov zaberá čas. AI asistent ich nájde za teba.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/70">
              Napíšte mu, čo hľadáte – a hneď vám ukáže aktuálne ponuky s cenami.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <OpenChatButton />
              <ButtonLink href="/inzeraty" variant="glass">
                Alebo si prezeraj ručne
              </ButtonLink>
            </div>
            <p className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-white/50">
              <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Odpovie do sekúnd</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Zadarmo</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
