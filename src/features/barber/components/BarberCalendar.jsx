import { useState, useRef, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isToday, isSameDay, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BOOKING_STATUS_LABEL } from "../../../lib/constants";
import { formatCurrency } from "../../../lib/utils";

const O = "var(--brand, #FF6B2C)";
const HOURS     = Array.from({ length: 17 }, (_, i) => i + 7); // 07:00–23:00
const DAY_LABELS = ["Lu","Ma","Mi","Ju","Vi","Sá","Do"];

const STATUS_COLOR = {
  pending:     "#f59e0b",
  confirmed:   "#3b82f6",
  in_progress: "#FF6B2C",
  completed:   "#22c55e",
  cancelled:   "#6b7280",
  no_show:     "#6b7280",
};

function getDayBookings(bookings, date) {
  return bookings
    .filter(b => isSameDay(new Date(b.scheduled_at), date))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
}

// ── Tarjeta de reserva ────────────────────────────────────────
function BookingCard({ b, onClick, compact }) {
  const color = STATUS_COLOR[b.status] ?? O;
  const hora  = format(new Date(b.scheduled_at), "HH:mm");
  return (
    <div onClick={() => onClick(b)}
      style={{ background: `${color}14`, border: `1px solid ${color}40`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: compact ? "8px 10px" : "11px 13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: compact ? 13 : 14, color: "var(--text)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {b.clients?.full_name ?? "Cliente"}
        </p>
        <p style={{ fontSize: 11, color: "var(--text-faint)" }}>
          {b.services?.name} · {b.duration_min}min
        </p>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ fontWeight: 800, fontSize: 14, color }}>{hora}</p>
        <p style={{ fontSize: 11, color: "var(--text-faint)" }}>{formatCurrency(b.price)}</p>
      </div>
    </div>
  );
}

function EmptyDay() {
  return (
    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-faint)", fontSize: 13 }}>
      Sin reservas ✂️
    </div>
  );
}

// ── Vista MES ─────────────────────────────────────────────────
function MonthView({ currentDate, bookings, selectedDay, onSelectDay, onSwipe, onEventClick }) {
  const touchStart  = useRef(null);
  const monthStart  = startOfMonth(currentDate);
  const days        = eachDayOfInterval({ start: monthStart, end: endOfMonth(currentDate) });
  const padStart    = (getDay(monthStart) + 6) % 7;
  const selBookings = selectedDay ? getDayBookings(bookings, selectedDay) : [];

  function onTouchStart(e) { touchStart.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) onSwipe(diff > 0 ? 1 : -1);
    touchStart.current = null;
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Cabecera Lu-Do */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 6 }}>
        {DAY_LABELS.map(l => (
          <div key={l} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", padding: "4px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
        ))}
      </div>

      {/* Grid días */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "3px 2px", marginBottom: 16 }}>
        {Array.from({ length: padStart }).map((_, i) => <div key={`p${i}`} />)}
        {days.map(day => {
          const db         = getDayBookings(bookings, day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const isT        = isToday(day);
          const dots       = [...new Set(db.map(b => STATUS_COLOR[b.status] ?? O))].slice(0, 3);
          return (
            <button key={day.toISOString()} onClick={() => onSelectDay(day)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "5px 2px", borderRadius: 10, border: "none", cursor: "pointer", background: isSelected ? O : "transparent", transition: "background 0.15s" }}>
              <span style={{
                fontSize: 14, fontWeight: isT || isSelected ? 800 : 500, lineHeight: 1,
                width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%",
                color: isSelected ? "#fff" : isT ? O : "var(--text)",
                background: !isSelected && isT ? "rgba(255,107,44,0.12)" : "transparent",
              }}>
                {format(day, "d")}
              </span>
              <div style={{ display: "flex", gap: 2, height: 5 }}>
                {dots.map((c, i) => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.8)" : c }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Reservas del día seleccionado */}
      {selectedDay && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            {isToday(selectedDay) ? "Hoy" : format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
          </p>
          {selBookings.length === 0
            ? <EmptyDay />
            : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selBookings.map(b => <BookingCard key={b.id} b={b} onClick={onEventClick} />)}
              </div>
          }
        </div>
      )}
    </div>
  );
}

// ── Vista SEMANA ──────────────────────────────────────────────
function WeekView({ currentDate, bookings, selectedDay, onSelectDay, onSwipe, onEventClick }) {
  const touchStart = useRef(null);
  const weekStart  = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays   = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const selBook    = selectedDay ? getDayBookings(bookings, selectedDay) : [];

  function onTouchStart(e) { touchStart.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) onSwipe(diff > 0 ? 1 : -1);
    touchStart.current = null;
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 14 }}>
        {weekDays.map(day => {
          const db         = getDayBookings(bookings, day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const isT        = isToday(day);
          return (
            <button key={day.toISOString()} onClick={() => onSelectDay(day)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 4px", borderRadius: 12, border: "none", cursor: "pointer", transition: "background 0.15s",
                background: isSelected ? O : isT ? "rgba(255,107,44,0.1)" : "var(--surface2)" }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: isSelected ? "rgba(255,255,255,0.75)" : "var(--text-faint)" }}>
                {format(day, "EEE", { locale: es })}
              </span>
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: isSelected ? "#fff" : isT ? O : "var(--text)" }}>
                {format(day, "d")}
              </span>
              <div style={{ display: "flex", gap: 2, height: 5 }}>
                {db.slice(0,3).map((b, i) => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.7)" : STATUS_COLOR[b.status] ?? O }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            {isToday(selectedDay) ? "Hoy" : format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
          </p>
          {selBook.length === 0
            ? <EmptyDay />
            : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selBook.map(b => <BookingCard key={b.id} b={b} onClick={onEventClick} />)}
              </div>
          }
        </div>
      )}
    </div>
  );
}

