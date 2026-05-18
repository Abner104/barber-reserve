-- Agregar columna de slots específicos a working_hours
-- Si available_slots tiene valores, se usan esos slots
-- Si es null, se usa el rango start_time → end_time (backward compat)
alter table working_hours
  add column if not exists available_slots text[] default null;
