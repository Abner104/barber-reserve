import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TrendingUp, Scissors, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { getMyCaja } from "../services/barberService";
import { formatCurrency } from "../../../lib/utils";

const O = "var(--brand, #FF6B2C)";

export default function CajaPage() {
  const [selectedDate, setSelectedDate] = useState(null);

  const dateStr = selectedDate ?? new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });

  const { data, isLoading } = useQuery({
    queryKey: ["my-caja", dateStr],
    queryFn:  () => getMyCaja(dateStr),
    refetchInterval: 60000,
  });

  const bookings     = data?.bookings     ?? [];
  const total        = data?.total        ?? 0;
  const commission   = data?.commission   ?? 0;
  const deliveries   = data?.deliveries   ?? 0;
  const commPct      = data?.commissionPct ?? 0;
  const myEarnings   = total - commission; // lo que le queda al dueño (o al barbero si cobra al revés)

  const dateLabel = format(new Date(dateStr + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es });

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
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)" }}>Mi caja</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={prevDay} style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            <ChevronLeft size={16} />
          </button>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", textTransform: "capitalize", minWidth: 120, textAlign: "center" }}>
            {dateLabel}
          </p>
          <button onClick={nextDay} style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Resumen financiero */}
      <div style={{ background: "var(--card-bg)", border: `1px solid var(--brand-alpha, rgba(255,107,44,0.3))`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: "var(--text-faint)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Resumen del día</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 4 }}>Total generado</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: O }}>{formatCurrency(total)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 4 }}>Servicios</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: "var(--text)" }}>{bookings.length}</p>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {deliveries > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                <MapPin size={12} /> Tarifa domicilios
              </span>
              <span style={{ color: "var(--text)", fontWeight: 600 }}>{formatCurrency(deliveries)}</span>
            </div>
          )}
          {commPct > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--text-muted)" }}>Mi comisión ({commPct}%)</span>
              <span style={{ color: "#22c55e", fontWeight: 700 }}>+{formatCurrency(commission)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, paddingTop: 4, borderTop: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text)" }}>
              {commPct > 0 ? "Lo que gano" : "Total cobrado"}
            </span>
            <span style={{ color: O }}>{formatCurrency(commPct > 0 ? commission : total)}</span>
          </div>
        </div>
      </div>

      {/* Detalle por servicio */}
      <p style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
        Detalle
      </p>

      {isLoading && [1,2,3].map(i => (
        <div key={i} style={{ height: 56, borderRadius: 10, background: "var(--surface2)", marginBottom: 8 }} />
      ))}

      {!isLoading && bookings.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-faint)" }}>
          <p>Sin servicios registrados este día</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bookings.map(b => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand-alpha)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {b.type === "delivery" ? <MapPin size={16} color={O} /> : <Scissors size={16} color={O} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 14, marginBottom: 2 }}>{b.clients?.full_name}</p>
              <p style={{ fontSize: 12, color: "var(--text-faint)" }}>
                {b.services?.name} · {format(new Date(b.scheduled_at), "HH:mm")}
              </p>
            </div>
            <p style={{ fontWeight: 700, color: O, fontSize: 14, flexShrink: 0 }}>{formatCurrency(b.price)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
