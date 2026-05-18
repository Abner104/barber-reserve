-- ============================================================
-- MIGRACIÓN: Theming por barbería (white label)
-- Ejecuta en SQL Editor de Supabase
-- ============================================================

alter table barbershops
  add column if not exists theme_mode       text    default 'dark'    check (theme_mode in ('dark','light')),
  add column if not exists theme_color      text    default '#FF6B2C',
  add column if not exists theme_font       text    default 'Inter'   check (theme_font in ('Inter','Poppins','Playfair Display','Montserrat','DM Sans')),
  add column if not exists cover_url        text,
  add column if not exists tagline          text;

-- Actualizar NobleCut de prueba con tema oscuro (el default)
update barbershops
set
  theme_mode  = 'dark',
  theme_color = '#FF6B2C',
  theme_font  = 'Inter',
  tagline     = 'El corte perfecto, donde tú estés.'
where slug = 'noblecut';
