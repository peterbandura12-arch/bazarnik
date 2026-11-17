# Bazárnik

Moderná slovenská inzertná platforma kombinujúca vlastné inzeráty používateľov a externé ponuky z povolených zdrojov (oficiálne API / partnerské feedy).

## Technologický stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first konfigurácia v `src/app/globals.css`)
- **Supabase** – PostgreSQL, Auth, Storage, Realtime
- **lucide-react** – ikonografia, **zod** – validácia
- **Resend** – e-maily (voliteľné)

## Rýchly štart

```bash
npm install
cp .env.example .env.local   # doplňte hodnoty zo Supabase projektu
npm run dev                  # http://localhost:3000
```

Bez nastaveného Supabase beží aplikácia v **demo režime** – zobrazuje jasne označené ukážkové inzeráty (`Demo` badge + banner). Žiadne demo dáta nie sú prezentované ako reálne ponuky.

## Nastavenie Supabase (poradie krokov)

1. Vytvorte projekt na [supabase.com](https://supabase.com).
2. V SQL editore spustite **`supabase/schema.sql`** (tabuľky, RLS, view `v_listings_search`, funkcie, triggre).
3. Spustite **`supabase/seed-categories.sql`** (12 hlavných kategórií + ~110 podkategórií).
4. Spustite **`supabase/storage.sql`** (verejný bucket `listing-images` s politikami – upload len do vlastného priečinka `{user_id}/...`).
5. Do `.env.local` doplňte `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
6. V Supabase → Authentication → URL Configuration nastavte `SITE_URL` a redirect `http://localhost:3000/auth/callback`.
7. Pre prvého administrátora: po registrácii v databáze `update profiles set role = 'admin' where email = 'vas@email.sk';`

## E-maily (Resend)

- Vytvorte účet na [resend.com](https://resend.com), doplňte `RESEND_API_KEY` a `EMAIL_FROM`.
- Bez kľúča sa e-maily len zalogujú do konzoly servera (aplikácia funguje ďalej).

## Externé zdroje a synchronizácia

- Architektúra adaptérov: `src/adapters/types.ts` (rozhranie `ExternalSourceAdapter`), `src/adapters/registry.ts`.
- Šablóna nového adaptéru: `src/adapters/sources/json-feed.example.ts` – slúži výhradne pre **povolené zdroje** (oficiálne API, partnerské feedy). Zdroje bez legálneho prístupu označte ako nepodporované, nepoužívajte scraping.
- Aktívne zdroje sa zapisujú do tabuľky `external_sources` (stĺpec `adapter_slug`).
- Synchronizácia: `POST /api/cron/sync` s hlavičkou `Authorization: Bearer $CRON_SECRET` (nastavte `CRON_SECRET`). V Supabase Dashboard → Database → Cron, alebo externe (napr. vercel.json cron / GitHub Actions) volajte tento endpoint pravidelne.
- Deduplikácia cez `content_hash` (sha256), aktualizácia existujúcich ponúk, `last_synced_at`.

## Štruktúra

```
src/
  adapters/        # adaptéry externých zdrojov
  app/             # routy App Routeru (stránky, API)
  components/      # UI komponenty (ui/, layout/, listings/, profile/, admin/)
  lib/             # dátová vrstva, Supabase klienti, e-maily, utility
  types/           # zdieľané typy
supabase/          # SQL: schema, seed kategórií, storage
```

## Skripty

- `npm run dev` – vývojový server
- `npm run build` / `npm run start` – produkčný build
- `npm run typecheck` – kontrola typov

## Bezpečnosť

- RLS na všetkých tabuľkách, `is_admin()` security-definer funkcia
- Administrátorské akcie sa overujú na serveri (`/api/admin/actions`), nie len v UI
- Cron endpoint chránený bearer tokenom, validácia vstupov cez zod
- Upload fotografii obmedzený na `10 MB / max. 10 súborov`, iba obrazové typy, do vlastného priečinka používateľa
- Možnosť nahlásiť inzerát, odstrániť účet vrátane údajov

## Známe obmedzenia / roadmapa

- Rate-limiting formulárov zatiaľ nie je implementovaný (odporúčané: Supabase Edge Function alebo middleware s Redis).
- E-mailová verifikácia závisí od nastavení Supabase projektu (Authentication → Email).
- Notifikácie na uložené vyhľadávania: schéma aj UI hotové, napojenie na synchronizačný job je v pláne.
- Google prihlásenie pripravené na doplnenie cez Supabase Auth provider.
