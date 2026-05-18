import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfDay, isToday, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useBookingStore } from "../../../../store/bookingStore";
import { getAvailableSlots } from "../../services/bookingService";

const O = "var(--brand, #FF6B2C)";
const DAY_LABELS = ["Lu","Ma","Mi","Ju","Vi","Sá","Do"];

export default function StepDateTime() {
  const { barber, service, date, slot, setDate, setSlot, nextStep, prevStep, type } = useBookingStore();
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
    <div>
      <button onClick={prevStep} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}>
        <ChevronLeft size={14} /> Atrás
      </button>

      <p style={{ color: O, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Paso 4</p>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>¿Cuándo?</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: 28, fontSize: 14 }}>Selecciona fecha y horario disponible.</p>

      {/* CALENDARIO */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
        {/* nav mes */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button
            onClick={() => setViewMonth(addMonths(viewMonth, -1))}
            disabled={isSameMonth(viewMonth, today)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, opacity: isSameMonth(viewMonth, today) ? 0.3 : 1 }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", textTransform: "capitalize" }}>
            {format(viewMonth, "MMMM yyyy", { locale: es })}
          </span>
          <button onClick={() => setViewMonth(addMonths(viewMonth, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* cabecera */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8 }}>
          {DAY_LABELS.map(l => (
            <div key={l} style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", padding: "4px 0", fontWeight: 600 }}>{l}</div>
          ))}
        </div>

        {/* días */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {Array.from({ length: padStart }).map((_, i) => <div key={`p${i}`} />)}
          {days.map((d) => {
            const disabled = d < today || d > maxDate;
            const isSelected = date === format(d, "yyyy-MM-dd");
            const todayDay = isToday(d);
            return (
              <button
                key={d.toISOString()}
                onClick={() => pickDate(d)}
                disabled={disabled}
                style={{
                  aspectRatio: "1", borderRadius: 10, fontSize: 13, fontWeight: 500, border: "none",
                  cursor: disabled ? "not-allowed" : "pointer",
                  background: isSelected ? O : "transparent",
                  color: isSelected ? "#fff" : disabled ? "var(--text-faint)" : todayDay ? O : "var(--text)",
                  opacity: disabled ? 0.35 : 1,
                  outline: todayDay && !isSelected ? `1px solid ${O}44` : "none",
                }}
              >
                {format(d, "d")}
              </button>
            );
          })}
        </div>
      </div>

      {/* SLOTS */}
      {date && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            Horarios —{" "}
            <span style={{ color: "var(--text)", textTransform: "capitalize" }}>
              {format(new Date(date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
            </span>
          </p>

          {loadingSlots && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} style={{ height: 40, borderRadius: 10, background: "var(--surface2)" }} />)}
            </div>
          )}

          {!loadingSlots && slots.length === 0 && (
            <div style={{ padding: "20px 16px", background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--border)", textAlign: "center" }}>
              <p style={{ fontSize: 20, marginBottom: 6 }}>📅</p>
              <p style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                Sin horarios disponibles
              </p>
              <p style={{ color: "var(--text-faint)", fontSize: 12 }}>
                El barbero no trabaja este día o ya está completo. Elige otra fecha.
              </p>
            </div>
          )}

          {!loadingSlots && slots.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {slots.map(s => (
                <button
                  key={s}
                  onClick={() => setSlot(s)}
                  style={{
                    padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${slot === s ? O : "var(--border)"}`,
                    background: slot === s ? O : "var(--card-bg)",
                    color: slot === s ? "#fff" : "var(--text-muted)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={nextStep}
        disabled={!canContinue}
        style={{
          width: "100%", padding: "16px", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: canContinue ? "pointer" : "not-allowed",
          background: canContinue ? O : "var(--surface2)", color: canContinue ? "#fff" : "var(--text-faint)", border: "none",
        }}
      >
        Continuar
      </button>
    </div>
  );
}
