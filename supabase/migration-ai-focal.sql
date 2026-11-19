-- Migracia: AI zaostrenie fotiek (focus point pre inteligentne centrovanie obrazkov).
-- Spustite v Supabase SQL Editore.

alter table public.external_listings add column if not exists focal_x double precision;
alter table public.external_listings add column if not exists focal_y double precision;

alter table public.listing_images add column if not exists focal_x double precision;
alter table public.listing_images add column if not exists focal_y double precision;

-- Pohlad je nutne vytvorit znova, lebo menime poradie stlpcov.
drop view if exists public.v_listings_search;

create view public.v_listings_search as
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
  (select fi.focal_x from public.listing_images fi where fi.listing_id = l.id order by fi.is_primary desc, fi.sort_order limit 1) as focal_x,
  (select fi.focal_y from public.listing_images fi where fi.listing_id = l.id order by fi.is_primary desc, fi.sort_order limit 1) as focal_y,
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
  e.focal_x,
  e.focal_y,
  coalesce(e.published_at, e.fetched_at) as published_at,
  case when e.is_available then 'active' else 'archived' end as status,
  e.source_id,
  s.name as source_name,
  e.url as source_url
from public.external_listings e
join public.external_sources s on s.id = e.source_id
where e.is_available and s.is_active;

grant select on public.v_listings_search to authenticated, anon;
