-- Función pública para calcular el estado de suscripción de una barbería
-- sin exponer la tabla shop_payments completa (montos, fechas de todos los
-- pagos) a usuarios anónimos ni a owners de otras barberías.
--
-- Se usa desde: AdminLayout (owner viendo su propio panel) y ShopBookingPage
-- (cliente anónimo reservando) — por eso corre como security definer.

create or replace function public.get_shop_subscription_status(p_shop_id uuid)
returns table (
  is_active    boolean,
  days_left    integer,
  trial_active boolean,
  due_date     timestamptz,
  plan         text,
  shop_name    text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created_at timestamptz;
  v_plan       text;
  v_name       text;
  v_months     integer;
  v_due_date   timestamptz;
  v_diff_days  integer;
begin
  select created_at, plan, name
    into v_created_at, v_plan, v_name
    from public.barbershops
    where id = p_shop_id;

  if v_created_at is null then
    return;
  end if;

  select 1 + count(*) into v_months
    from public.shop_payments
    where shop_id = p_shop_id;

  v_due_date  := v_created_at + (v_months || ' months')::interval;
  v_diff_days := ceil(extract(epoch from (v_due_date - now())) / 86400);

  return query select
    (v_diff_days > 0)                         as is_active,
    greatest(0, v_diff_days)                  as days_left,
    (v_diff_days > 0 and v_diff_days <= 7)     as trial_active,
    v_due_date                                as due_date,
    v_plan                                    as plan,
    v_name                                    as shop_name;
end;
$$;

-- Cualquiera puede llamar la función (necesario para el booking público
-- de clientes anónimos) — pero solo devuelve el estado calculado, nunca
-- los pagos individuales.
grant execute on function public.get_shop_subscription_status(uuid) to anon, authenticated;
