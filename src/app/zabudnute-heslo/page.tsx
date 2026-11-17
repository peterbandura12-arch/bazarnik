"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/profil/nastavenia`,
    });
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="container-page flex justify-center py-12">
        <div className="w-full max-w-md rounded-2xl border border-green-200 bg-green-50 p-6 text-center sm:p-8">
          <MailCheck className="mx-auto mb-3 h-10 w-10 text-green-600" />
          <h1 className="text-lg font-bold text-green-900">E-mail odoslaný</h1>
          <p className="mt-2 text-sm text-green-800">
            Ak existuje účet s adresou <strong>{email}</strong>, poslali sme jej odkaz na
            obnovenie hesla. Skontrolujte si schránku vrátane priečinka spam.
          </p>
          <Link href="/prihlasenie" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Späť na prihlásenie
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page flex justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 sm:p-8">
        <h1 className="text-xl font-bold text-ink-900">Zabudnuté heslo</h1>
        <p className="mt-1 text-sm text-ink-500">
          Zadajte svoj e-mail a pošleme vám odkaz na obnovenie hesla.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
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
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Odosielam…" : "Odoslať odkaz na obnovenie"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/prihlasenie" className="text-brand-600 hover:underline">
            Späť na prihlásenie
          </Link>
        </p>
      </div>
    </div>
  );
}
