"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Save, Trash2, UserRound } from "lucide-react";
import type { Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export function SettingsForm({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);

  const router = useRouter();

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone, location: location })
      .eq("id", profile.id);
    setProfileMessage(error ? "Zmeny sa nepodarilo uložiť." : "Zmeny boli uložené.");
    router.refresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordMessage("Heslo musí mať aspoň 8 znakov.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordMessage(error ? "Heslo sa nepodarilo zmeniť." : "Heslo bolo zmenené.");
    setNewPassword("");
  }

  async function deleteAccount() {
    if (
      !confirm(
        "Naozaj chcete odstrániť svoj účet a všetky údaje? Táto akcia je nezvratná."
      )
    )
      return;
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) {
      window.location.href = "/";
    } else {
      setDeleting(false);
      alert("Odstránenie účtu sa nepodarilo. Kontaktujte podporu.");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="rounded-xl border border-ink-200 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-900">
          <UserRound className="h-4 w-4" /> Osobné údaje
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Meno a priezvisko">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="E-mail" hint="E-mail sa mení cez podporu">
            <Input value={profile.email} disabled />
          </Field>
          <Field label="Telefón">
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Lokalita">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
        </div>
        {profileMessage && <p className="mt-3 text-sm text-green-700">{profileMessage}</p>}
        <Button type="submit" className="mt-4">
          <Save className="h-4 w-4" /> Uložiť zmeny
        </Button>
      </form>

      <form onSubmit={changePassword} className="rounded-xl border border-ink-200 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-900">
          <KeyRound className="h-4 w-4" /> Zmena hesla
        </h2>
        <Field label="Nové heslo" hint="Aspoň 8 znakov">
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        {passwordMessage && <p className="mt-3 text-sm text-green-700">{passwordMessage}</p>}
        <Button type="submit" className="mt-4">
          Zmeniť heslo
        </Button>
      </form>

      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-red-800">
          <Trash2 className="h-4 w-4" /> Odstránenie účtu
        </h2>
        <p className="text-sm text-red-700">
          Odstránením účtu sa nezvratne vymažú vaše inzeráty, správy a obľúbené položky
          v súlade s GDPR.
        </p>
        <Button variant="danger" className="mt-3" onClick={deleteAccount} disabled={deleting}>
          {deleting ? "Odstraňujem…" : "Odstrániť účet a údaje"}
        </Button>
      </div>
    </div>
  );
}
