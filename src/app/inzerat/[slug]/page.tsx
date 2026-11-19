import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageOff, MapPin, PackageCheck, Store, UserRound } from "lucide-react";
import { ListingCard } from "@/components/listings/ListingCard";
import { FavoriteButton } from "@/components/listings/FavoriteButton";
import { ContactSellerButton, ShareButton, ReportButton } from "@/components/listings/ListingActions";
import { Badge } from "@/components/ui/Badge";
import { getListingBySlug, getSimilarListings } from "@/lib/listings";
import { ExpandableText } from "@/components/listings/ExpandableText";
import { LoginGate } from "@/components/auth/LoginGate";
import { getCategoryPath } from "@/lib/categories";
import { CONDITION_LABELS, formatDate, formatPrice } from "@/lib/utils";
import { createClient, getCurrentProfile, isSupabaseConfigured } from "@/lib/supabase/server";
import type { ListingImage, Profile } from "@/types/database";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return { title: "Inzerát nebol nájdený" };

  return {
    title: listing.title,
    description: listing.description?.slice(0, 160) ?? undefined,
    openGraph: {
      title: listing.title,
      description: listing.description?.slice(0, 160) ?? undefined,
      images: listing.image_url ? [listing.image_url] : undefined,
    },
    alternates: { canonical: `/inzerat/${listing.slug}` },
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);

  if (!listing || listing.source_type === "external") notFound();

  const profile = isSupabaseConfigured() ? await getCurrentProfile() : null;
  const isLoggedIn = Boolean(profile);
  const isOwner = !listing.demo && profile?.id === listing.id;

  let images: ListingImage[] = [];
  let seller: Profile | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const imagesResult = await supabase
      .from("listing_images")
      .select("*")
      .eq("listing_id", listing.id)
      .order("is_primary", { ascending: false })
      .order("sort_order");
    images = (imagesResult.data ?? []) as ListingImage[];

    if (!listing.demo) {
      const { data: row } = await supabase
        .from("listings")
        .select("user_id")
        .eq("id", listing.id)
        .maybeSingle();

      if (row?.user_id) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", row.user_id)
          .maybeSingle();
        seller = (data as Profile) ?? null;
      }
    }
  }

  const similar = await getSimilarListings(listing);
  const categoryPath = listing.category_id ? getCategoryPath(listing.category_id) : [];
  const primaryImage = images.find((i) => i.is_primary) ?? images[0];

  // Neprihlaseny navstevnik neuvidi cely inzerat – zobrazime prihlasovaciu branu.
  if (!profile) {
    return (
      <div className="container-page py-6">
        <nav aria-label="Navigácia" className="mb-4 text-sm text-ink-500">
          <Link href="/" className="hover:text-brand-700">Domov</Link>
          <span className="mx-1.5">/</span>
          <span className="font-medium text-ink-800">{listing.title}</span>
        </nav>
        <LoginGate
          next={`/inzerat/${listing.slug}`}
          teaser={{
            title: listing.title,
            price: formatPrice(listing.price, listing.currency),
            imageUrl: primaryImage?.url ?? listing.image_url ?? null,
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description,
    image: listing.image_url ?? undefined,
    offers: {
      "@type": "Offer",
      price: listing.price ?? 0,
      priceCurrency: listing.currency,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="container-page py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Navigácia kategórií" className="mb-4 text-sm text-ink-500">
        <Link href="/" className="hover:text-brand-700">Domov</Link>
        <span className="mx-1.5">/</span>
        <Link href="/inzeraty" className="hover:text-brand-700">Inzeráty</Link>
        {categoryPath.map((c) => (
          <span key={c.slug}>
            <span className="mx-1.5">/</span>
            <Link href={`/inzeraty?category=${c.slug}`} className="hover:text-brand-700">
              {c.name}
            </Link>
          </span>
        ))}
      </nav>

      {listing.demo && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Toto je <strong>ukážkový inzerát (demo)</strong> – nepredstavuje reálnu ponuku.
          Chat a obľúbené budú funkčné po pripojení databázy.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
            <div className="aspect-[4/3] bg-ink-100">
              {primaryImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primaryImage.url}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-300">
                  <ImageOff className="h-16 w-16" aria-hidden />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-2">
                {images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={img.url}
                    alt={`Fotografia inzerátu ${listing.title}`}
                    loading="lazy"
                    className={`h-16 w-20 shrink-0 rounded-lg border-2 object-cover ${
                      img.id === primaryImage?.id ? "border-brand-600" : "border-transparent"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-ink-200 bg-white p-5">
            <h2 className="mb-2 text-base font-bold text-ink-900">Popis</h2>
            <ExpandableText text={listing.description} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-ink-200 bg-white p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">Bazárnik</Badge>
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
                <dt className="text-ink-500">Stav</dt>
                <dd className="flex items-center gap-1 font-medium text-ink-900">
                  <PackageCheck className="h-4 w-4 text-ink-400" />
                  {listing.condition ? CONDITION_LABELS[listing.condition] : "Neuvedený"}
                </dd>
              </div>
              {listing.brand && (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-500">Značka</dt>
                  <dd className="font-medium text-ink-900">{listing.brand}</dd>
                </div>
              )}
              {listing.model && (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-500">Model</dt>
                  <dd className="font-medium text-ink-900">{listing.model}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-xl border border-ink-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900">
              <Store className="h-4 w-4 text-ink-400" /> Predávajúci
            </h2>
            {listing.demo ? (
              <p className="flex items-center gap-2 text-sm text-ink-500">
                <UserRound className="h-4 w-4" /> Demo predávajúci (ukážkové dáta)
              </p>
            ) : (
              <p className="flex items-center gap-2 text-sm font-medium text-ink-900">
                <UserRound className="h-4 w-4 text-ink-400" />
                {seller?.full_name ?? seller?.username ?? "Predávajúci"}
              </p>
            )}

            <div className="mt-4 space-y-2">
              <ContactSellerButton
                listingId={listing.id}
                isLoggedIn={isLoggedIn}
                disabled={listing.demo || isOwner}
              />
              <FavoriteButton
                listingId={listing.id}
                isLoggedIn={isLoggedIn}
                className="!h-10 w-full !rounded-lg border border-ink-200 shadow-none"
              />
              <ShareButton url={`/inzerat/${listing.slug}`} />
              <ReportButton listingId={listing.id} />
            </div>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="pt-10">
          <h2 className="mb-4 text-lg font-bold text-ink-900">Podobné inzeráty</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {similar.map((l) => (
              <ListingCard key={l.id} listing={l} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
