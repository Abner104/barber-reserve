import { useEffect, useState } from "react";
import { Player } from "@lottiefiles/react-lottie-player";

/**
 * Pantalla de intro animada con Lottie.
 * Dura 1.7s y luego llama onDone() con fade out.
 *
 * Cambia LOTTIE_URL por la animación de tijeras/barbería que elijas.
 */
const LOTTIE_URL = "https://assets10.lottiefiles.com/packages/lf20_hqxfuorc.json";

export default function ShopIntro({ shopName, logoUrl, color = "#FF6B2C", onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1300);
    const t2 = setTimeout(() => onDone(), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg, #0A0A0A)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      opacity: fading ? 0 : 1,
      transition: "opacity 0.5s ease",
    }}>
      {/* Animación Lottie */}
      <Player
        src={LOTTIE_URL}
        autoplay
        loop
        style={{ width: 160, height: 160 }}
      />

      {/* Logo o nombre */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={shopName}
          style={{ height: 32, maxWidth: 140, objectFit: "contain", borderRadius: 6 }}
          onError={e => e.target.style.display = "none"}
        />
      ) : (
        <p style={{ fontSize: 20, fontWeight: 900, color: "var(--text, #fff)", letterSpacing: -0.5 }}>
          {shopName || (
            <>
              <span style={{ color: "var(--text, #fff)" }}>Barber</span>
              <span style={{ color }}>OS</span>
            </>
          )}
        </p>
      )}

      {/* Barra de progreso */}
      <style>{`
        @keyframes si-bar { 0%{transform:translateX(-100%)} 100%{transform:translateX(420%)} }
      `}</style>
      <div style={{ width: 90, height: 2, background: "#1a1a1a", borderRadius: 1, overflow: "hidden" }}>
        <div style={{ width: "28%", height: "100%", background: color, borderRadius: 1, animation: "si-bar 1s ease-in-out infinite" }} />
      </div>
    </div>
  );
}
