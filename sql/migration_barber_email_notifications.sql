-- El email del barbero solo vivía en auth.users (Supabase Auth), no accesible
-- desde el frontend para mandarle notificación de reserva nueva. Se guarda una
-- copia directa en barbers, igual patrón que el campo phone.
alter table public.barbers
  add column if not exists email text;

-- Rellenar para barberos existentes que ya tienen cuenta (profile_id → auth.users)
update public.barbers b
set email = u.email
from public.profiles p
join auth.users u on u.id = p.id
where b.profile_id = p.id
  and b.email is null;
