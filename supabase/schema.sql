-- ============================================================
-- BAZÁRNIK – databázová schéma (PostgreSQL / Supabase)
-- Etapa 2: tabuľky, vzťahy, indexy, RLS bezpečnostné pravidlá
-- Spustiť v Supabase SQL editore alebo cez migrácie.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Kategórie (hierarchické cez parent_id) ----------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_id uuid references public.categories(id) on delete cascade,
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_categories_parent on public.categories(parent_id, sort_order);
create index idx_categories_slug on public.categories(slug);

-- ---------- Používateľské profily ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text unique,
  full_name text,
  avatar_url text,
  phone text,
  location text,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Pomocné funkcie (po vytvorení tabuliek, ktoré používajú) ----------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not is_blocked
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Automatické vytvorenie profilu pri registrácii
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Profily sú čitateľné" on public.profiles
  for select using (true);

create policy "Používateľ upravuje vlastný profil" on public.profiles
  for update using (auth.uid() = id and not is_blocked)
  with check (auth.uid() = id);

-- Administrátor môže blokovať účty a meniť roly
create policy "Admin spravuje profily" on public.profiles
  for update using (public.is_admin());

-- ---------- Vlastné inzeráty ----------

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 10 and 10000),
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'EUR',
  condition text not null check (condition in ('nove', 'ako_nove', 'pouzite', 'na_diely')),
  brand text,
  model text,
  location text not null,
  status text not null default 'active' check (status in ('active', 'sold', 'archived')),
  contact_preference text not null default 'chat' check (contact_preference in ('chat', 'phone', 'email')),
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_listings_category on public.listings(category_id, status, created_at desc);
create index idx_listings_user on public.listings(user_id, created_at desc);
create index idx_listings_price on public.listings(price);
create index idx_listings_location on public.listings(location);
create index idx_listings_created on public.listings(created_at desc);

create trigger trg_listings_updated before update on public.listings
  for each row execute function public.set_updated_at();

alter table public.listings enable row level security;

create policy "Aktívne inzeráty sú čitateľné" on public.listings
  for select using (status <> 'archived' or user_id = auth.uid() or public.is_admin());

create policy "Prihlásený používať pridáva inzeráty" on public.listings
  for insert with check (auth.uid() = user_id);

create policy "Vlastník upravuje svoj inzerát" on public.listings
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Vlastník maže svoj inzerát" on public.listings
  for delete using (auth.uid() = user_id or public.is_admin());

-- ---------- Fotografie inzerátov ----------

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  is_primary boolean not null default false
);

create index idx_listing_images_listing on public.listing_images(listing_id, sort_order);

alter table public.listing_images enable row level security;

create policy "Fotografie sú čitateľné" on public.listing_images
  for select using (true);

create policy "Vlastník inzerátu spravuje fotografie" on public.listing_images
  for all using (
    exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
  );

-- ---------- Externé zdroje a externé inzeráty ----------

create table public.external_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  website_url text not null,
  adapter text not null,
  feed_url text,
  is_active boolean not null default false,
  last_synced_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.external_sources enable row level security;

create policy "Zdroje sú čitateľné" on public.external_sources
  for select using (true);

create policy "Admin spravuje zdroje" on public.external_sources
  for all using (public.is_admin()) with check (public.is_admin());

create table public.external_listings (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.external_sources(id) on delete cascade,
  external_id text not null,
  slug text not null unique,
  url text not null,
  title text not null,
  description text,
  price numeric(12,2),
  currency text not null default 'EUR',
  condition text check (condition in ('nove', 'ako_nove', 'pouzite', 'na_diely')),
  brand text,
  model text,
  location text,
  category_id uuid references public.categories(id),
  image_url text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  is_available boolean not null default true,
  content_hash text,
  unique (source_id, external_id)
);

create index idx_external_listings_source on public.external_listings(source_id, is_available);
create index idx_external_listings_category on public.external_listings(category_id, published_at desc);
create index idx_external_listings_price on public.external_listings(price);