// ── Vista DÍA ─────────────────────────────────────────────────
function DayView({ currentDate, bookings, onSwipe, onEventClick }) {
  const touchStart  = useRef(null);
  const dayBookings = getDayBookings(bookings, currentDate);
  const now         = new Date();
  const nowH        = now.getHours();
  const nowM        = now.getMinutes();
  const isToday_    = isToday(currentDate);

  const byHour = {};
  dayBookings.forEach(b => {
    const h = new Date(b.scheduled_at).getHours();
    if (!byHour[h]) byHour[h] = [];
    byHour[h].push(b);
  });

  // Determinar rango de horas a mostrar
  const firstBookingH = dayBookings.length > 0
    ? new Date(dayBookings[0].scheduled_at).getHours()
    : null;
  const lastBookingH  = dayBookings.length > 0
    ? new Date(dayBookings[dayBookings.length - 1].scheduled_at).getHours()
    : null;

  // Mostrar desde 1h antes de la primera reserva (o hora actual si hoy)
  // hasta 1h después de la última reserva (mínimo 4 horas de rango)
  let startH = 7;
  let endH   = 23;
  if (dayBookings.length > 0) {
    startH = Math.max(7, firstBookingH - 1);
    endH   = Math.min(23, lastBookingH + 2);
    // Si es hoy, incluir la hora actual también
    if (isToday_) {
      startH = Math.min(startH, Math.max(7, nowH - 1));
      endH   = Math.max(endH, nowH + 1);
    }
  } else if (isToday_) {
    // Sin reservas hoy: mostrar desde hora actual -1
    startH = Math.max(7, nowH - 1);
    endH   = Math.min(23, nowH + 4);
  } else {
    // Otro día sin reservas: rango de mañana típico
    startH = 9;
    endH   = 20;
  }

  const visibleHours = HOURS.filter(h => h >= startH && h <= endH);

  function onTouchStart(e) { touchStart.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) onSwipe(diff > 0 ? 1 : -1);
    touchStart.current = null;
  }

  if (dayBookings.length === 0 && !isToday_) {
    return (
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <EmptyDay />
      </div>
    );
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {visibleHours.map(h => {
        const hBookings = byHour[h] ?? [];
        const isPast    = isToday_ && h < nowH;
        return (
          <div key={h} style={{ display: "flex", gap: 10, minHeight: hBookings.length > 0 ? "auto" : 56, borderTop: "1px solid var(--border)", position: "relative" }}>
            {/* Hora */}
            <div style={{ width: 46, flexShrink: 0, paddingTop: 10, textAlign: "right", paddingRight: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: isPast ? "rgba(255,255,255,0.15)" : "var(--text-muted)" }}>
                {String(h).padStart(2,"0")}:00
              </span>
            </div>

            {/* Indicador "ahora" */}
            {isToday_ && h === nowH && (
              <div style={{ position: "absolute", left: 46, right: 0, top: `${(nowM / 60) * 100}%`, height: 2, background: O, zIndex: 5, display: "flex", alignItems: "center" }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: O, marginLeft: -5, flexShrink: 0, boxShadow: `0 0 6px ${O}` }} />
              </div>
            )}

            {/* Eventos */}
            <div style={{ flex: 1, padding: "6px 8px 6px 0", display: "flex", flexDirection: "column", gap: 4 }}>
              {hBookings.map(b => (
                <BookingCard key={b.id} b={b} onClick={onEventClick} compact />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function BarberCalendar({ bookings = [], onEventClick }) {
  const [view, setView]             = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  function navigate(dir) {
    if (view === "month") setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    if (view === "week")  setCurrentDate(d => dir > 0 ? addWeeks(d, 1)  : subWeeks(d, 1));
    if (view === "day")   setCurrentDate(d => addDays(d, dir));
  }

  function handleSelectDay(day) {
    setSelectedDay(day);
    setCurrentDate(day);
  }

  function getTitle() {
    if (view === "month") return format(currentDate, "MMMM yyyy", { locale: es });
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "d MMM", { locale: es })} – ${format(we, "d MMM yyyy", { locale: es })}`;
    }
    return isToday(currentDate)
      ? `Hoy, ${format(currentDate, "d 'de' MMMM", { locale: es })}`
      : format(currentDate, "EEEE d 'de' MMMM", { locale: es });
  }

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border)" }}>
        {/* Toggle vista */}
        <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 10, padding: 3, gap: 2, marginBottom: 14 }}>
          {[["month","Mes"], ["week","Semana"], ["day","Día"]].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ flex: 1, padding: "9px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.15s",
                background: view === v ? O : "transparent", color: view === v ? "#fff" : "var(--text-faint)" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Navegación con flechas visibles */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => navigate(-1)}
            style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>

          <p style={{ fontWeight: 800, fontSize: 16, color: "var(--text)", textTransform: "capitalize", textAlign: "center", flex: 1 }}>
            {getTitle()}
          </p>

          <button onClick={() => navigate(1)}
            style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ padding: "14px 16px" }}>
        {view === "month" && (
          <MonthView
            currentDate={currentDate} bookings={bookings}
            selectedDay={selectedDay} onSelectDay={handleSelectDay}
            onSwipe={navigate} onEventClick={onEventClick}
          />
        )}
        {view === "week" && (
          <WeekView
            currentDate={currentDate} bookings={bookings}
            selectedDay={selectedDay} onSelectDay={handleSelectDay}
            onSwipe={navigate} onEventClick={onEventClick}
          />
        )}
        {view === "day" && (
          <DayView
            currentDate={currentDate} bookings={bookings}
            onSwipe={navigate} onEventClick={onEventClick}
          />
        )}
      </div>
    </div>
  );
}
