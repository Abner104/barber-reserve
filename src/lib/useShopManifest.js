import { useEffect } from "react";

const MANIFEST_ID  = "app-manifest";
const FAVICON_ID    = "app-favicon";
const TOUCH_ICON_ID = "app-touch-icon";

// Los <link> de manifest/favicon del index.html son fijos — para que cada
// barbería muestre su propio logo (pestaña del navegador + PWA instalada),
// los reapuntamos mientras el cliente navega esa barbería, y los devolvemos
// al genérico de Clippr al salir.
export function useShopManifest(slug, logoUrl) {
  useEffect(() => {
    const manifestLink = document.getElementById(MANIFEST_ID) || document.querySelector('link[rel="manifest"]');
    const originalManifest = manifestLink?.getAttribute("href");
    if (manifestLink && slug) manifestLink.setAttribute("href", `/api/manifest?shop=${encodeURIComponent(slug)}`);

    return () => {
      if (manifestLink && originalManifest) manifestLink.setAttribute("href", originalManifest);
    };
  }, [slug]);

  useEffect(() => {
    const favicon    = document.getElementById(FAVICON_ID);
    const touchIcon  = document.getElementById(TOUCH_ICON_ID);
    const originalFavicon   = favicon?.getAttribute("href");
    const originalTouchIcon = touchIcon?.getAttribute("href");

    if (logoUrl) {
      favicon?.setAttribute("href", logoUrl);
      touchIcon?.setAttribute("href", logoUrl);
    }

    return () => {
      if (favicon && originalFavicon)     favicon.setAttribute("href", originalFavicon);
      if (touchIcon && originalTouchIcon) touchIcon.setAttribute("href", originalTouchIcon);
    };
  }, [logoUrl]);
}
