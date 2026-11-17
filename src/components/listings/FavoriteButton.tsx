"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function FavoriteButton({
  listingId,
  externalListingId,
  initialActive = false,
  isLoggedIn,
  className = "",
}: {
  listingId?: string;
  externalListingId?: string;
  initialActive?: boolean;
  isLoggedIn: boolean;
  className?: string;
}) {
  const [active, setActive] = useState(initialActive);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      router.push("/prihlasenie?next=" + encodeURIComponent(window.location.pathname));
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (active) {
      if (listingId) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId);
      } else if (externalListingId) {
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("external_listing_id", externalListingId);
      }
      setActive(false);
    } else {
      await supabase.from("favorites").insert({
        user_id: user.id,
        listing_id: listingId ?? null,
        external_listing_id: externalListingId ?? null,
      });
      setActive(true);
    }
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={active ? "Odobrať z obľúbených" : "Pridať do obľúbených"}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white ${className}`}
    >
      <Heart className={`h-4 w-4 ${active ? "fill-red-500 text-red-500" : "text-ink-500"}`} />
    </button>
  );
}
