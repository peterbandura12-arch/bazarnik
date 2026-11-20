-- Aktivacia zdroja Bazar.sk pre Bazarnik.
-- Spusti v Supabase Dashboard -> SQL Editor -> New query -> Run.

insert into public.external_sources (slug, name, website_url, adapter, feed_url, is_active)
values (
  'bazarsk',
  'Bazar.sk',
  'https://www.bazar.sk',
  'bazarsk',
  null,
  true
)
on conflict (slug) do update
  set name = excluded.name,
      website_url = excluded.website_url,
      adapter = excluded.adapter,
      is_active = excluded.is_active;
