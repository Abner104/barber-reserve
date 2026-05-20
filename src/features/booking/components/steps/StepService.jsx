import { formatCurrency } from "../../../../lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Clock, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useBookingStore } from "../../../../store/bookingStore";
import { getServices } from "../../services/bookingService";

export default function StepService() {
  const { type, service: selected, setService, setStep, step, prevStep } = useBookingStore();

  const shopId = useBookingStore(s => s.shopId);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services", shopId],
    queryFn: () => getServices(shopId),
    enabled: !!shopId,
  });

  const grouped = services.reduce((acc, s) => {
    if (type === "delivery" && !s.allows_delivery) return acc;
    const cat = s.service_categories?.name ?? "Otros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  // Usar setStep directo evita el problema del doble click
  function choose(s) {
    setService(s);
    setStep(step + 1);
  }

  const brand = "var(--brand, #FF6B2C)";

  return (
    <div>
      <button onClick={prevStep} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}>
        <ChevronLeft size={14} /> Atrás
      </button>

      <p style={{ color: brand, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Paso 2</p>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>¿Qué servicio quieres?</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: 28, fontSize: 14 }}>
        {type === "delivery" ? "Solo servicios disponibles a domicilio." : "Todos los servicios disponibles."}
      </p>

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: "var(--surface2)" }} />)}
        </div>
      )}

      {!isLoading && Object.keys(grouped).length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--card-bg)", borderRadius: 16, border: "1px solid var(--border)" }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>✂️</p>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No hay servicios disponibles</p>
          <p style={{ color: "var(--text-faint)", fontSize: 13, lineHeight: 1.5 }}>
            {type === "delivery"
              ? "No hay servicios disponibles a domicilio. Prueba reservando en el local."
              : "La barbería aún no ha configurado sus servicios. Intenta más tarde."}
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 700, marginBottom: 10 }}>{cat}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((s) => {
              const price      = s.price; // domicilio se suma por km en StepConfirm
              const isSelected = selected?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => choose(s)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 18px", borderRadius: 14, cursor: "pointer",
                    textAlign: "left", width: "100%", gap: 12,
                    border: isSelected ? "1px solid var(--brand, #FF6B2C)" : "1px solid var(--border)",
                    background: isSelected ? "var(--brand-alpha, rgba(255,107,44,0.08))" : "var(--card-bg)",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: "var(--text)", marginBottom: 4 }}>{s.name}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-faint)" }}>
                      <Clock size={11} />
                      <span style={{ fontSize: 12 }}>{s.duration_min} min</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: brand }}>{formatCurrency(price)}</p>
                    {type === "delivery" && (
                      <p style={{ fontSize: 10, color: "var(--text-faint)" }}>+ tarifa domicilio</p>
                    )}
                  </div>
                  {isSelected
                    ? <Check size={16} color="var(--brand, #FF6B2C)" />
                    : <ChevronRight size={16} color="var(--text-faint, #555)" />
                  }
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
