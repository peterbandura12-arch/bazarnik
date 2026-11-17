"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/profil";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (authError) {
      setError("Nesprávny e-mail alebo heslo. Skúste to znova.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="container-page flex justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 sm:p-8">
        <h1 className="text-xl font-bold text-ink-900">Prihlásenie</h1>
        <p className="mt-1 text-sm text-ink-500">Prihláste sa do svojho účtu Bazárnik.</p>

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
          <Field label="Heslo" required>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            <LogIn className="h-4 w-4" />
            {loading ? "Prihlasujem…" : "Prihlásiť sa"}
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link href="/zabudnute-heslo" className="text-brand-600 hover:underline">
            Zabudnuté heslo?
          </Link>
          <Link href="/registracia" className="font-medium text-brand-600 hover:underline">
            Nemáte účet? Zaregistrujte sa
          </Link>
        </div>
      </div>
    </div>
  );
}
