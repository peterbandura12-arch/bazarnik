import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ImageOff, MapPin, ShieldAlert } from "lucide-react";
import { FavoriteButton } from "@/components/listings/FavoriteButton";
import { ShareButton, ReportButton } from "@/components/listings/ListingActions";
import { Badge } from "@/components/ui/Badge";
import { getListingBySlug, getSimilarListings } from "@/lib/listings";
import { ExpandableText } from "@/components/listings/ExpandableText";
import { ListingCard } from "@/components/listings/ListingCard";
import { LoginGate } from "@/components/auth/LoginGate";
import { CONDITION_LABELS, formatDate, formatPrice } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getCategoryPath } from "@/lib/categories";
import { getCurrentProfile, isSupabaseConfigured } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return { title: "Inzerát nebol nájdený" };
  return {
    title: `${listing.title} – externá ponuka`,
    description: listing.description?.slice(0, 160) ?? undefined,
    robots: { index: false },
  };
}

export default async function ExternalListingPage({ params }: PageProps) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);

  if (!listing || listing.source_type !== "external") notFound();

  const profile = isSupabaseConfigured() ? await getCurrentProfile() : null;
  const similar = await getSimilarListings(listing);

  // Neprihlaseny navstevnik neuvidi cely inzerat – zobrazime prihlasovaciu branu
  // (breadcrumb, ukazka + podobne inzeraty ostavaju).
  if (!profile) {
    return (
      <div className="container-page py-6">
        <nav aria-label="Navigácia" className="mb-4 text-sm text-ink-500">
          <Link href="/" className="hover:text-brand-700">Domov</Link>
          <span className="mx-1.5">/</span>
          <span className="font-medium text-ink-800">{listing.title}</span>
        </nav>
        <LoginGate
          next={`/externy/${listing.slug}`}
          teaser={{
            title: listing.title,
            price: formatPrice(listing.price, listing.currency),
            imageUrl: listing.image_url,
          }}
        />
        {similar.length > 0 && (
          <section className="pt-10">
            <h2 className="mb-4 text-lg font-bold text-ink-900">Podobné inzeráty</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {similar.map((l) => (
                <ListingCard key={l.id} listing={l} isLoggedIn={false} />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  let categoryPath: ReturnType<typeof getCategoryPath> = [];
  if (listing.category_id) {
    const supabase = await createClient();
    const { data: catRow } = await supabase
      .from("categories")
      .select("slug")
      .eq("id", listing.category_id)
      .maybeSingle();
    if (catRow) categoryPath = getCategoryPath(catRow.slug);
  }

  return (
    <div className="container-page py-6">
      <nav aria-label="Navigácia" className="mb-4 text-sm text-ink-500">
        <Link href="/" className="hover:text-brand-700">Domov</Link>
        {categoryPath.map((c) => (
          <span key={c.slug}>
            <span className="mx-1.5">/</span>
            <Link href={`/inzeraty?category=${c.slug}`} className="hover:text-brand-700">{c.name}</Link>
          </span>
        ))}
        <span className="mx-1.5">/</span>
        <span className="font-medium text-ink-800">{listing.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
            <div className="aspect-[4/3] bg-ink-100">
              {listing.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.image_url}
                  alt={listing.title}
                  loading="lazy"
                  style={{
                    objectPosition:
                      listing.focal_x != null && listing.focal_y != null
                        ? `${(listing.focal_x * 100).toFixed(1)}% ${(listing.focal_y * 100).toFixed(1)}%`
                        : "50% 50%",
                  }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-300">
                  <ImageOff className="h-16 w-16" aria-hidden />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-ink-200 bg-white p-5">
            <h2 className="mb-2 text-base font-bold text-ink-900">Popis</h2>
            <ExpandableText
              text={listing.description}
              emptyLabel="Popis nie je dostupný. Pozrite si pôvodnú ponuku na zdrojovom portáli."
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-ink-200 bg-white p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="info">
                <ExternalLink className="h-3 w-3" />
                {listing.source_name ?? "Externý zdroj"}
              </Badge>
              {listing.demo && <Badge tone="warning">Demo</Badge>}
              {listing.condition && <Badge tone="neutral">{CONDITION_LABELS[listing.condition]}</Badge>}
            </div>
            <h1 className="text-xl font-bold text-ink-900">{listing.title}</h1>
            <p className="mt-2 text-3xl font-bold text-brand-700">
              {formatPrice(listing.price, listing.currency)}
            </p>

            <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Lokalita</dt>
                <dd className="flex items-center gap-1 font-medium text-ink-900">
                  <MapPin className="h-4 w-4 text-ink-400" />
                  {listing.location ?? "Neuvedená"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Zverejnené</dt>
                <dd className="font-medium text-ink-900">{formatDate(listing.published_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Zdroj</dt>
                <dd className="font-medium text-ink-900">{listing.source_name}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="flex items-start gap-2 font-medium">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Toto je externá ponuka – komunikácia prebieha priamo na pôvodnom portáli.
            </p>
            <p className="mt-2 text-blue-800">
              Interný chat nie je pre externé inzeráty dostupný, pretože nemáme prístup
              ku komunikácii pôvodného predávajúceho.
            </p>
          </div>

          <div className="space-y-2">
            {listing.source_url ? (
              <a
                href={listing.source_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-700"
              >
                <ExternalLink className="h-4 w-4" /> Zobraziť pôvodnú ponuku
              </a>
            ) : (
              <span className="flex h-12 w-full items-center justify-center rounded-lg border border-ink-200 bg-ink-50 text-sm text-ink-500">
                Odkaz na pôvodnú ponuku nie je dostupný
              </span>
            )}
            <FavoriteButton
              externalListingId={listing.id}
              isLoggedIn={Boolean(profile)}
              className="!h-10 w-full !rounded-lg border border-ink-200 shadow-none"
            />
            <ShareButton url={`/externy/${listing.slug}`} />
            <ReportButton externalListingId={listing.id} />
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="pt-10">
          <h2 className="mb-4 text-lg font-bold text-ink-900">Podobné inzeráty</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {similar.map((l) => (
              <ListingCard key={l.id} listing={l} isLoggedIn={Boolean(profile)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
