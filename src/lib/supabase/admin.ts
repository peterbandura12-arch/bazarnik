import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role klient – POUŽÍVAŤ VÝHRADNE na serveri (API routes, synchronizácia zdrojov).
 * Obchádza RLS, preto musí byť kľúč uložený len v premenných prostredia servera.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Admin klient nie je nakonfigurovaný: chýba SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
