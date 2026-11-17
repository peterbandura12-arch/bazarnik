import Link from "next/link";
import { redirect } from "next/navigation";
import { PackagePlus } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { MyListingActions } from "@/components/profile/MyListingActions";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice, formatRelativeDate, STATUS_LABELS } from "@/lib/utils";

export const metadata = { title: "Moje inzeráty", robots: { index: false } };

export default async function MyListingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/prihlasenie");

  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("id, slug, title, price, currency, status, location, created_at, listing_images(url, is_primary, sort_order)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const items = listings ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Moje inzeráty</h1>
          <p className="mt-1 text-sm text-ink-500">Spravujte svoje ponuky – upravte stav alebo ich odstráňte.</p>
        </div>
        <ButtonLink href="/pridat-inzerat" variant="accent" size="sm">
          <PackagePlus className="h-4 w-4" /> Pridať
        </ButtonLink>
      </div>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Zatiaľ nemáte žiadne inzeráty"
            description="Pridajte svoju prvú ponuku – inzerovanie je zdarma."
            action={<ButtonLink href="/pridat-inzerat" variant="accent">Pridať inzerát</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => {
            const images = (item as { listing_images?: Array<{ url: string }> }).listing_images ?? [];
            const statusTone =
              item.status === "active" ? "success" : item.status === "sold" ? "info" : "neutral";
            return (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-ink-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                  {images[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={images[0].url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-ink-300">
                      <PackagePlus className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone}>{STATUS_LABELS[item.status]}</Badge>
                    <span className="text-xs text-ink-400">{formatRelativeDate(item.created_at)}</span>
                  </div>
                  <Link href={`/inzerat/${item.slug}`} className="mt-1 block truncate font-semibold text-ink-900 hover:text-brand-700">
                    {item.title}
                  </Link>
                  <p className="text-sm text-ink-500">
                    {formatPrice(item.price, item.currency)} · {item.location}
                  </p>
                </div>
                <MyListingActions listingId={item.id} status={item.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
