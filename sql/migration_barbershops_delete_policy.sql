-- Permite borrar barbershops a: super_admin (cualquiera) y al proveedor que
-- refirió esa barbería específica (borrar sus propios referidos de prueba).
-- Antes de esto NO existía ninguna policy de DELETE en barbershops, así que
-- el borrado siempre fallaba silenciosamente por RLS (denegado por defecto).

drop policy if exists "shops_delete" on barbershops;

create policy "shops_delete"
  on barbershops for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'super_admin')
    or
    exists (
      select 1 from suppliers
      where suppliers.profile_id = auth.uid()
        and suppliers.id = barbershops.referred_by_supplier_id
    )
  );
