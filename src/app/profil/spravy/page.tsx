import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { MessagesClient, type ConversationSummary } from "@/components/profile/MessagesClient";

export const metadata = { title: "Moje správy", robots: { index: false } };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/prihlasenie");

  const supabase = await createClient();

  const { data } = await supabase
    .from("conversations")
    .select(
      "id, buyer_id, seller_id, last_message_at, listings(title, slug), buyer:profiles!conversations_buyer_id_fkey(full_name, username), seller:profiles!conversations_seller_id_fkey(full_name, username)"
    )
    .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
    .order("last_message_at", { ascending: false });

  type Row = {
    id: string;
    buyer_id: string;
    seller_id: string;
    last_message_at: string;
    listings: { title: string; slug: string } | null;
    buyer: { full_name: string | null; username: string | null } | null;
    seller: { full_name: string | null; username: string | null } | null;
  };

  const conversations: ConversationSummary[] = ((data ?? []) as unknown as Row[]).map((row) => {
    const other = row.buyer_id === profile.id ? row.seller : row.buyer;
    return {
      id: row.id,
      listingTitle: row.listings?.title ?? "Inzerát",
      listingSlug: row.listings?.slug ?? "",
      otherName: other?.full_name ?? other?.username ?? "Používateľ",
      lastMessageAt: row.last_message_at,
    };
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-ink-900">Moje správy</h1>
      <MessagesClient
        conversations={conversations}
        currentUserId={profile.id}
        initialConversationId={c}
      />
    </div>
  );
}