alter table public.external_listings enable row level security;

create policy "Externé inzeráty sú čitateľné" on public.external_listings
  for select using (true);

-- ---------- Obľúbené ----------

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  external_listing_id uuid references public.external_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (listing_id is not null and external_listing_id is null) or
    (listing_id is null and external_listing_id is not null)
  ),
  unique (user_id, listing_id),
  unique (user_id, external_listing_id)
);

alter table public.favorites enable row level security;

create policy "Obľúbené vlastníka" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Uložené vyhľadávania ----------

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  query jsonb not null,
  notify boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.saved_searches enable row level security;

create policy "Uložené vyhľadávania vlastníka" on public.saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Konverzácie a správy ----------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

create index idx_conversations_buyer on public.conversations(buyer_id, last_message_at desc);
create index idx_conversations_seller on public.conversations(seller_id, last_message_at desc);

alter table public.conversations enable row level security;

create policy "Účastníci vidia konverzáciu" on public.conversations
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Prihlásený používať začína konverzáciu" on public.conversations
  for insert with check (auth.uid() = buyer_id and buyer_id <> seller_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text check (char_length(body) between 1 and 5000),
  image_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation on public.messages(conversation_id, created_at);

alter table public.messages enable row level security;

create policy "Účastníci čítajú správy" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "Účastník odosiela správy" on public.messages
  for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Označenie správ ako prečítaných (len príjemca)
create policy "Príjemca označuje prečítanie" on public.messages
  for update using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.id in (
        select id from public.conversations where buyer_id = auth.uid() or seller_id = auth.uid()
      ) and sender_id <> auth.uid()
    )
  );

-- ---------- Notifikácie ----------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('message', 'saved_search', 'listing_status', 'account')),
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Notifikácie vlastníka" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Nahlásenia inzerátov ----------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  listing_id uuid references public.listings(id) on delete cascade,
  external_listing_id uuid references public.external_listings(id) on delete cascade,
  reason text not null check (reason in ('spam', 'nevhodny_obsah', 'podvod', 'duplicitny', 'iny')),
  details text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'resolved')),
  created_at timestamptz not null default now(),
  check (
    (listing_id is not null and external_listing_id is null) or
    (listing_id is null and external_listing_id is not null)
  )
);

alter table public.reports enable row level security;

create policy "Prihlásený používať nahlási inzerát" on public.reports
  for insert with check (auth.uid() = reporter_id);

create policy "Admin vidí nahlásenia" on public.reports
  for select using (public.is_admin());

create policy "Admin spravuje nahlásenia" on public.reports
  for update using (public.is_admin());

-- ---------- Zjednotený vyhľadávací pohľad ----------

create or replace view public.v_listings_search as
select
  l.id,
  'own'::text as source_type,
  l.slug,
  l.title,
  l.description,
  l.price,
  l.currency,
  l.condition,
  l.brand,
  l.model,
  l.location,
  l.category_id,
  (select url from public.listing_images i where i.listing_id = l.id order by i.is_primary desc, i.sort_order limit 1) as image_url,
  l.created_at as published_at,
  l.status,
  null::uuid as source_id,
  null::text as source_name,
  null::text as source_url
from public.listings l
where l.status = 'active'
union all
select
  e.id,
  'external'::text as source_type,
  e.slug,
  e.title,
  e.description,
  e.price,
  e.currency,
  e.condition,
  e.brand,
  e.model,
  e.location,
  e.category_id,
  e.image_url,
  coalesce(e.published_at, e.fetched_at) as published_at,
  case when e.is_available then 'active' else 'archived' end as status,
  e.source_id,
  s.name as source_name,
  e.url as source_url
from public.external_listings e
join public.external_sources s on s.id = e.source_id
where e.is_available and s.is_active;

grant select on public.v_listings_search to authenticated, anon;

-- ---------- Fulltextové vyhľadávanie ----------

alter table public.listings add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(brand, '') || ' ' || coalesce(model, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored;

create index idx_listings_search on public.listings using gin(search_vector);
