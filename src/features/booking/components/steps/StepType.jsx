import { MapPin, Scissors, Store, ArrowRight } from "lucide-react";
import { useBookingStore } from "../../../../store/bookingStore";

const CSS = `
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .type-card { transition: all .18s ease; border: 2px solid var(--border) !important; }
  .type-card:hover { border-color: var(--brand) !important; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.15); }
`;

export default function StepType() {
  const { setType, step, setStep } = useBookingStore();

  function choose(type) { setType(type); setStep(step + 1); }

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <style>{CSS}</style>

      <p style={{ color: "var(--brand)", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 10 }}>¿Cómo prefieres?</p>
      <h2 style={{ fontSize: 30, fontWeight: 900, color: "var(--text)", lineHeight: 1.1, marginBottom: 6 }}>
        Elige tu experiencia
      </h2>
      <p style={{ color: "var(--text-muted)", marginBottom: 36, fontSize: 14, lineHeight: 1.6 }}>
        Puedes venir al local o hacemos el corte donde estés.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* En el local */}
        <button className="type-card" onClick={() => choose("in_store")}
          style={{ display: "flex", alignItems: "center", gap: 20, padding: "22px 22px", borderRadius: 18, background: "var(--card-bg)", cursor: "pointer", textAlign: "left", width: "100%" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--brand-alpha)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Store size={26} color="var(--brand)" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 17, color: "var(--text)", marginBottom: 4 }}>En el local</p>
            <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>Ven a la barbería y disfruta la experiencia completa</p>
          </div>
          <ArrowRight size={18} color="var(--text-faint)" />
        </button>

        {/* A domicilio */}
        <button className="type-card" onClick={() => choose("delivery")}
          style={{ display: "flex", alignItems: "center", gap: 20, padding: "22px 22px", borderRadius: 18, background: "var(--card-bg)", cursor: "pointer", textAlign: "left", width: "100%", position: "relative" }}>
          <div style={{ position: "absolute", top: -10, right: 16, background: "var(--brand)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 12px", borderRadius: 20, letterSpacing: 1 }}>
            POPULAR
          </div>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--brand-alpha)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MapPin size={26} color="var(--brand)" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 17, color: "var(--text)", marginBottom: 4 }}>A domicilio</p>
            <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>El barbero va donde estés — casa, oficina o donde quieras</p>
          </div>
          <ArrowRight size={18} color="var(--text-faint)" />
        </button>
      </div>
    </div>
  );
}
