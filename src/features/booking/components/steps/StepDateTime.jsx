import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { format, addDays, startOfDay, isToday, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { useBookingStore } from "../../../../store/bookingStore";
import { getAvailableSlots } from "../../services/bookingService";

const DAY_LETTER = ["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"];
const DAY_LABELS = ["Lu","Ma","Mi","Ju","Vi","Sá","Do"];
const RECOMMENDED_COUNT = 2;

function splitByPeriod(slots) {
  const morning = [], afternoon = [], evening = [];
  for (const s of slots) {
    const h = Number(s.slice(0, 2));
    if (h < 13) morning.push(s);
    else if (h < 18) afternoon.push(s);
    else evening.push(s);
  }
  return [
    { label: "Mañana",  items: morning },
    { label: "Tarde",   items: afternoon },
    { label: "Noche",   items: evening },
  ].filter(g => g.items.length > 0);
}

export default function StepDateTime() {
  const { barber, type, date, slot, setDate, setSlot, nextStep, prevStep, getTotalDuration } = useBookingStore();

  const today   = startOfDay(new Date());
  const maxDate = addDays(today, 30);
  const durationMin = getTotalDuration();

  const [weekStart, setWeekStart] = useState(today);
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewMonth, setViewMonth] = useState(startOfMonth(new Date()));

  // Pre-seleccionar hoy al entrar al paso si no hay fecha elegida
  useEffect(() => {
    if (!date) setDate(format(today, "yyyy-MM-dd"));
  }, []);

  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ["barber-slots", barber?.id, date, durationMin, type],
    queryFn:  () => getAvailableSlots({ barberId: barber.id, date, durationMin, type }),
    enabled:  !!barber?.id && !!date,
    staleTime: 0,
  });

  function pickDate(d) {
    if (d < today || d > maxDate) return;
    setDate(format(d, "yyyy-MM-dd"));
    setSlot(null);
    setShowCalendar(false);
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const canGoPrevWeek = addDays(weekStart, -1) >= today;
  const canGoNextWeek = addDays(weekStart, 7) <= maxDate;

  const canContinue = !!date && !!slot;
  const slotsRef    = useRef(null);
  const continueRef = useRef(null);

  useEffect(() => {
    if (!loadingSlots && slots.length > 0 && slotsRef.current) {
      slotsRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [loadingSlots, date]);

  // Al elegir hora, llevar el botón "Continuar" a la vista — en mobile queda fuera de pantalla
  useEffect(() => {
    if (slot && continueRef.current) {
      continueRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [slot]);

  // Calendario de mes completo (acceso a fechas fuera de la semana visible)
  const monthDays  = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const padStart   = (getDay(startOfMonth(viewMonth)) + 6) % 7;

  const recommended = new Set(slots.slice(0, RECOMMENDED_COUNT));
  const groups = splitByPeriod(slots);

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}.slot-btn{transition:all .12s ease}.slot-btn:hover:not(:disabled){transform:scale(1.05)}.day-chip{transition:all .15s ease}.day-chip:hover:not(:disabled){transform:translateY(-2px)}`}</style>

      <button onClick={prevStep} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}>
        <ChevronLeft size={15} /> Atrás
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 24 }}>
        <div>
          <p style={{ color: "var(--brand-text-on-tint, var(--brand))", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 8 }}>Selecciona un horario</p>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", lineHeight: 1.15, textTransform: "capitalize" }}>
            {date ? format(new Date(date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es }) : "¿Cuándo?"}
          </h2>
        </div>
        <button onClick={() => setShowCalendar(v => !v)}
          style={{ width: 40, height: 40, borderRadius: 12, background: showCalendar ? "var(--brand)" : "var(--card-bg)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: showCalendar ? "#fff" : "var(--text-muted)", flexShrink: 0 }}>
          <CalendarIcon size={17} />
        </button>
      </div>

      {/* Tira semanal */}
      {!showCalendar && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
          <button onClick={() => canGoPrevWeek && setWeekStart(addDays(weekStart, -7))} disabled={!canGoPrevWeek}
            style={{ width: 30, height: 30, borderRadius: 9, background: "var(--surface2)", border: "none", cursor: canGoPrevWeek ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", opacity: canGoPrevWeek ? 1 : 0.3, flexShrink: 0 }}>
            <ChevronLeft size={15} />
          </button>

          <div style={{ display: "flex", gap: 6, overflowX: "auto", flex: 1, scrollbarWidth: "none" }}>
            {weekDays.map(d => {
              const disabled   = d < today || d > maxDate;
              const isSelected = date === format(d, "yyyy-MM-dd");
              const todayDay   = isToday(d);
              return (
                <button key={d.toISOString()} className="day-chip" onClick={() => pickDate(d)} disabled={disabled}
                  style={{
                    flex: "1 0 auto", minWidth: 54, padding: "10px 6px", borderRadius: 14, textAlign: "center", cursor: disabled ? "not-allowed" : "pointer",
                    border: isSelected ? "none" : todayDay ? "2px solid var(--brand-alpha)" : "1px solid var(--border)",
                    background: isSelected ? "var(--brand)" : "var(--card-bg)",
                    opacity: disabled ? 0.35 : 1,
                  }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: isSelected ? "rgba(255,255,255,0.85)" : "var(--text-faint)", marginBottom: 4 }}>
                    {DAY_LETTER[getDay(d)]}
                  </p>
                  <p style={{ fontSize: 17, fontWeight: 800, color: isSelected ? "#fff" : todayDay ? "var(--brand)" : "var(--text)" }}>
                    {format(d, "d")}
                  </p>
                </button>
              );
            })}
          </div>

          <button onClick={() => canGoNextWeek && setWeekStart(addDays(weekStart, 7))} disabled={!canGoNextWeek}
            style={{ width: 30, height: 30, borderRadius: 9, background: "var(--surface2)", border: "none", cursor: canGoNextWeek ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", opacity: canGoNextWeek ? 1 : 0.3, flexShrink: 0 }}>
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Calendario de mes (alterna con la tira) */}
      {showCalendar && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 16px", marginBottom: 20 }}>
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
            {DAY_LABELS.map(l => (
              <div key={l} style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", padding: "4px 0", fontWeight: 700 }}>{l}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {Array.from({ length: padStart }).map((_, i) => <div key={`p${i}`} />)}
            {monthDays.map((d) => {
              const disabled   = d < today || d > maxDate;
              const isSelected = date === format(d, "yyyy-MM-dd");
              const todayDay   = isToday(d);
              return (
                <button key={d.toISOString()} onClick={() => { pickDate(d); setWeekStart(d < today ? today : d); }} disabled={disabled}
                  style={{
                    aspectRatio: "1", borderRadius: 12, fontSize: 13, fontWeight: isSelected ? 800 : 500,
                    border: todayDay && !isSelected ? "2px solid var(--brand-alpha)" : "2px solid transparent",
                    cursor: disabled ? "not-allowed" : "pointer",
                    background: isSelected ? "var(--brand)" : "transparent",
                    color: isSelected ? "#fff" : disabled ? "var(--text-faint)" : todayDay ? "var(--brand)" : "var(--text)",
                    opacity: disabled ? 0.3 : 1,
                  }}
                >
                  {format(d, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Horas del barbero */}
      {date && (
        <div ref={slotsRef} style={{ marginBottom: 28 }}>
          {loadingSlots && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height: 52, borderRadius: 12, background: "var(--surface2)" }} />)}
            </div>
          )}

          {!loadingSlots && slots.length === 0 && (
            <div style={{ padding: "24px 16px", background: "var(--surface2)", borderRadius: 16, textAlign: "center" }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>📅</p>
              <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Sin horarios disponibles</p>
              <p style={{ color: "var(--text-faint)", fontSize: 12 }}>El barbero no tiene horas disponibles este día. Elige otra fecha.</p>
            </div>
          )}

          {!loadingSlots && slots.length > 0 && groups.map(group => (
            <div key={group.label} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Clock size={12} color="var(--text-faint)" />
                <p style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{group.label}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {group.items.map(s => {
                  const isSelected = slot === s;
                  const isRecommended = recommended.has(s) && !isSelected;
                  return (
                    <button key={s} className="slot-btn" onClick={() => setSlot(s)}
                      style={{
                        position: "relative", padding: "11px 0", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer",
                        border: `2px solid ${isSelected ? "var(--brand)" : isRecommended ? "var(--brand-alpha2)" : "var(--border)"}`,
                        background: isSelected ? "var(--brand)" : isRecommended ? "var(--brand-alpha)" : "var(--card-bg)",
                        color: isSelected ? "#fff" : "var(--text)",
                      }}
                    >
                      {isRecommended && (
                        <Sparkles size={10} color="var(--brand-text-on-tint, var(--brand))" style={{ position: "absolute", top: 4, right: 5 }} />
                      )}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <button ref={continueRef} onClick={nextStep} disabled={!canContinue}
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
