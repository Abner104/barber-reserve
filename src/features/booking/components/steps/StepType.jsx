import { MapPin, Scissors, ChevronRight } from "lucide-react";
import { useBookingStore } from "../../../../store/bookingStore";

export default function StepType() {
  const { setType, step, setStep } = useBookingStore();

  function choose(type) {
    setType(type);
    setStep(step + 1);
  }

  const options = [
    {
      type: "in_store",
      icon: <Scissors size={24} color="var(--brand, #FF6B2C)" />,
      title: "En el local",
      desc: "Ven a la barbería y disfruta el ambiente premium",
      badge: null,
    },
    {
      type: "delivery",
      icon: <MapPin size={24} color="var(--brand, #FF6B2C)" />,
      title: "A domicilio",
      desc: "El barbero va donde estés — casa, oficina o donde quieras",
      badge: "Popular",
    },
  ];

  return (
    <div>
      <p style={{ color: "var(--brand)", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
        Paso 1 de 5
      </p>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", lineHeight: 1.2, marginBottom: 8 }}>
        ¿Dónde quieres el corte?
      </h2>
      <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 15 }}>
        Elige cómo prefieres recibir el servicio.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {options.map((opt) => (
          <button
            key={opt.type}
            onClick={() => choose(opt.type)}
            style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "20px", borderRadius: 16,
              border: "1px solid var(--border)", background: "var(--card-bg)",
              cursor: "pointer", textAlign: "left", width: "100%",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--brand, #FF6B2C)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border, #2A2A2A)"; }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--brand-alpha)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {opt.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{opt.title}</span>
                {opt.badge && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: "var(--brand-alpha)", color: "var(--brand)", padding: "2px 8px", borderRadius: 20, letterSpacing: 0.5 }}>
                    {opt.badge}
                  </span>
                )}
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.4 }}>{opt.desc}</p>
            </div>
            <ChevronRight size={18} color="var(--text-faint, #555)" />
          </button>
        ))}
      </div>
    </div>
  );
}
