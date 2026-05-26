import { formatCurrency } from "../../../../lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Clock, ChevronLeft, Check, Users, Plus, Minus } from "lucide-react";
import { useBookingStore } from "../../../../store/bookingStore";
import { getServices } from "../../services/bookingService";

const CSS = `
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .svc-card { transition: all .15s ease; }
  .svc-card:hover { transform: translateX(4px); }
`;

export default function StepService() {
  const { type, services: selected, people, toggleService, setPeople, setStep, step, prevStep, getTotalDuration, getTotal } = useBookingStore();
  const shopId = useBookingStore(s => s.shopId);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services", shopId],
    queryFn: () => getServices(shopId),
    enabled: !!shopId,
  });

  const grouped = services.reduce((acc, s) => {
    if (type === "delivery" && !s.allows_delivery) return acc;
    if (type === "in_store" && s.allows_local === false) return acc;
    const cat = s.service_categories?.name ?? "Otros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const totalPrice    = getTotal();
  const totalDuration = getTotalDuration();
  const canContinue   = selected.length > 0;

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <style>{CSS}</style>

      <button onClick={prevStep} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontSize: 13, marginBottom: 28, padding: 0 }}>
        <ChevronLeft size={15} /> Atrás
      </button>

      <p style={{ color: "var(--brand)", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 10 }}>
        {type === "delivery" ? "Servicios a domicilio" : "Servicios disponibles"}
      </p>
      <h2 style={{ fontSize: 30, fontWeight: 900, color: "var(--text)", lineHeight: 1.1, marginBottom: 8 }}>
        ¿Qué quieres hoy?
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 28 }}>Puedes elegir más de un servicio</p>

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 76, borderRadius: 16, background: "var(--surface2)" }} />)}
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
              const isSelected = selected.some(x => x.id === s.id);
              return (
                <button key={s.id} className="svc-card" onClick={() => toggleService(s)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: s.image_url ? "14px 16px" : "18px 20px",
                    borderRadius: 16, cursor: "pointer",
                    textAlign: "left", width: "100%",
                    border: `2px solid ${isSelected ? "var(--brand)" : "var(--border)"}`,
                    background: isSelected ? "var(--brand-alpha)" : "var(--card-bg)",
                  }}
                >
                  {/* Foto del servicio — se muestra si existe */}
                  {s.image_url ? (
                    <img
                      src={s.image_url}
                      alt={s.name}
                      style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }}
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 10, background: "var(--surface2)", flexShrink: 0 }}>
                      <Clock size={11} color="var(--text-faint)" />
                      <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>{s.duration_min}m</span>
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 2 }}>{s.name}</p>
                    {s.description && <p style={{ fontSize: 12, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.description}</p>}
                    {/* Duración debajo del nombre cuando hay foto */}
                    {s.image_url && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginTop: 4, fontSize: 11, color: "var(--text-faint)" }}>
                        <Clock size={10} /> {s.duration_min}min
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: 16, color: "var(--brand)" }}>{formatCurrency(s.price)}</p>
                    {type === "delivery" && <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 2 }}>+ domicilio</p>}
                  </div>

                  <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isSelected ? "var(--brand)" : "var(--surface2)", border: `2px solid ${isSelected ? "var(--brand)" : "var(--border)"}`, transition: "all .15s" }}>
                    {isSelected && <Check size={13} color="#fff" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Selector personas + resumen */}
      {selected.length > 0 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: 20, marginBottom: 24 }}>
          {/* Servicios seleccionados */}
          <div style={{ marginBottom: 16 }}>
            {selected.map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>
                <span>{s.name} <span style={{ fontSize: 11 }}>({s.duration_min}min)</span></span>
                <span style={{ color: "var(--text)" }}>{formatCurrency(s.price)}</span>
              </div>
            ))}
            {people > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
                <span>× {people} personas</span>
                <span>{totalDuration}min total</span>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: "var(--border)", marginBottom: 16 }} />

          {/* Personas */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Users size={14} color="var(--brand)" />
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", flex: 1 }}>¿Cuántas personas?</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setPeople(Math.max(1, people - 1))}
                style={{ width: 32, height: 32, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                <Minus size={14} />
              </button>
              <span style={{ fontWeight: 800, fontSize: 18, color: "var(--text)", minWidth: 20, textAlign: "center" }}>{people}</span>
              <button onClick={() => setPeople(Math.min(4, people + 1))}
                style={{ width: 32, height: 32, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setStep(step + 1)} disabled={!canContinue}
        style={{
          width: "100%", padding: "16px", borderRadius: 14, fontSize: 15, fontWeight: 800,
          cursor: canContinue ? "pointer" : "not-allowed",
          background: canContinue ? "var(--brand)" : "var(--surface2)",
          color: canContinue ? "#fff" : "var(--text-faint)",
          border: "none", transition: "all .2s ease",
          boxShadow: canContinue ? "0 4px 20px rgba(0,0,0,0.2)" : "none",
        }}
      >
        {canContinue
          ? `Continuar — ${formatCurrency(totalPrice)}${people > 1 ? ` (${people} personas)` : ""}`
          : "Selecciona al menos un servicio"}
      </button>
    </div>
  );
}
