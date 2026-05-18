import { formatCurrency } from "../../../lib/utils";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import esLocale from "@fullcalendar/core/locales/es";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import {
  Check, X, Clock, MapPin, MessageCircle, ChevronDown,
  Calendar, List, Phone, User, Scissors,
} from "lucide-react";
import { toast } from "sonner";
import { getBookings, updateBookingStatus, getAdminBarbers } from "../services/adminService";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "../../../lib/constants";

const O = "var(--brand, #FF6B2C)";

const STATUS_ACTIONS = {
  pending:     [{ to: "confirmed", label: "Confirmar", color: "var(--brand)" }, { to: "cancelled", label: "Cancelar", color: "#ef4444" }],
  confirmed:   [{ to: "in_progress", label: "Iniciar", color: "#3b82f6" }, { to: "cancelled", label: "Cancelar", color: "#ef4444" }],
  in_progress: [{ to: "completed", label: "Completar", color: "#22c55e" }],
  completed:   [],
  cancelled:   [],
  no_show:     [],
};


function buildWaLink(booking) {
  const phone = booking.clients?.phone?.replace(/\D/g, "");
  if (!phone) return null;
  const intlPhone = phone.startsWith("56") ? phone : `56${phone}`;
  const date = format(new Date(booking.scheduled_at), "EEEE d 'de' MMMM", { locale: es });
  const time = format(new Date(booking.scheduled_at), "HH:mm");
  const type = booking.type === "delivery" ? `📍 A domicilio: ${booking.address_line || ""}` : "📍 En el local";
  const msg = encodeURIComponent(
    `Hola ${booking.clients?.full_name} 👋\n\n` +
    `Tu reserva en *NobleCut* está *confirmada* ✅\n\n` +
    `✂️ Servicio: ${booking.services?.name}\n` +
    `👤 Barbero: ${booking.barbers?.full_name}\n` +
    `📅 Fecha: ${date}\n` +
    `🕐 Hora: ${time}\n` +
    `${type}\n\n` +
    `¡Te esperamos! 💈`
  );
  return `https://wa.me/${intlPhone}?text=${msg}`;
}

