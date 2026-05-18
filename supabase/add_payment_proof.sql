-- Agregar columna para foto del comprobante de pago
alter table bookings
  add column if not exists payment_proof_url text;
