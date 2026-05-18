/**
 * Aplica el tema de la barbería como CSS variables en document.body.
 * Funciona tanto en el admin como en las páginas públicas.
 */

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`;
}

function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`;
}

function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function applyTheme(shop) {
  const mode  = shop?.theme_mode  ?? "dark";
  const color = shop?.theme_color ?? "#FF6B2C";
  const font  = shop?.theme_font  ?? "Inter";

  const isDark = mode === "dark";

  const vars = isDark ? {
    "--bg":           "#0A0A0A",
    "--bg2":          "#0D0D0D",
    "--surface":      "#141414",
    "--surface2":     "#1E1E1E",
    "--border":       "#2A2A2A",
    "--border2":      "#333333",
    "--text":         "#FFFFFF",
    "--text-muted":   "#A0A0A0",
    "--text-faint":   "#555555",
    "--sidebar-bg":   "#0F0F0F",
    "--sidebar-border": "#1E1E1E",
    "--input-bg":     "#1E1E1E",
    "--card-bg":      "#141414",
    "--card-border":  "#1E1E1E",
  } : {
    "--bg":           "#F5F0EB",
    "--bg2":          "#FFFFFF",
    "--surface":      "#FFFFFF",
    "--surface2":     "#EDE8E3",
    "--border":       "#DDD8D2",
    "--border2":      "#E8E3DD",
    "--text":         "#1A1208",
    "--text-muted":   "#6B5E52",
    "--text-faint":   "#9E8E82",
    "--sidebar-bg":   "#FFFFFF",
    "--sidebar-border": "#DDD8D2",
    "--input-bg":     "#F0EBE5",
    "--card-bg":      "#FFFFFF",
    "--card-border":  "#DDD8D2",
  };

  // Brand siempre es el color elegido
  vars["--brand"]       = color;
  vars["--brand-light"] = lighten(color, 20);
  vars["--brand-dark"]  = darken(color, 20);
  vars["--brand-alpha"] = rgba(color, 0.1);
  vars["--brand-alpha2"]= rgba(color, 0.06);
  vars["--btn-text"]    = "#FFFFFF";
  vars["--font"]        = `'${font}', system-ui, sans-serif`;

  // Aplicar al body
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute("data-theme", mode);
  root.style.background = vars["--bg"];
  root.style.color      = vars["--text"];
  root.style.fontFamily = vars["--font"];

  // Cargar fuente si no es Inter
  if (font !== "Inter") {
    const existing = document.querySelector("link[data-app-font]");
    if (existing?.dataset.font !== font) {
      if (existing) existing.remove();
      const urls = {
        "Poppins":          "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap",
        "Playfair Display": "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap",
        "Montserrat":       "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap",
        "DM Sans":          "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap",
      };
      if (urls[font]) {
        const link = document.createElement("link");
        link.rel  = "stylesheet";
        link.href = urls[font];
        link.setAttribute("data-app-font", "true");
        link.dataset.font = font;
        document.head.appendChild(link);
      }
    }
  }
}

export function resetTheme() {
  applyTheme({ theme_mode: "dark", theme_color: "#FF6B2C", theme_font: "Inter" });
}
