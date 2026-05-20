import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { format, addDays, startOfDay, isToday, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useBookingStore } from "../../../../store/bookingStore";
import { getAvailableSlots } from "../../services/bookingService";

const DAY_LABELS = ["Lu","Ma","Mi","Ju","Vi","Sá","Do"];
const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .slot-btn { transition: all .12s ease; }
  .slot-btn:hover:not(:disabled) { transform: scale(1.05); }
`;

export default function StepDateTime() {
  const { barber, service, date, slot, setDate, setSlot, nextStep, prevStep } = useBookingStore();
  const [viewMonth, setViewMonth] = useState(startOfMonth(new Date()));

  const today   = startOfDay(new Date());
  const maxDate = addDays(today, 30);
  const days    = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const padStart = (getDay(startOfMonth(viewMonth)) + 6) % 7;

  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ["slots", barber?.id, date, service?.duration_min],
    queryFn: () => getAvailableSlots({ barberId: barber.id, date, durationMin: service.duration_min }),
    enabled: !!barber && !!date && !!service,
  });

  function pickDate(d) {
    if (d < today || d > maxDate) return;
    setDate(format(d, "yyyy-MM-dd"));
    setSlot(null);
  }

  const canContinue = !!date && !!slot;

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <style>{CSS}</style>

      <button onClick={prevStep} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontSize: 13, marginBottom: 28, padding: 0 }}>
        <ChevronLeft size={15} /> Atrás
      </button>

      <p style={{ color: "var(--brand)", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 10 }}>Elige tu momento</p>
      <h2 style={{ fontSize: 30, fontWeight: 900, color: "var(--text)", lineHeight: 1.1, marginBottom: 32 }}>¿Cuándo?</h2>

      {/* Calendario */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 16px", marginBottom: 20 }}>
        {/* Nav mes */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <button onClick={() => setViewMonth(addMonths(viewMonth, -1))} disabled={isSameMonth(viewMonth, today)}
            style={{ width: 32, height: 32, borderRadius: 10, background: "var(--surface2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", opacity: isSameMonth(viewMonth, today) ? 0.3 : 1 }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 800, fontSize: 15, color: "var(--text)", textTransform: "capitalize" }}>
            {format(viewMonth, "MMMM yyyy", { locale: es })}
          </span>
          <button onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            style={{ width: 32, height: 32, borderRadius: 10, background: "var(--surface2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Cabecera días */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
          {DAY_LABELS.map(l => (
            <div key={l} style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", padding: "4px 0", fontWeight: 700 }}>{l}</div>
          ))}
        </div>

        {/* Días */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {Array.from({ length: padStart }).map((_, i) => <div key={`p${i}`} />)}
          {days.map((d) => {
            const disabled   = d < today || d > maxDate;
            const isSelected = date === format(d, "yyyy-MM-dd");
            const todayDay   = isToday(d);
            return (
              <button key={d.toISOString()} onClick={() => pickDate(d)} disabled={disabled}
                style={{
                  aspectRatio: "1", borderRadius: 12, fontSize: 13, fontWeight: isSelected ? 800 : 500,
                  border: todayDay && !isSelected ? "2px solid var(--brand-alpha)" : "2px solid transparent",
                  cursor: disabled ? "not-allowed" : "pointer",
                  background: isSelected ? "var(--brand)" : "transparent",
                  color: isSelected ? "#fff" : disabled ? "var(--text-faint)" : todayDay ? "var(--brand)" : "var(--text)",
                  opacity: disabled ? 0.3 : 1,
                  transition: "all .12s ease",
                }}
              >
                {format(d, "d")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots de hora */}
      {date && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Clock size={14} color="var(--brand)" />
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
              <span style={{ color: "var(--text)", textTransform: "capitalize" }}>
                {format(new Date(date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
              </span>
            </p>
          </div>

          {loadingSlots && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} style={{ height: 44, borderRadius: 12, background: "var(--surface2)" }} />)}
            </div>
          )}

          {!loadingSlots && slots.length === 0 && (
            <div style={{ padding: "24px 16px", background: "var(--surface2)", borderRadius: 16, textAlign: "center" }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>📅</p>
              <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Sin disponibilidad</p>
              <p style={{ color: "var(--text-faint)", fontSize: 12 }}>El barbero no trabaja este día. Elige otra fecha.</p>
            </div>
          )}

          {!loadingSlots && slots.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {slots.map(s => (
                <button key={s} className="slot-btn" onClick={() => setSlot(s)}
                  style={{
                    padding: "12px 0", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    border: `2px solid ${slot === s ? "var(--brand)" : "var(--border)"}`,
                    background: slot === s ? "var(--brand)" : "var(--card-bg)",
                    color: slot === s ? "#fff" : "var(--text)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button onClick={nextStep} disabled={!canContinue}
        style={{
          width: "100%", padding: "16px", borderRadius: 14, fontSize: 15, fontWeight: 800,
          cursor: canContinue ? "pointer" : "not-allowed",
          background: canContinue ? "var(--brand)" : "var(--surface2)",
          color: canContinue ? "#fff" : "var(--text-faint)",
          border: "none", transition: "all .2s ease",
          boxShadow: canContinue ? "0 4px 20px rgba(0,0,0,0.2)" : "none",
        }}
      >
        {canContinue ? `Continuar — ${slot}` : "Selecciona fecha y hora"}
      </button>
    </div>
  );
}
