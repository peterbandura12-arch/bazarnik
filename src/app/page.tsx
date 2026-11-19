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

/** Farebne pozadie emoji ikonky kazdej kategorie (trvale farebne dlazdice). */
const TILE_EMOJI_STYLES = [
  "bg-brand-100 ring-brand-200",
  "bg-violet-100 ring-violet-200",
  "bg-sky-100 ring-sky-200",
  "bg-accent-100 ring-accent-200",
  "bg-emerald-100 ring-emerald-200",
  "bg-rose-100 ring-rose-200",
  "bg-amber-100 ring-amber-200",
  "bg-indigo-100 ring-indigo-200",
  "bg-teal-100 ring-teal-200",
  "bg-orange-100 ring-orange-200",
  "bg-cyan-100 ring-cyan-200",
  "bg-fuchsia-100 ring-fuchsia-200",
];

/** Farebne obtiahnutie kazdej dlazdice (border + zhlbenie farby pri hoveri). */
const TILE_BORDER_STYLES = [
  "border-brand-300/70 group-hover:border-brand-400",
  "border-violet-300/70 group-hover:border-violet-400",
  "border-sky-300/70 group-hover:border-sky-400",
  "border-accent-300/70 group-hover:border-accent-400",
  "border-emerald-300/70 group-hover:border-emerald-400",
  "border-rose-300/70 group-hover:border-rose-400",
  "border-amber-300/70 group-hover:border-amber-400",
  "border-indigo-300/70 group-hover:border-indigo-400",
  "border-teal-300/70 group-hover:border-teal-400",
  "border-orange-300/70 group-hover:border-orange-400",
  "border-cyan-300/70 group-hover:border-cyan-400",
  "border-fuchsia-300/70 group-hover:border-fuchsia-400",
];

/** Farebne pastelove vyhladavacie chipy pod vyhladavanim. */
const CHIP_STYLES = [
  "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
  "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100",
  "border-accent-200 bg-accent-50 text-accent-700 hover:bg-accent-100",
  "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  "border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100",
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
        <h2 className="animate-gradient-x bg-gradient-to-r from-brand-700 via-violet-600 to-accent-600 bg-clip-text text-lg font-extrabold text-transparent sm:text-xl">
          {title}
        </h2>
        <div
          aria-hidden
          className="bar-animated mt-1.5 h-1 w-16 rounded-full bg-gradient-to-r from-brand-500 via-violet-400 to-accent-400"
        />
        {subtitle && <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="group flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 transition-all duration-200 hover:bg-gradient-to-r hover:from-brand-600 hover:to-violet-600 hover:text-white hover:ring-transparent hover:shadow-md hover:shadow-brand-500/30"
        >
          {linkLabel ?? "Zobraziť všetko"}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
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
            className="animate-fade-up mx-auto mt-7 max-w-2xl rounded-xl bg-gradient-to-r from-brand-600 via-violet-500 to-accent-500 p-[2px] shadow-xl shadow-brand-500/25 transition-shadow duration-300 hover:shadow-2xl hover:shadow-brand-500/40"
            style={{ animationDelay: "0.3s" }}
          >
            <SearchBar />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium text-ink-400">Populárne:</span>
            {POPULAR_SEARCHES.map((term, index) => (
              <Link
                key={term}
                href={`/inzeraty?q=${encodeURIComponent(term)}`}
                className={`rounded-full border px-3 py-1 text-xs font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow ${CHIP_STYLES[index % CHIP_STYLES.length]}`}
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
                prefetch
                className={`group relative flex h-full flex-col items-center overflow-hidden rounded-2xl border-2 bg-white/90 p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-brand-200/30 ${TILE_BORDER_STYLES[index % TILE_BORDER_STYLES.length]}`}
              >
                <div
                  aria-hidden
                  className={`absolute inset-0 bg-gradient-to-br ${TILE_GRADIENTS[index % TILE_GRADIENTS.length]} opacity-50 transition-opacity duration-300 group-hover:opacity-100`}
                />
                <span
                  aria-hidden
                  className={`relative flex h-14 w-14 items-center justify-center rounded-2xl text-3xl bg-gradient-to-br ring-1 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 group-hover:animate-pop ${TILE_EMOJI_STYLES[index % TILE_EMOJI_STYLES.length]} shadow-inner`}
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {popular.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        </Reveal>
      </section>

      {/* AI asistent */}
      <section className="container-page pb-14 pt-12">
        <div className="relative overflow-hidden rounded-[1.4rem] bg-gradient-to-r from-brand-500 via-violet-500 to-accent-500 p-[2px] shadow-xl shadow-brand-300/30">
        <div className="relative overflow-hidden rounded-[1.3rem] bg-gradient-to-br from-brand-700 via-brand-800 to-violet-900 px-6 py-12 text-center sm:px-12">
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
        </div>
      </section>
    </div>
  );
}
