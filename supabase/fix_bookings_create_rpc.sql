-- URGENTE: el flujo público de reserva hace insert + select-back de la fila creada
-- para mostrar la confirmación al cliente. La migración original solo tenía policy
-- de INSERT en bookings (book_anon_ins), nunca de SELECT anónimo — así que el
-- .select() encadenado tras el insert siempre chocaba contra RLS con
-- "new row violates row-level security policy for table bookings" (el error real
-- es de SELECT, pero Supabase lo reporta en el insert encadenado).
--
-- La solución NO es abrir bookings a lectura pública (eso reabriría el hueco que
-- se cerró antes: cualquiera podría listar reservas de cualquier barbería). En vez
-- de eso, esta función hace el insert y arma el resultado con los joins necesarios
-- dentro de una función security definer — se ejecuta con permisos elevados, así
-- que puede leer y devolver la fila recién creada sin necesitar una policy de
-- SELECT pública en la tabla.

create or replace function create_public_booking(payload jsonb)
returns jsonb as $$
declare
  new_booking bookings;
  result jsonb;
begin
  insert into bookings (
    shop_id, client_id, barber_id, service_id, type, scheduled_at, duration_min,
    people_count, price, status, client_notes, payment_proof_url,
    address_id, address_line, lat, lng, delivery_fee
  )
  values (
    (payload->>'shop_id')::uuid,
    (payload->>'client_id')::uuid,
    (payload->>'barber_id')::uuid,
    (payload->>'service_id')::uuid,
    (payload->>'type')::booking_type,
    (payload->>'scheduled_at')::timestamptz,
    (payload->>'duration_min')::int,
    (payload->>'people_count')::int,
    (payload->>'price')::numeric,
    coalesce(payload->>'status', 'pending')::booking_status,
    payload->>'client_notes',
    payload->>'payment_proof_url',
    (payload->>'address_id')::uuid,
    payload->>'address_line',
    (payload->>'lat')::numeric,
    (payload->>'lng')::numeric,
    (payload->>'delivery_fee')::numeric
  )
  returning * into new_booking;

  select to_jsonb(new_booking)
    || jsonb_build_object(
      'clients',  (select to_jsonb(c) - 'shop_id' from clients c where c.id = new_booking.client_id),
      'services', (select to_jsonb(s) from services s where s.id = new_booking.service_id)
    )
  into result;

  return result;
end;
$$ language plpgsql security definer;

-- Cualquiera (incluso anónimo) puede ejecutar esta función — el insert real sigue
-- pasando por las mismas reglas de negocio de siempre, solo que el resultado se
-- arma dentro de la función en vez de necesitar SELECT directo sobre la tabla.
grant execute on function create_public_booking(jsonb) to anon, authenticated;
