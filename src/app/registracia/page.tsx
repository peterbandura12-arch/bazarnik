"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Heslo musí mať aspoň 8 znakov.");
      return;
    }
    if (password !== confirm) {
      setError("Heslá sa nezhodujú.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (authError) {
      setError(
        authError.message.includes("already registered")
          ? "Účet s týmto e-mailom už existuje."
          : "Registrácia sa nepodarila. Skúste to znova."
      );
      return;
    }

    if (data.session) {
      router.push("/profil");
      router.refresh();
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="container-page flex justify-center py-12">
        <div className="w-full max-w-md rounded-2xl border border-green-200 bg-green-50 p-6 text-center sm:p-8">
          <h1 className="text-lg font-bold text-green-900">Registrácia takmer dokončená</h1>
          <p className="mt-2 text-sm text-green-800">
            Na adresu <strong>{email}</strong> sme odoslali overovací e-mail. Potvrďte adresu
            kliknutím na odkaz v e-maile a potom sa prihláste.
          </p>
          <Link href="/prihlasenie" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Prejsť na prihlásenie
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page flex justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 sm:p-8">
        <h1 className="text-xl font-bold text-ink-900">Registrácia</h1>
        <p className="mt-1 text-sm text-ink-500">Vytvorte si účet a pridávajte inzeráty zdarma.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Meno a priezvisko" required>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Ján Novák"
            />
          </Field>
          <Field label="E-mail" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="vas@email.sk"
            />
          </Field>
          <Field label="Heslo" required hint="Aspoň 8 znakov">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </Field>
          <Field label="Potvrdenie hesla" required>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            <UserPlus className="h-4 w-4" />
            {loading ? "Registrujem…" : "Zaregistrovať sa"}
          </Button>

          <p className="text-center text-xs text-ink-500">
            Registráciou súhlasíte s{" "}
            <Link href="/podmienky" className="text-brand-600 hover:underline">
              podmienkami používania
            </Link>{" "}
            a spracovaním osobných údajov podľa{" "}
            <Link href="/ochrana-osobnych-udajov" className="text-brand-600 hover:underline">
              zásad ochrany súkromia
            </Link>
            .
          </p>
        </form>

        <p className="mt-4 text-center text-sm text-ink-600">
          Už máte účet?{" "}
          <Link href="/prihlasenie" className="font-medium text-brand-600 hover:underline">
            Prihláste sa
          </Link>
        </p>
      </div>
    </div>
  );
}
