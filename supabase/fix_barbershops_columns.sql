-- ============================================================
-- FIX: Asegura que todas las columnas de barbershops existen
-- Ejecuta esto si tienes problemas guardando configuración
-- ============================================================

-- Columnas de theming (si no las tienes aún)
alter table barbershops
  add column if not exists theme_mode       text    default 'dark',
  add column if not exists theme_color      text    default '#FF6B2C',
  add column if not exists theme_font       text    default 'Inter',
  add column if not exists cover_url        text,
  add column if not exists tagline          text;

-- Columnas básicas que pueden faltar
alter table barbershops
  add column if not exists address          text,
  add column if not exists city             text,
  add column if not exists whatsapp_number  text,
  add column if not exists instagram_url    text,
  add column if not exists logo_url         text;

-- Verificar que el update funciona (reemplaza con tu shop_id real)
-- select id, name, city, theme_mode from barbershops limit 5;
