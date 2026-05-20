import { useEffect } from "react";

const FONTS = {
  "Inter":            "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
  "Poppins":          "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap",
  "Montserrat":       "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap",
  "DM Sans":          "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&display=swap",
  "Raleway":          "https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800;900&display=swap",
  "Nunito":           "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap",
  "Oswald":           "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap",
  "Playfair Display": "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap",
  "Space Grotesk":    "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
  "Barlow":           "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap",
};

// Genera una versión más clara/oscura de un color hex
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function lighten(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.min(255, r + amount)}, ${Math.min(255, g + amount)}, ${Math.min(255, b + amount)})`;
}

function darken(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.max(0, r - amount)}, ${Math.max(0, g - amount)}, ${Math.max(0, b - amount)})`;
}

function hexWithAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ThemeProvider({ shop, children }) {
  const mode  = shop?.theme_mode  ?? "dark";
  const color = shop?.theme_color ?? "#FF6B2C";
  const font  = shop?.theme_font  ?? "Inter";

  useEffect(() => {
    // Cargar fuente si no es Inter (ya está en index.html)
    if (font !== "Inter" && FONTS[font]) {
      const existing = document.querySelector(`link[data-shop-font]`);
      if (existing) existing.remove();
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONTS[font];
      link.setAttribute("data-shop-font", "true");
      document.head.appendChild(link);
    }
    return () => {
      const link = document.querySelector(`link[data-shop-font]`);
      if (link) link.remove();
    };
  }, [font]);

  const isDark = mode === "dark";

  const vars = isDark ? {
    "--shop-bg":           "#0A0A0A",
    "--shop-bg-2":         "#0D0D0D",
    "--shop-surface":      "#141414",
    "--shop-surface-2":    "#1E1E1E",
    "--shop-border":       "#2A2A2A",
    "--shop-border-light": "#333",
    "--shop-text":         "#FFFFFF",
    "--shop-text-muted":   "#A0A0A0",
    "--shop-text-faint":   "#555555",
    "--shop-brand":        color,
    "--shop-brand-light":  lighten(color, 20),
    "--shop-brand-dark":   darken(color, 20),
    "--shop-brand-alpha":  hexWithAlpha(color, 0.1),
    "--shop-brand-alpha2": hexWithAlpha(color, 0.06),
    "--shop-btn-text":     "#FFFFFF",
    "--shop-font":         `'${font}', system-ui, sans-serif`,
    "--shop-nav-bg":       "rgba(10,10,10,0.85)",
  } : {
    "--shop-bg":           "#F7F3EF",
    "--shop-bg-2":         "#FFFFFF",
    "--shop-surface":      "#FFFFFF",
    "--shop-surface-2":    "#F0EBE5",
    "--shop-border":       "#E5DED7",
    "--shop-border-light": "#EDE8E3",
    "--shop-text":         "#1A1208",
    "--shop-text-muted":   "#6B5E52",
    "--shop-text-faint":   "#A89688",
    "--shop-brand":        color,
    "--shop-brand-light":  lighten(color, 20),
    "--shop-brand-dark":   darken(color, 20),
    "--shop-brand-alpha":  hexWithAlpha(color, 0.1),
    "--shop-brand-alpha2": hexWithAlpha(color, 0.05),
    "--shop-btn-text":     "#FFFFFF",
    "--shop-font":         `'${font}', system-ui, sans-serif`,
    "--shop-nav-bg":       "rgba(247,243,239,0.9)",
  };

  return (
    <div
      data-theme={mode}
      style={{
        ...vars,
        fontFamily: vars["--shop-font"],
        background: vars["--shop-bg"],
        color:      vars["--shop-text"],
        minHeight:  "100vh",
      }}
    >
      {children}
    </div>
  );
}
