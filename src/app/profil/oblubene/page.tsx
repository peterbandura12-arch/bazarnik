import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { ListingCard } from "@/components/listings/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import type { ListingCondition } from "@/types/database";

export const metadata = { title: "Obľúbené inzeráty", robots: { index: false } };

type OwnRow = {
  listing_id: string;
  listings: {
    id: string; slug: string; title: string; description: string; price: number; currency: string;
    condition: string | null; brand: string | null; model: string | null; location: string;
    category_id: string; created_at: string;
    listing_images: Array<{ url: string; is_primary: boolean; sort_order: number }>;
  };
};

type ExtRow = {
  external_listing_id: string;
  external_listings: {
    id: string; slug: string; title: string; description: string | null; price: number | null;
    currency: string; condition: string | null; brand: string | null; model: string | null;
    location: string | null; category_id: string | null; image_url: string | null;
    published_at: string | null; url: string; external_sources: { name: string } | null;
  };
};

export default async function FavoritesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/prihlasenie");

  const supabase = await createClient();

  const [ownResult, externalResult] = await Promise.all([
    supabase
      .from("favorites")
      .select("listing_id, listings!inner(*, listing_images(url, is_primary, sort_order))")
      .eq("user_id", profile.id)
      .not("listing_id", "is", null),
    supabase
      .from("favorites")
      .select("external_listing_id, external_listings!inner(*, external_sources(name))")
      .eq("user_id", profile.id)
      .not("external_listing_id", "is", null),
  ]);

  const ownItems = ((ownResult.data ?? []) as unknown as OwnRow[]).map((row) => ({
    id: row.listings.id,
    source_type: "own" as const,
    slug: row.listings.slug,
    title: row.listings.title,
    description: row.listings.description,
    price: row.listings.price,
    currency: row.listings.currency,
    condition: row.listings.condition as ListingCondition | null,
    brand: row.listings.brand,
    model: row.listings.model,
    location: row.listings.location,
    category_id: row.listings.category_id,
    image_url:
      row.listings.listing_images?.find((i) => i.is_primary)?.url ??
      row.listings.listing_images?.[0]?.url ??
      null,
    published_at: row.listings.created_at,
    status: "active" as const,
    source_id: null,
    source_name: null,
    source_url: null,
  }));

  const externalItems = ((externalResult.data ?? []) as unknown as ExtRow[]).map((row) => ({
    id: row.external_listings.id,
    source_type: "external" as const,
    slug: row.external_listings.slug,
    title: row.external_listings.title,
    description: row.external_listings.description,
    price: row.external_listings.price,
    currency: row.external_listings.currency,
    condition: row.external_listings.condition as ListingCondition | null,
    brand: row.external_listings.brand,
    model: row.external_listings.model,
    location: row.external_listings.location,
    category_id: row.external_listings.category_id,
    image_url: row.external_listings.image_url,
    published_at: row.external_listings.published_at ?? new Date().toISOString(),
    status: "active" as const,
    source_id: null,
    source_name: row.external_listings.external_sources?.name ?? "Externý zdroj",
    source_url: row.external_listings.url,
  }));

  const all = [...ownItems, ...externalItems];

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-900">Obľúbené inzeráty</h1>
      <p className="mt-1 text-sm text-ink-500">Inzeráty, ktoré ste si uložili na neskôr.</p>

      {all.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nemáte žiadne obľúbené inzeráty"
            description="Kliknite na ikonu srdca na karte inzerátu a uložte si ho sem."
            action={<ButtonLink href="/inzeraty">Prezerať inzeráty</ButtonLink>}
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {all.map((listing) => (
            <ListingCard
              key={`${listing.source_type}-${listing.id}`}
              listing={listing}
              isLoggedIn
              isFavorite
            />
          ))}
        </div>
      )}
    </div>
  );
}
