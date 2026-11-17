-- Bucket pre fotografie inzerátov (verejné čítanie, upload iba vlastník do vlastného priečinka)
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

create policy "Verejné čítanie fotografii inzerátov"
on storage.objects for select
using (bucket_id = 'listing-images');

create policy "Používatelia nahrávajú do vlastného priečinka"
on storage.objects for insert
with check (
  bucket_id = 'listing-images'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Používatelia spravujú vlastné fotografie"
on storage.objects for update
using (
  bucket_id = 'listing-images'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Používatelia mažú vlastné fotografie"
on storage.objects for delete
using (
  bucket_id = 'listing-images'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
