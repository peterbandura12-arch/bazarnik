import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { SavedSearchesClient } from "@/components/profile/SavedSearchesClient";
import type { SavedSearchRow } from "@/types/database";

export const metadata = { title: "Uložené vyhľadávania", robots: { index: false } };

const FILTER_KEYS = ["q", "category", "minPrice", "maxPrice", "location", "condition", "source", "sort"];

export default async function SavedSearchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/prihlasenie");

  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const currentQuery: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const value = sp[key];
    const v = Array.isArray(value) ? value[0] : value;
    if (v) currentQuery[key] = v;
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-ink-900">Uložené vyhľadávania</h1>
      <p className="mb-6 text-sm text-ink-500">
        Uložte si časté vyhľadávania a zapnite si k nim upozornenia na nové inzeráty.
      </p>
      <SavedSearchesClient
        searches={(data ?? []) as SavedSearchRow[]}
        currentQuery={currentQuery}
        canSaveCurrent={Object.keys(currentQuery).length > 0}
      />
    </div>
  );
}
