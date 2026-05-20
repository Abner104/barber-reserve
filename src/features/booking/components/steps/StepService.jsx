import { formatCurrency } from "../../../../lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Clock, ChevronLeft, Check } from "lucide-react";
import { useBookingStore } from "../../../../store/bookingStore";
import { getServices } from "../../services/bookingService";

const CSS = `
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .svc-card { transition: all .15s ease; }
  .svc-card:hover { transform: translateX(4px); }
`;

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

  function choose(s) { setService(s); setStep(step + 1); }

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <style>{CSS}</style>

      <button onClick={prevStep} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontSize: 13, marginBottom: 28, padding: 0 }}>
        <ChevronLeft size={15} /> Atrás
      </button>

      <p style={{ color: "var(--brand)", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 10 }}>
        {type === "delivery" ? "Servicios a domicilio" : "Servicios disponibles"}
      </p>
      <h2 style={{ fontSize: 30, fontWeight: 900, color: "var(--text)", lineHeight: 1.1, marginBottom: 32 }}>
        ¿Qué quieres hoy?
      </h2>

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 76, borderRadius: 16, background: "var(--surface2)", animation: "pulse 1.5s ease-in-out infinite" }} />)}
        </div>
      )}

      {!isLoading && Object.keys(grouped).length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--card-bg)", borderRadius: 20, border: "1px solid var(--border)" }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>✂️</p>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Sin servicios disponibles</p>
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>
            {type === "delivery" ? "No hay servicios a domicilio. Prueba reservando en el local." : "Aún no hay servicios configurados."}
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 700, marginBottom: 12, paddingLeft: 4 }}>{cat}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((s) => {
              const isSelected = selected?.id === s.id;
              return (
                <button key={s.id} className="svc-card" onClick={() => choose(s)}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "18px 20px", borderRadius: 16, cursor: "pointer",
                    textAlign: "left", width: "100%",
                    border: `2px solid ${isSelected ? "var(--brand)" : "var(--border)"}`,
                    background: isSelected ? "var(--brand-alpha)" : "var(--card-bg)",
                  }}
                >
                  {/* Duración pill */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 10, background: "var(--surface2)", flexShrink: 0 }}>
                    <Clock size={11} color="var(--text-faint)" />
                    <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>{s.duration_min}m</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 2 }}>{s.name}</p>
                    {s.description && <p style={{ fontSize: 12, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.description}</p>}
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: 16, color: "var(--brand)" }}>{formatCurrency(s.price)}</p>
                    {type === "delivery" && <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 2 }}>+ domicilio</p>}
                  </div>

                  {isSelected && (
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={13} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
