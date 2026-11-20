-- Výkonnostná migrácia: rýchlejšie vyhľadávanie a načítanie stránok.
--
-- Vyhľadávanie používa ILIKE '%slovo%' nad názvom, popisom, značkou a modelom.
-- Bežné (btree) indexy pri '%...%' nepomôžu – trigramové GIN indexy áno.
-- Spusti v Supabase SQL Editore (Dashboard -> SQL Editor -> Run).

create extension if not exists pg_trgm;

-- Názvy a popisy inzerátov (vlastné + externé) – hlavné zrýchlenie hľadania.
create index if not exists idx_listings_title_trgm
  on public.listings using gin (title gin_trgm_ops);

create index if not exists idx_listings_description_trgm
  on public.listings using gin (description gin_trgm_ops);

create index if not exists idx_external_listings_title_trgm
  on public.external_listings using gin (title gin_trgm_ops);

create index if not exists idx_external_listings_description_trgm
  on public.external_listings using gin (description gin_trgm_ops);

-- Značky/modely (menšie texty, btree-ish prístup stačí, ale trgm pokryje ilike)
create index if not exists idx_external_listings_brand_trgm
  on public.external_listings using gin (brand gin_trgm_ops);

create index if not exists idx_listings_location_trgm
  on public.listings using gin (location gin_trgm_ops);

create index if not exists idx_external_listings_location_trgm
  on public.external_listings using gin (location gin_trgm_ops);

-- Zoradenie externých inzerátov podľa dátumu pridania/zmeny
create index if not exists idx_external_listings_fetched_at
  on public.external_listings (fetched_at desc);
