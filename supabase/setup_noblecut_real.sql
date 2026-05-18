-- Actualiza los datos reales de NobleCut para la demo
-- Cambia los valores según los datos reales del cliente

update barbershops set
  name            = 'NobleCut',           -- nombre real de la barbería
  slug            = 'noblecut',
  city            = 'Santiago',            -- ciudad real
  address         = 'Av. Ejemplo 1234',   -- dirección real
  phone           = '569XXXXXXXX',        -- teléfono real
  whatsapp_number = '569XXXXXXXX',        -- WhatsApp real
  instagram_url   = '@noblecut',          -- instagram real
  tagline         = 'El mejor corte, donde tú estés.',
  theme_mode      = 'dark',
  theme_color     = '#FF6B2C',            -- color de marca (cambia si quieres)
  theme_font      = 'Inter',
  allows_delivery = true,
  delivery_fee_base   = 3000,             -- tarifa base domicilio en CLP
  delivery_fee_per_km = 500,              -- por km adicional
  lat             = -33.4489,            -- coordenadas reales del local
  lng             = -70.6693
where id = 'a0000000-0000-0000-0000-000000000001';

-- Verifica que quedó bien
select id, name, slug, city, theme_color, allows_delivery from barbershops;
