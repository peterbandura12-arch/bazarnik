import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/profile/SettingsForm";

export const metadata = { title: "Nastavenia účtu", robots: { index: false } };

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/prihlasenie");

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-ink-900">Nastavenia účtu</h1>
      <p className="mb-6 text-sm text-ink-500">Spravujte svoje osobné údaje a zabezpečenie účtu.</p>
      <SettingsForm profile={profile} />
    </div>
  );
}
