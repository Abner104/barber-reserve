import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Scissors, MapPin } from "lucide-react";
import { getMyCaja } from "../services/barberService";
import { formatCurrency } from "../../../lib/utils";

const O       = "var(--brand, #FF6B2C)";
const PERIODS = { daily: "por día", weekly: "por semana", monthly: "por mes" };

export default function CajaPage() {
  const [selectedDate, setSelectedDate] = useState(null);
  const dateStr  = selectedDate ?? new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  const today    = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  const isToday  = dateStr === today;
  const dateLabel = format(new Date(dateStr + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es });

  const { data, isLoading } = useQuery({
    queryKey: ["my-caja", dateStr],
    queryFn:  () => getMyCaja(dateStr),
    refetchInterval: 30000,
  });

  const bookings   = data?.bookings   ?? [];
  const total      = data?.total      ?? 0;
  const myEarnings = data?.myEarnings ?? 0;
  const deliveries = data?.deliveries ?? 0;
  const model      = data?.model      ?? "percentage";
  const modelInfo  = data?.modelInfo  ?? {};

  function prevDay() {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toLocaleDateString("en-CA"));
  }
  function nextDay() {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toLocaleDateString("en-CA"));
  }

  return (
    <div style={{ width: "100%", maxWidth: "100%" }}>

      {/* Header + nav de fecha */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 800, color: "var(--text)" }}>
          {isToday ? "Mi caja hoy" : "Mi caja"}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={prevDay} style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", textTransform: "capitalize", whiteSpace: "nowrap" }}>
            {dateLabel}
          </span>
          <button onClick={nextDay} style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── CARD PRINCIPAL — LO QUE ES MÍO ── */}
      <div style={{ background: "var(--card-bg)", border: `2px solid var(--brand, #FF6B2C)`, borderRadius: 20, padding: "clamp(20px, 4vw, 32px)", marginBottom: 16 }}>

        {/* Título según modelo */}
        <p style={{ fontSize: 12, color: "var(--brand)", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
          {model === "percentage" && `Porcentaje · ${modelInfo.pct ?? 0}%`}
          {model === "chair_rent" && `Arriendo silla · ${PERIODS[modelInfo.rentPeriod ?? "monthly"]}`}
          {model === "day_rate"   && "Tarifa por día"}
        </p>

        {/* Número grande — LO MÍO */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: "clamp(36px, 8vw, 56px)", fontWeight: 900, color: "var(--brand)", lineHeight: 1 }}>
            {formatCurrency(myEarnings < 0 ? 0 : myEarnings)}
          </p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 6 }}>
            {model === "percentage" && "Lo que te llevas hoy"}
            {model === "chair_rent" && "Lo que facturaste hoy"}
            {model === "day_rate"   && "Tu ganancia neta de hoy"}
          </p>
        </div>

        {/* Desglose simple */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>

          <Row label="Servicios completados" value={bookings.length} isCount />
          <Row label="Total facturado" value={formatCurrency(total)} />

          {deliveries > 0 && (
            <Row label="📍 Incluye domicilios" value={formatCurrency(deliveries)} />
          )}

          {/* Explicación del modelo */}
          {model === "percentage" && (
            <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "10px 14px", marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Tu parte ({modelInfo.pct}%)</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>+{formatCurrency(myEarnings)}</span>
              </div>
            </div>
          )}

          {model === "chair_rent" && (
            <div style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 10, padding: "10px 14px", marginTop: 4 }}>
              <p style={{ fontSize: 12, color: "#a855f7", fontWeight: 600, marginBottom: 4 }}>
                🪑 Arriendo de silla
              </p>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Debes pagar {PERIODS[modelInfo.rentPeriod ?? "monthly"]}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#a855f7" }}>
                  {formatCurrency(modelInfo.rentAmount ?? 0)}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
                Lo que factures es tuyo. El arriendo se paga por separado.
              </p>
            </div>
          )}

          {model === "day_rate" && (
            <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "10px 14px", marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Costo del día</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>-{formatCurrency(modelInfo.dayRate ?? 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Tu ganancia neta</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: myEarnings >= 0 ? "var(--brand)" : "#ef4444" }}>
                  {formatCurrency(myEarnings)}
                </span>
              </div>
              {myEarnings < 0 && (
                <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>
                  Aún no cubres el costo del día. Necesitas {formatCurrency(Math.abs(myEarnings))} más.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── DETALLE DE SERVICIOS ── */}
      {!isLoading && bookings.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
            Servicios del día
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bookings.map(b => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand-alpha)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {b.type === "delivery" ? <MapPin size={16} color={O} /> : <Scissors size={16} color={O} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 14, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.clients?.full_name ?? "Cliente"}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-faint)" }}>
                    {b.services?.name ?? "Servicio"} · {format(new Date(b.scheduled_at), "HH:mm")}
                    {b.type === "delivery" && " · 📍"}
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontWeight: 700, color: O, fontSize: 14 }}>
                    {formatCurrency(b.price_final ?? b.price ?? 0)}
                  </p>
                  {model === "percentage" && (
                    <p style={{ fontSize: 11, color: "var(--text-faint)" }}>
                      tuyo: {formatCurrency((b.price_final ?? b.price ?? 0) * (modelInfo.pct ?? 0) / 100)}
                    </p>
                  )}
                  {model === "day_rate" && (
                    <p style={{ fontSize: 11, color: "var(--text-faint)" }}>tuyo</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && bookings.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16 }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>✂️</p>
          <p style={{ color: "var(--text-faint)", fontSize: 14 }}>
            {isToday ? "Sin servicios hoy aún" : "Sin servicios este día"}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, isCount }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: isCount ? 20 : 13, fontWeight: isCount ? 800 : 600, color: "var(--text)" }}>{value}</span>
    </div>
  );
}