export default function BookingsPage() {
  const qc = useQueryClient();
  const [view, setView]           = useState("list");
  const [selectedDate, setSelectedDate] = useState(null); // null = sin filtro de fecha
  const [filterBarber, setFilterBarber] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [detailId, setDetailId]   = useState(null);

  // Rango de fechas — null significa "todas las próximas"
  const { from, to } = useMemo(() => {
    if (view === "calendar") {
      const ref = selectedDate ?? new Date();
      return {
        from: startOfMonth(ref).toISOString(),
        to:   endOfMonth(ref).toISOString(),
      };
    }
    if (!selectedDate) {
      // Sin filtro: desde ahora en adelante
      return { from: new Date().toISOString(), to: null };
    }
    const d = format(selectedDate, "yyyy-MM-dd");
    return { from: `${d}T00:00:00-04:00`, to: `${d}T23:59:59-04:00` };
  }, [view, selectedDate]);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["admin-bookings", from, to, filterBarber, filterStatus],
    queryFn:  () => getBookings({ from, to: to ?? undefined, barberId: filterBarber || undefined, status: filterStatus || undefined }),
    refetchInterval: 30000,
  });

  const { data: barbers = [] } = useQuery({ queryKey: ["admin-barbers"], queryFn: getAdminBarbers });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateBookingStatus(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"], exact: false });
      qc.invalidateQueries({ queryKey: ["today-bookings"],  exact: false });
      qc.invalidateQueries({ queryKey: ["admin-stats"],     exact: false });
      const msgs = {
        confirmed:   "Reserva confirmada ✅",
        in_progress: "Servicio iniciado 💈",
        completed:   "Servicio completado 🎉",
        cancelled:   "Reserva cancelada",
        no_show:     "Marcado como no show",
      };
      toast.success(msgs[status] ?? "Estado actualizado");
    },
    onError: () => toast.error("Error al actualizar el estado"),
  });

  // Para FullCalendar
  const calendarEvents = bookings.map(b => ({
    id:    b.id,
    title: `${b.clients?.full_name} · ${b.services?.name}`,
    start: b.scheduled_at,
    end:   new Date(new Date(b.scheduled_at).getTime() + b.duration_min * 60000).toISOString(),
    backgroundColor: b.type === "delivery" ? "#1d4ed8" : O,
    borderColor:     "transparent",
    extendedProps:   b,
  }));

  const detail = detailId ? bookings.find(b => b.id === detailId) : null;

  const dateLabel = selectedDate
    ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
    : "Todas las próximas";

  return (
    <div className="admin-page" style={{ maxWidth: "min(1100px, 100%)" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>Reservas</h1>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4, textTransform: "capitalize" }}>{dateLabel}</p>
        </div>

        {/* Toggle vista */}
        <div style={{ display: "flex", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 10, padding: 4, gap: 4 }}>
          {[["list", <List size={15} />, "Lista"], ["calendar", <Calendar size={15} />, "Calendario"]].map(([v, icon, label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7,
              background: view === v ? O : "transparent", color: view === v ? "#fff" : "#555",
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── FILTROS ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="date"
            value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
            onChange={e => setSelectedDate(e.target.value ? new Date(e.target.value + "T12:00:00") : null)}
            style={{ padding: "8px 12px", borderRadius: 9, background: "var(--card-bg)", border: `1px solid ${selectedDate ? "var(--brand, #FF6B2C)" : "var(--border)"}`, color: "var(--text)", fontSize: 13, cursor: "pointer" }}
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              title="Ver todas"
              style={{ padding: "8px 10px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-faint)", cursor: "pointer", fontSize: 12 }}
            >
              ✕ Todas
            </button>
          )}
        </div>
        <select
          value={filterBarber}
          onChange={e => setFilterBarber(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 9, background: "var(--card-bg)", border: "1px solid var(--border)", color: filterBarber ? "#fff" : "#555", fontSize: 13, cursor: "pointer" }}
        >
          <option value="">Todos los barberos</option>
          {barbers.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 9, background: "var(--card-bg)", border: "1px solid var(--border)", color: filterStatus ? "#fff" : "#555", fontSize: 13, cursor: "pointer" }}
        >
          <option value="">Todos los estados</option>
          {Object.entries(BOOKING_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        {/* contador */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: "var(--text-faint)", fontSize: 13 }}>
          <span style={{ color: "var(--brand)", fontWeight: 700 }}>{bookings.length}</span> reservas
        </div>
      </div>

      {/* ── VISTA LISTA ── */}
      {view === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {isLoading && [1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 12, background: "var(--card-bg)" }} />)}

          {!isLoading && bookings.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-faint)" }}>
              <Calendar size={36} style={{ marginBottom: 10, opacity: 0.3, margin: "0 auto 12px" }} />
              <p>No hay reservas para este día.</p>
            </div>
          )}

          {bookings.map(b => {
            const sc    = BOOKING_STATUS_COLOR[b.status] ?? { bg: "#1E1E1E", text: "#555" };
            const waUrl = buildWaLink(b);
            const actions = STATUS_ACTIONS[b.status] ?? [];
            const isOpen  = detailId === b.id;

            return (
              <div key={b.id} style={{ background: "var(--card-bg)", border: `1px solid ${isOpen ? O + "44" : "#1E1E1E"}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.2s" }}>
                {/* fila principal */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer" }} onClick={() => setDetailId(isOpen ? null : b.id)}>

                  {/* hora */}
                  <div style={{ textAlign: "center", minWidth: 48, flexShrink: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>{format(new Date(b.scheduled_at), "HH:mm")}</p>
                    <p style={{ fontSize: 10, color: "var(--text-faint)" }}>{b.duration_min}min</p>
                  </div>

                  <div style={{ width: 1, height: 36, background: "var(--border)", flexShrink: 0 }} />

                  {/* info principal */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                      <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{b.clients?.full_name}</p>
                      {b.type === "delivery" && (
                        <span style={{ fontSize: 10, color: "#3b82f6", background: "rgba(59,130,246,0.1)", padding: "2px 7px", borderRadius: 20, display: "flex", alignItems: "center", gap: 3 }}>
                          <MapPin size={9} /> Domicilio
                        </span>
                      )}
                    </div>
                    <p style={{ color: "var(--text-faint)", fontSize: 12 }}>
                      {b.services?.name} · {b.barbers?.full_name}
                    </p>
                  </div>

                  {/* precio */}
                  <p style={{ fontWeight: 700, color: "var(--brand)", fontSize: 14, flexShrink: 0 }}>
                    {formatCurrency((b.price || 0) + (b.delivery_fee || 0))}
                  </p>

                  {/* estado badge */}
                  <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.text, flexShrink: 0, whiteSpace: "nowrap" }}>
                    {BOOKING_STATUS_LABEL[b.status]}
                  </span>

                  <ChevronDown size={16} color="#333" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                </div>

                {/* detalle expandible */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--card-border)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

                    {/* info detallada */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                      <InfoRow icon={<User size={13} />} label="Cliente" value={b.clients?.full_name} />
                      <InfoRow icon={<Phone size={13} />} label="Teléfono" value={b.clients?.phone || "—"} />
                      <InfoRow icon={<Scissors size={13} />} label="Servicio" value={b.services?.name} />
                      <InfoRow icon={<User size={13} />} label="Barbero" value={b.barbers?.full_name} />
                      {b.type === "delivery" && <InfoRow icon={<MapPin size={13} />} label="Dirección" value={b.address_line || "—"} />}
                      {b.client_notes && <InfoRow icon={<MessageCircle size={13} />} label="Nota cliente" value={b.client_notes} />}
                    </div>

                    {/* acciones */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {/* WhatsApp */}
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)", color: "#25d166", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </a>
                      )}

                      {/* Llamar */}
                      {b.clients?.phone && (
                        <a
                          href={`tel:${b.clients.phone}`}
                          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                        >
                          <Phone size={14} /> Llamar
                        </a>
                      )}

                      {/* Cambiar estado */}
                      {actions.map(a => (
                        <button
                          key={a.to}
                          onClick={() => statusMut.mutate({ id: b.id, status: a.to })}
                          disabled={statusMut.isPending}
                          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, background: `${a.color}18`, border: `1px solid ${a.color}44`, color: a.color, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                        >
                          {a.to === "completed" && <Check size={13} />}
                          {a.to === "cancelled" && <X size={13} />}
                          {a.to === "confirmed" && <Check size={13} />}
                          {a.to === "in_progress" && <Clock size={13} />}
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── VISTA CALENDARIO ── */}
      {view === "calendar" && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16, overflow: "hidden" }}>
          <style>{`
            .fc { color: #fff; font-family: Inter, sans-serif; }
            .fc-theme-standard td, .fc-theme-standard th, .fc-theme-standard .fc-scrollgrid { border-color: #1E1E1E !important; }
            .fc .fc-toolbar-title { font-size: 16px; font-weight: 800; color: #fff; }
            .fc .fc-button { background: #1E1E1E !important; border: 1px solid #2A2A2A !important; color: #A0A0A0 !important; font-size: 12px !important; border-radius: 8px !important; }
            .fc .fc-button:hover { background: #2A2A2A !important; color: #fff !important; }
            .fc .fc-button-primary:not(.fc-button-active) { background: #1E1E1E !important; }
            .fc .fc-button-active, .fc .fc-button-primary:focus { background: ${O} !important; border-color: ${O} !important; color: #fff !important; box-shadow: none !important; }
            .fc-daygrid-day-number, .fc-col-header-cell-cushion { color: #A0A0A0 !important; font-size: 12px; text-decoration: none !important; }
            .fc-day-today { background: rgba(255,107,44,0.04) !important; }
            .fc-event { border-radius: 6px !important; padding: 2px 6px !important; font-size: 11px !important; font-weight: 600 !important; cursor: pointer !important; }
            .fc-event-title { font-weight: 600 !important; }
            .fc-timegrid-slot { border-color: #1A1A1A !important; }
            .fc-timegrid-slot-label { color: #555 !important; font-size: 11px !important; }
            .fc-toolbar.fc-header-toolbar { padding: 16px 20px 8px !important; }
            .fc-view-harness { background: #141414; }
            .fc-scrollgrid { background: #141414; }
          `}</style>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={esLocale}
            headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
            events={calendarEvents}
            height={620}
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            eventClick={info => setDetailId(info.event.id)}
            dateClick={info => {
              setSelectedDate(new Date(info.dateStr + "T12:00:00"));
              setView("list");
            }}
            nowIndicator
            allDaySlot={false}
            eventContent={renderEventContent}
          />
        </div>
      )}

      {/* ── MODAL DETALLE desde calendario ── */}
      {view === "calendar" && detail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setDetailId(null)}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 440 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: 18, color: "var(--text)" }}>{detail.clients?.full_name}</p>
                <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 2 }}>
                  {format(new Date(detail.scheduled_at), "EEEE d MMM · HH:mm", { locale: es })}
                </p>
              </div>
              <button onClick={() => setDetailId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              <InfoRow icon={<Scissors size={13} />} label="Servicio" value={detail.services?.name} />
              <InfoRow icon={<User size={13} />} label="Barbero" value={detail.barbers?.full_name} />
              <InfoRow icon={<Phone size={13} />} label="Teléfono" value={detail.clients?.phone || "—"} />
              {detail.type === "delivery" && <InfoRow icon={<MapPin size={13} />} label="Dirección" value={detail.address_line || "—"} />}
              {detail.client_notes && <InfoRow icon={<MessageCircle size={13} />} label="Nota" value={detail.client_notes} />}
              <InfoRow icon={<Clock size={13} />} label="Total" value={formatCurrency((detail.price || 0) + (detail.delivery_fee || 0))} orange />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {buildWaLink(detail) && (
                <a href={buildWaLink(detail)} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)", color: "#25d166", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
              {(STATUS_ACTIONS[detail.status] ?? []).map(a => (
                <button key={a.to} onClick={() => { statusMut.mutate({ id: detail.id, status: a.to }); setDetailId(null); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, background: `${a.color}18`, border: `1px solid ${a.color}44`, color: a.color, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderEventContent(eventInfo) {
  return (
    <div style={{ padding: "1px 4px", overflow: "hidden" }}>
      <p style={{ fontWeight: 700, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {eventInfo.timeText} · {eventInfo.event.title}
      </p>
    </div>
  );
}

function InfoRow({ icon, label, value, orange }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={{ color: "var(--text-faint)", marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div style={{ display: "flex", gap: 8, flex: 1 }}>
        <span style={{ color: "var(--text-faint)", fontSize: 12, width: 72, flexShrink: 0 }}>{label}</span>
        <span style={{ color: orange ? O : "#D0D0D0", fontSize: 12, fontWeight: orange ? 700 : 400 }}>{value}</span>
      </div>
    </div>
  );
}
