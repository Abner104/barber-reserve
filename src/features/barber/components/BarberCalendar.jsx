import { useState, useRef } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BOOKING_STATUS_COLOR, BOOKING_STATUS_LABEL } from "../../../lib/constants";
import { formatCurrency } from "../../../lib/utils";

const O = "var(--brand, #FF6B2C)";
const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 07:00 - 23:00
const DAY_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

const STATUS_COLOR_MAP = {
  pending:     "#f59e0b",
  confirmed:   "#3b82f6",
  in_progress: "#FF6B2C",
  completed:   "#22c55e",
  cancelled:   "#6b7280",
  no_show:     "#6b7280",
};

function getBookingsForDay(bookings, date) {
  return bookings.filter(b => {
    const d = new Date(b.scheduled_at);
    return isSameDay(d, date);
  }).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
}

// ── Vista MES ─────────────────────────────────────────────────
function MonthView({ currentDate, bookings, selectedDay, onSelectDay, onSwipe }) {
  const touchStart = useRef(null);
  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const padStart   = (getDay(monthStart) + 6) % 7; // Lunes = 0

  function handleTouchStart(e) { touchStart.current = e.touches[0].clientX; }
  function handleTouchEnd(e) {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) onSwipe(diff > 0 ? 1 : -1);
    touchStart.current = null;
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Cabecera días semana */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
        {DAY_LABELS.map(l => (
          <div key={l} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", padding: "6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
        ))}
      </div>

      {/* Días */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "3px 2px" }}>
        {Array.from({ length: padStart }).map((_, i) => <div key={`p${i}`} />)}
        {days.map(day => {
          const dayBookings = getBookingsForDay(bookings, day);
          const isSelected  = selectedDay && isSameDay(day, selectedDay);
          const isT         = isToday(day);
          const dotColors   = [...new Set(dayBookings.map(b => STATUS_COLOR_MAP[b.status] ?? O))].slice(0, 3);

          return (
            <button key={day.toISOString()} onClick={() => onSelectDay(day)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 2px", borderRadius: 10, border: "none", cursor: "pointer", background: isSelected ? O : isT ? "rgba(255,107,44,0.12)" : "transparent", transition: "background 0.15s" }}>
              <span style={{ fontSize: 14, fontWeight: isT || isSelected ? 800 : 500, color: isSelected ? "#fff" : isT ? O : "var(--text)", lineHeight: 1, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
                {format(day, "d")}
              </span>
              {/* Puntos de reservas */}
              <div style={{ display: "flex", gap: 2, height: 5, alignItems: "center" }}>
                {dotColors.map((c, i) => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.8)" : c }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Vista SEMANA ──────────────────────────────────────────────
function WeekView({ currentDate, bookings, selectedDay, onSelectDay, onSwipe }) {
  const touchStart = useRef(null);
  const weekStart  = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays   = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function handleTouchStart(e) { touchStart.current = e.touches[0].clientX; }
  function handleTouchEnd(e) {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) onSwipe(diff > 0 ? 1 : -1);
    touchStart.current = null;
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Días de la semana */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 12 }}>
        {weekDays.map(day => {
          const dayBookings = getBookingsForDay(bookings, day);
          const isSelected  = selectedDay && isSameDay(day, selectedDay);
          const isT         = isToday(day);
          return (
            <button key={day.toISOString()} onClick={() => onSelectDay(day)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderRadius: 12, border: "none", cursor: "pointer", background: isSelected ? O : isT ? "rgba(255,107,44,0.1)" : "var(--surface2)", transition: "background 0.15s" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? "rgba(255,255,255,0.8)" : "var(--text-faint)", textTransform: "uppercase" }}>
                {format(day, "EEE", { locale: es })}
              </span>
              <span style={{ fontSize: 17, fontWeight: 800, color: isSelected ? "#fff" : isT ? O : "var(--text)", lineHeight: 1 }}>
                {format(day, "d")}
              </span>
              {dayBookings.length > 0 && (
                <div style={{ display: "flex", gap: 2 }}>
                  {dayBookings.slice(0, 3).map((b, i) => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.7)" : STATUS_COLOR_MAP[b.status] ?? O }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Reservas del día seleccionado */}
      {selectedDay && <DayEvents bookings={getBookingsForDay(bookings, selectedDay)} date={selectedDay} />}
    </div>
  );
}

// ── Vista DÍA ─────────────────────────────────────────────────
function DayView({ currentDate, bookings, onSwipe }) {
  const touchStart = useRef(null);
  const dayBookings = getBookingsForDay(bookings, currentDate);

  function handleTouchStart(e) { touchStart.current = e.touches[0].clientX; }
  function handleTouchEnd(e) {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) onSwipe(diff > 0 ? 1 : -1);
    touchStart.current = null;
  }

  // Construir grilla de horas con eventos posicionados
  const bookingsByHour = {};
  dayBookings.forEach(b => {
    const h = new Date(b.scheduled_at).getHours();
    if (!bookingsByHour[h]) bookingsByHour[h] = [];
    bookingsByHour[h].push(b);
  });

  const now = new Date();
  const nowH = now.getHours();
  const nowM = now.getMinutes();
  const isToday_ = isToday(currentDate);

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ position: "relative" }}>
      {HOURS.map(h => {
        const hBookings = bookingsByHour[h] ?? [];
        const isPast    = isToday_ && h < nowH;
        return (
          <div key={h} style={{ display: "flex", gap: 10, minHeight: 60, borderTop: "1px solid var(--border)", position: "relative" }}>
            {/* Hora */}
            <div style={{ width: 44, flexShrink: 0, paddingTop: 8, textAlign: "right" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: isPast ? "var(--text-faint)" : "var(--text-muted)" }}>
                {String(h).padStart(2,"0")}:00
              </span>
            </div>

            {/* Línea indicadora "ahora" */}
            {isToday_ && h === nowH && (
              <div style={{ position: "absolute", left: 44, right: 0, top: `${(nowM / 60) * 100}%`, height: 2, background: O, zIndex: 10, display: "flex", alignItems: "center" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: O, marginLeft: -4, flexShrink: 0 }} />
              </div>
            )}

            {/* Eventos */}
            <div style={{ flex: 1, padding: "6px 0 6px", display: "flex", flexDirection: "column", gap: 4 }}>
              {hBookings.length === 0 && (
                <div style={{ height: "100%", opacity: isPast ? 0.3 : 0 }} />
              )}
              {hBookings.map(b => {
                const mins  = new Date(b.scheduled_at).getMinutes();
                const color = STATUS_COLOR_MAP[b.status] ?? O;
                return (
                  <div key={b.id} style={{ background: `${color}18`, border: `1.5px solid ${color}55`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: "8px 12px", cursor: "pointer", marginTop: mins > 0 ? `${(mins/60)*56}px` : 0 }}
                    onClick={() => window.__barberCalendarOnEvent?.(b)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 2 }}>{b.clients?.full_name}</p>
                        <p style={{ fontSize: 12, color: "var(--text-faint)" }}>{b.services?.name} · {b.duration_min}min</p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color }}>
                          {format(new Date(b.scheduled_at), "HH:mm")}
                        </p>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 10, background: `${color}22`, color, fontWeight: 700 }}>
                          {BOOKING_STATUS_LABEL[b.status]}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Eventos de un día (usado en semana y mes) ──────────────────
function DayEvents({ bookings, date }) {
  if (bookings.length === 0) return (
    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-faint)", fontSize: 13 }}>
      Sin reservas este día ✂️
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {bookings.map(b => {
        const color = STATUS_COLOR_MAP[b.status] ?? O;
        return (
          <div key={b.id} style={{ background: `${color}10`, border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}
            onClick={() => window.__barberCalendarOnEvent?.(b)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 2 }}>{b.clients?.full_name}</p>
                <p style={{ fontSize: 12, color: "var(--text-faint)" }}>{b.services?.name}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontWeight: 800, fontSize: 15, color }}>{format(new Date(b.scheduled_at), "HH:mm")}</p>
                <p style={{ fontSize: 11, color: "var(--text-faint)" }}>{b.duration_min}min · {formatCurrency(b.price)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function BarberCalendar({ bookings = [], onEventClick }) {
  const [view, setView]               = useState("month"); // month | week | day
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  // Exponer callback globalmente para que los eventos internos lo usen
  window.__barberCalendarOnEvent = onEventClick;

  function navigate(dir) {
    if (view === "month") setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    if (view === "week")  setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    if (view === "day")   setCurrentDate(d => addDays(d, dir));
  }

  function handleSelectDay(day) {
    setSelectedDay(day);
    setCurrentDate(day);
  }

  // Título del header según vista
  function getTitle() {
    if (view === "month") return format(currentDate, "MMMM yyyy", { locale: es });
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "d MMM", { locale: es })} – ${format(we, "d MMM", { locale: es })}`;
    }
    if (view === "day") {
      return isToday(currentDate)
        ? `Hoy, ${format(currentDate, "d 'de' MMMM", { locale: es })}`
        : format(currentDate, "EEEE d 'de' MMMM", { locale: es });
    }
  }

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
      {/* ── Header ── */}
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border)" }}>
        {/* Toggle vista */}
        <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 10, padding: 3, gap: 2, marginBottom: 12 }}>
          {[["month","Mes"], ["week","Semana"], ["day","Día"]].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.15s", background: view === v ? O : "transparent", color: view === v ? "#fff" : "var(--text-faint)" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Navegación */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} />
          </button>
          <p style={{ fontWeight: 800, fontSize: 16, color: "var(--text)", textTransform: "capitalize" }}>{getTitle()}</p>
          <button onClick={() => navigate(1)} style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ padding: "12px 16px", overflowY: "auto", maxHeight: view === "day" ? "65vh" : "auto" }}>
        {view === "month" && (
          <>
            <MonthView
              currentDate={currentDate}
              bookings={bookings}
              selectedDay={selectedDay}
              onSelectDay={handleSelectDay}
              onSwipe={navigate}
            />
            {/* Reservas del día seleccionado */}
            {selectedDay && (
              <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                  {isToday(selectedDay) ? "Hoy" : format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <DayEvents bookings={getBookingsForDay(bookings, selectedDay)} date={selectedDay} />
              </div>
            )}
          </>
        )}

        {view === "week" && (
          <WeekView
            currentDate={currentDate}
            bookings={bookings}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
            onSwipe={navigate}
          />
        )}

        {view === "day" && (
          <DayView
            currentDate={currentDate}
            bookings={bookings}
            onSwipe={navigate}
          />
        )}
      </div>
    </div>
  );
}
