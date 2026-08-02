const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Manifest genérico de Clippr — mismo contenido que public/manifest.json,
// usado cuando no hay slug o la barbería no tiene logo propio.
const DEFAULT_ICON = "/LogoC.png";

export default async function handler(req, res) {
  const slug = req.query.shop;

  let name = "Clippr — Barbería Digital";
  let shortName = "Clippr";
  let icon = DEFAULT_ICON;
  let themeColor = "#FF6B2C";

  if (slug) {
    const url = SUPABASE_URL + "/rest/v1/barbershops"
      + "?slug=eq." + encodeURIComponent(slug)
      + "&select=name,logo_url,theme_color"
      + "&limit=1";
    try {
      const r = await fetch(url, {
        headers: { "Authorization": "Bearer " + SUPABASE_KEY, "apikey": SUPABASE_KEY },
      });
      const rows = await r.json();
      const shop = Array.isArray(rows) ? rows[0] : null;
      if (shop) {
        name      = shop.name;
        shortName = shop.name.slice(0, 12);
        if (shop.logo_url) icon = shop.logo_url;
        if (shop.theme_color) themeColor = shop.theme_color;
      }
    } catch {
      // si falla la consulta, se sirve el manifest genérico igual
    }
  }

  const manifest = {
    name,
    short_name: shortName,
    description: "Reserva tu turno en segundos",
    start_url: slug ? `/${slug}` : "/",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: themeColor,
    orientation: "portrait-primary",
    icons: [
      { src: icon, sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
    categories: ["business", "productivity"],
    lang: "es",
  };

  res.setHeader("Content-Type", "application/manifest+json");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json(manifest);
}
