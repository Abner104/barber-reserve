import { Player } from "@lottiefiles/react-lottie-player";

/**
 * Loader global usando Lottie.
 * Cambia LOTTIE_URL por la animación que elijas en lottiefiles.com
 * Recomendaciones para buscar: "scissors", "barber", "loading barber"
 */

// URL de animación de loading — cámbiala por la que elijas
// Esta es una animación de tijeras de Lottiefiles (pública)
const LOTTIE_URL = "/animations/Scissors Cutting Animation.json";

export default function BarberLoader({
  message  = "Cargando...",
  shopName = null,
  color    = "#FF6B2C",
}) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0A",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    }}>
      <style>{`
        @keyframes lb-blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes lb-bar   { 0%{transform:translateX(-100%)} 100%{transform:translateX(420%)} }
        .lb-txt { animation: lb-blink 1.5s ease-in-out infinite; }
        .lb-bar { animation: lb-bar 1.2s ease-in-out infinite; }
      `}</style>

      {/* Animación Lottie */}
      <Player
        src={LOTTIE_URL}
        autoplay
        loop
        style={{ width: 140, height: 140 }}
      />

      {/* Nombre */}
      {shopName ? (
        <p style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>
          {shopName}
        </p>
      ) : (
        <p style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>
          <span style={{ color: "#fff" }}>Barber</span>
          <span style={{ color }}>OS</span>
        </p>
      )}

      {/* Mensaje */}
      <p className="lb-txt" style={{ color: "#444", fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase" }}>
        {message}
      </p>

      {/* Barra de progreso */}
      <div style={{ width: 100, height: 2, background: "#1a1a1a", borderRadius: 1, overflow: "hidden" }}>
        <div className="lb-bar" style={{ width: "28%", height: "100%", background: color, borderRadius: 1 }} />
      </div>
    </div>
  );
}
