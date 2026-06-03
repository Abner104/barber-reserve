import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Providers from "./app/providers";
import { applyTheme } from "./lib/applyTheme";
import "./styles/globals.css";

// Aplicar tema dark por defecto ANTES de renderizar cualquier componente
applyTheme({ theme_mode: "dark", theme_color: "#FF6B2C", theme_font: "Inter" });

// Registrar Service Worker para PWA + Push notifications
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>
);