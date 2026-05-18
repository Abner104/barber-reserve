-- ============================================================
-- Supabase Storage: bucket para imágenes de barberías
-- Ejecuta en SQL Editor de Supabase
-- ============================================================

-- Crear bucket público para imágenes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-images',
  'shop-images',
  true,
  5242880, -- 5MB max
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Política: cualquiera puede leer (bucket público)
create policy "shop_images_public_read"
  on storage.objects for select
  using ( bucket_id = 'shop-images' );

-- Política: staff autenticado puede subir
create policy "shop_images_auth_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'shop-images'
    and auth.role() = 'authenticated'
  );

-- Política: staff puede actualizar/borrar sus propias imágenes
create policy "shop_images_auth_update"
  on storage.objects for update
  using (
    bucket_id = 'shop-images'
    and auth.role() = 'authenticated'
  );

create policy "shop_images_auth_delete"
  on storage.objects for delete
  using (
    bucket_id = 'shop-images'
    and auth.role() = 'authenticated'
  );
