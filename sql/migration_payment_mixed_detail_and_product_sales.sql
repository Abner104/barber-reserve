-- 1. Detalle de pago mixto: cuando payment_method = 'mixed', permite guardar
--    cómo se dividió (ej: "$5.000 efectivo + $10.000 transferencia").
alter table public.bookings
  add column if not exists payment_mixed_detail text;

-- 2. Separar venta de productos de la producción del barbero (ver siguiente
--    migración de código: product_sales_total ahora se guarda aparte del
--    price/price_final que sí cuenta para comisión/rendimiento).
alter table public.bookings
  add column if not exists product_sales_total numeric(10,2) not null default 0;
