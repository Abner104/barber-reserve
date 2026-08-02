import { useEffect } from "react";

const MANIFEST_ID = "app-manifest";

// El <link rel="manifest"> del index.html es fijo — para que cada barbería
// instale la PWA con su propio logo, lo reapuntamos a /api/manifest?shop=slug
// mientras el cliente navega esa barbería, y lo devolvemos al genérico al salir.
export function useShopManifest(slug) {
  useEffect(() => {
    const link = document.getElementById(MANIFEST_ID) || document.querySelector('link[rel="manifest"]');
    if (!link) return;
    const original = link.getAttribute("href");
    if (slug) link.setAttribute("href", `/api/manifest?shop=${encodeURIComponent(slug)}`);
    return () => { if (original) link.setAttribute("href", original); };
  }, [slug]);
}
