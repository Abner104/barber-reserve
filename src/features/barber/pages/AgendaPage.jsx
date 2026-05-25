import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Phone, ChevronDown, ChevronUp, MessageCircle, Calendar, List, Ban, X } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import esLocale from "@fullcalendar/core/locales/es";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getMyAgenda, getMyBarberProfile, getMyUpcomingBookings } from "../services/barberService";
import { getBarberWorkingHours } from "../../admin/services/adminService";
import { updateBookingStatus } from "../../admin/services/adminService";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "../../../lib/constants";
import { formatCurrency } from "../../../lib/utils";
import { supabase } from "../../../lib/supabase";

const O = "var(--brand, #FF6B2C)";


const STATUS_ACTIONS = {
  pending:     [{ to: "confirmed",   label: "Confirmar",   color: O         }],
  confirmed:   [{ to: "in_progress", label: "Iniciar",     color: "#3b82f6" },
                { to: "no_show",     label: "No vino",     color: "#f59e0b" }],
  in_progress: [{ to: "completed",   label: "Completar ✓", color: "#22c55e" }],
};

export default function AgendaPage() {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(null);
  const [expanded, setExpanded]         = useState(null);
  const [view, setView]                 = useState("list");
  const [showHorario, setShowHorario]   = useState(false);
  const [horarioDia, setHorarioDia]     = useState(null);
  const [blockModal, setBlockModal]     = useState(false);
  const [blockForm, setBlockForm]       = useState({ date: "", reason: "" });

  const dateStr = selectedDate;

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["my-barber-profile"],
    queryFn:  getMyBarberProfile,
  });

  // Sin filtro de fecha: todas las próximas pendientes/confirmadas
  const { data: upcoming = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ["my-upcoming", profile?.id],
    queryFn:  getMyUpcomingBookings,
    enabled:  !!profile?.id,
    refetchInterval: 30000,
  });

  // Con filtro de fecha: solo ese día
  const { data: dayBookings = [], isLoading: loadingDay } = useQuery({
    queryKey: ["my-agenda", dateStr, profile?.id],
    queryFn:  () => getMyAgenda(dateStr),
    enabled:  !!profile?.id && !!dateStr,
    refetchInterval: 30000,
  });

  const bookings  = dateStr ? dayBookings : upcoming;
  const isLoading = loadingProfile || (dateStr ? loadingDay : loadingUpcoming);

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateBookingStatus(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["my-agenda"],    exact: false, refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["my-upcoming"],  exact: false, refetchType: "all" });
      const msgs = { confirmed: "Confirmada ✅", in_progress: "Iniciada 💈", completed: "Completada 🎉", no_show: "No show marcado" };
      toast.success(msgs[status] ?? "Actualizado");
    },
    onError: () => toast.error("Error al actualizar"),
  });

  function handleActionClick(b, action) {
    statusMut.mutate({ id: b.id, status: action.to });
  }

  // Sin barbero configurado
  if (!loadingProfile && !profile) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <p style={{ fontSize: 40, marginBottom: 12 }}>✂️</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Cuenta no vinculada</p>
      <p style={{ fontSize: 14, color: "var(--text-faint)", lineHeight: 1.5 }}>
        Tu usuario no está vinculado a ningún barbero.<br />
        Pídele al administrador que te configure en el panel.
      </p>
    </div>
  );

  const today    = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  const isToday  = dateStr === today;
  const totalSum = bookings.reduce((s, b) => s + Number(b.price || 0), 0);
  const pending  = bookings.filter(b => b.status === "pending").length;
  const O        = "var(--brand, #FF6B2C)";
  const title    = !dateStr ? "Todas mis reservas" : isToday ? "Mi agenda hoy" : format(new Date(dateStr + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es });

  // Horarios del barbero
  const { data: workingHours = [], refetch: refetchHours } = useQuery({
    queryKey: ["wh", profile?.id],
    queryFn:  () => getBarberWorkingHours(profile.id),
    enabled:  !!profile?.id,
  });

  const DAYS_ES = { monday:"Lunes", tuesday:"Martes", wednesday:"Miércoles", thursday:"Jueves", friday:"Viernes", saturday:"Sábado", sunday:"Domingo" };
  const DAYS_ORDER = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

  async function toggleDay(day, currentHour) {
    if (!profile?.id)      { toast.error("Tu cuenta no está vinculada a un barbero."); return; }
    if (!profile?.shop_id) { toast.error("Sin shop_id — contacta al administrador."); return; }

    const isActive = !(currentHour?.is_active ?? false);

    const payload = {
      shop_id:         profile.shop_id,
      barber_id:       profile.id,
      day,
      start_time:      currentHour?.start_time      ?? "09:00",
      end_time:        currentHour?.end_time         ?? "18:00",
      is_active:       isActive,
      available_slots: currentHour?.available_slots  ?? null,
    };
    const { error } = await supabase.from("working_hours")
      .upsert(payload, { onConflict: "barber_id,day" })
      .select();
    if (error) toast.error("Error: " + error.message);
    else { refetchHours(); toast.success(isActive ? "Día activado ✅" : "Día desactivado"); }
  }

  async function saveSlots(day, slots) {
    if (!profile) return;
    const sorted = [...slots].sort();
    const lastSlot = sorted[sorted.length - 1] ?? "09:00";
    const [h, m]   = lastSlot.split(":").map(Number);
    const t        = h * 60 + m + 30;
    const end      = `${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;

    const { error } = await supabase.from("working_hours").upsert({
      shop_id:         profile.shop_id,
      barber_id:       profile.id,
      day,
      start_time:      sorted[0] ?? "09:00",
      end_time:        end,
      is_active:       true,
      available_slots: sorted.length ? sorted : null,
    }, { onConflict: "barber_id,day" });
    if (error) { console.error("saveSlots error:", error); toast.error("Error: " + error.message); }
    else { refetchHours(); toast.success("Horario guardado ✅"); }
  }

  // Eventos para FullCalendar
  const allBookings = [...bookings, ...upcoming];
  const calEvents   = allBookings.map(b => ({
    id:              b.id,
    title:           `${b.clients?.full_name} · ${b.services?.name}`,
    start:           b.scheduled_at,
    end:             new Date(new Date(b.scheduled_at).getTime() + b.duration_min * 60000).toISOString(),
    backgroundColor: b.type === "delivery" ? "#1d4ed8" : "var(--brand, #FF6B2C)",
    borderColor:     "transparent",
    extendedProps:   b,
  }));

  async function saveBlock() {
    if (!blockForm.date || !profile?.id) return;
    const { error } = await supabase.from("barber_blocks").insert({
      barber_id: profile.id,
      date:      blockForm.date,
      reason:    blockForm.reason || null,
    });
    if (error) toast.error("Error: " + error.message);
    else { toast.success("Día bloqueado ✅ — no recibirás reservas ese día"); setBlockModal(false); setBlockForm({ date: "", reason: "" }); }
  }

  function buildWaLink(b) {
    const phone = b.clients?.phone?.replace(/\D/g, "");
    if (!phone) return null;
    const intl  = phone.startsWith("56") ? phone : `56${phone}`;
    const date  = format(new Date(b.scheduled_at), "EEEE d 'de' MMMM", { locale: es });
    const time  = format(new Date(b.scheduled_at), "HH:mm");
    const msg   = encodeURIComponent(`Hola ${b.clients.full_name} 👋 Te recuerdo tu reserva de *${b.services?.name}* el ${date} a las ${time}. ¡Te espero! ✂️`);
    return `https://wa.me/${intl}?text=${msg}`;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
            {title}
          </h1>
          {pending > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(251,191,36,0.1)", borderRadius: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24" }} />
              <span style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>{pending} pendiente{pending > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
        {/* Toggle Lista / Calendario */}
        <div style={{ display: "flex", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: 3, gap: 3, flexShrink: 0 }}>
          {[["list", <List size={14} />], ["calendar", <Calendar size={14} />]].map(([v, icon]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "6px 10px", borderRadius: 7, border: "none", cursor: "pointer",
              background: view === v ? O : "transparent",
              color: view === v ? "#fff" : "var(--text-faint)",
              display: "flex", alignItems: "center",
            }}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── HORARIO RÁPIDO ── */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 16, overflow: "hidden" }}>
        <button
          onClick={() => setShowHorario(!showHorario)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "none", border: "none", cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🗓️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Mi disponibilidad semanal</span>
            {workingHours.filter(h => h.is_active).length === 0 && (
              <span style={{ fontSize: 11, background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>Sin configurar</span>
            )}
          </div>
          <span style={{ color: "var(--text-faint)", fontSize: 18 }}>{showHorario ? "↑" : "↓"}</span>
        </button>

        {showHorario && (
          <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px" }}>
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>
              Activa el día y agrega las horas en que puedes atender. El cliente solo puede elegir entre esas horas.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DAYS_ORDER.map(day => {
                const h      = workingHours.find(wh => wh.day === day);
                const active = h?.is_active ?? false;
                const slots  = h?.available_slots ?? [];
                return (
                  <DayScheduleEditor
                    key={day}
                    day={day}
                    label={DAYS_ES[day]}
                    active={active}
                    slots={slots}
                    onToggle={() => toggleDay(day, h)}
                    onSave={newSlots => saveSlots(day, newSlots)}
                    O={O}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selector de fecha */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setSelectedDate(null)}
          style={{ padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: !dateStr ? O : "var(--surface2)", color: !dateStr ? "#fff" : "var(--text-muted)" }}>
          Todas
        </button>
        <button onClick={() => setSelectedDate(today)}
          style={{ padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: isToday ? O : "var(--surface2)", color: isToday ? "#fff" : "var(--text-muted)" }}>
          Hoy
        </button>
        <input type="date" value={dateStr ?? ""} onChange={e => setSelectedDate(e.target.value || null)}
          style={{ padding: "7px 12px", borderRadius: 20, background: "var(--surface2)", border: `1px solid ${dateStr && !isToday ? O : "var(--border)"}`, color: "var(--text)", fontSize: 13, cursor: "pointer" }} />
        <button onClick={() => setBlockModal(true)}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", marginLeft: "auto" }}>
          <Ban size={13} /> Bloquear día
        </button>
      </div>

      {/* Modal bloqueo */}
      {blockModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>Bloquear día</p>
              <button onClick={() => setBlockModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 16, lineHeight: 1.5 }}>
              Los clientes no podrán reservar ese día. Útil para vacaciones, descanso o compromisos.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6, display: "block" }}>DÍA A BLOQUEAR</label>
                <input type="date" value={blockForm.date} onChange={e => setBlockForm({ ...blockForm, date: e.target.value })}
                  style={{ width: "100%", padding: "11px 13px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6, display: "block" }}>MOTIVO (opcional)</label>
                <input value={blockForm.reason} onChange={e => setBlockForm({ ...blockForm, reason: e.target.value })}
                  placeholder="Ej: Vacaciones, cita médica..."
                  style={{ width: "100%", padding: "11px 13px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, boxSizing: "border-box", outline: "none" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setBlockModal(false)}
                style={{ flex: 1, padding: "12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={saveBlock} disabled={!blockForm.date}
                style={{ flex: 1, padding: "12px", borderRadius: 10, background: "rgba(239,68,68,0.9)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: !blockForm.date ? 0.5 : 1 }}>
                Bloquear día
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats rápidas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>Reservas</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: "var(--text)" }}>{bookings.length}</p>
        </div>
        <div style={{ background: "var(--card-bg)", border: `1px solid var(--brand-alpha, rgba(255,107,44,0.3))`, borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>Pendientes de confirmar</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: pending > 0 ? "#f59e0b" : O }}>{pending}</p>
        </div>
      </div>

      {/* ── CALENDARIO ── */}
      {view === "calendar" && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
          <style>{`
            .fc { color: var(--text); font-family: inherit; font-size: 13px; }
            .fc-theme-standard td, .fc-theme-standard th, .fc-theme-standard .fc-scrollgrid { border-color: var(--border) !important; }
            .fc .fc-toolbar-title { font-size: 14px; font-weight: 800; color: var(--text); }
            .fc .fc-button { background: var(--surface2) !important; border: 1px solid var(--border) !important; color: var(--text-muted) !important; font-size: 11px !important; border-radius: 6px !important; padding: 4px 8px !important; }
            .fc .fc-button-active { background: var(--brand, #FF6B2C) !important; border-color: var(--brand, #FF6B2C) !important; color: #fff !important; box-shadow: none !important; }
            .fc-daygrid-day-number, .fc-col-header-cell-cushion { color: var(--text-muted) !important; font-size: 11px; text-decoration: none !important; }
            .fc-day-today { background: var(--brand-alpha, rgba(255,107,44,0.05)) !important; }
            .fc-event { border-radius: 5px !important; padding: 1px 4px !important; font-size: 11px !important; font-weight: 600 !important; cursor: pointer !important; }
            .fc-view-harness, .fc-scrollgrid { background: var(--card-bg); }
            .fc-toolbar.fc-header-toolbar { padding: 12px 14px 6px !important; margin-bottom: 0 !important; }
            .fc-timegrid-slot { border-color: var(--border) !important; }
            .fc-timegrid-slot-label { color: var(--text-faint) !important; font-size: 10px !important; }
          `}</style>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={esLocale}
            headerToolbar={{ left: "prev,next", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
            events={calEvents}
            height={480}
            slotMinTime="07:00:00"
            slotMaxTime="23:00:00"
            slotDuration="00:30:00"
            allDaySlot={false}
            nowIndicator
            dateClick={info => {
              setSelectedDate(info.dateStr);
              setView("list");
            }}
            eventContent={info => (
              <div style={{ padding: "1px 3px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontSize: 11 }}>
                {info.timeText} {info.event.title}
              </div>
            )}
          />
        </div>
      )}

      {/* ── LISTA ── */}
      {view === "list" && isLoading && [1,2,3].map(i => (
        <div key={i} style={{ height: 70, borderRadius: 12, background: "var(--surface2)", marginBottom: 8 }} />
      ))}

      {view === "list" && !isLoading && bookings.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-faint)" }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>✂️</p>
          <p style={{ fontSize: 14 }}>
            {dateStr ? "No hay reservas para este día" : "No tienes reservas próximas"}
          </p>
        </div>
      )}

      {view === "list" && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bookings.map(b => {
          const sc      = BOOKING_STATUS_COLOR[b.status] ?? { bg: "var(--surface2)", text: "var(--text-faint)" };
          const actions = STATUS_ACTIONS[b.status] ?? [];
          const isOpen  = expanded === b.id;
          const waLink  = buildWaLink(b);

          return (
            <div key={b.id} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : b.id)}>
                {/* Hora */}
                <div style={{ textAlign: "center", minWidth: 44, flexShrink: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: 15, color: "var(--text)" }}>{format(new Date(b.scheduled_at), "HH:mm")}</p>
                  <p style={{ fontSize: 10, color: "var(--text-faint)" }}>{b.duration_min}m</p>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{b.clients?.full_name}</p>
                    {b.type === "delivery" && <MapPin size={12} color="#3b82f6" />}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-faint)" }}>{b.services?.name}</p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ fontWeight: 700, color: O, fontSize: 13 }}>{formatCurrency(b.price)}</p>
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: sc.bg, color: sc.text, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {BOOKING_STATUS_LABEL[b.status]}
                  </span>
                  {isOpen ? <ChevronUp size={14} color="var(--text-faint)" /> : <ChevronDown size={14} color="var(--text-faint)" />}
                </div>
              </div>

              {/* Detalle expandido */}
              {isOpen && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px", background: "var(--bg)" }}>
                  {b.type === "delivery" && b.address_line && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 10, padding: "8px 10px", background: "rgba(59,130,246,0.08)", borderRadius: 8 }}>
                      <MapPin size={14} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 12, color: "#3b82f6" }}>{b.address_line}</p>
                    </div>
                  )}
                  {b.client_notes && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, fontStyle: "italic" }}>📝 "{b.client_notes}"</p>
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {/* WS recordatorio */}
                    {waLink && (
                      <a href={waLink} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 9, background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)", color: "#25d166", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                        <MessageCircle size={13} /> Recordatorio WS
                      </a>
                    )}
                    {/* Llamar */}
                    {b.clients?.phone && (
                      <a href={`tel:${b.clients.phone}`}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                        <Phone size={13} /> Llamar
                      </a>
                    )}
                    {/* Cambiar estado */}
                    {actions.map(a => (
                      <button key={a.to}
                        onClick={() => handleActionClick(b, a)}
                        disabled={statusMut.isPending}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 9, background: `${a.color}18`, border: `1px solid ${a.color}44`, color: a.color, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>}


    </div>
  );
}

// ── Editor de horario por día ─────────────────────────────────
function DayScheduleEditor({ day, label, active, slots, onToggle, onSave, O }) {
  const [newTime, setNewTime] = useState("");
  const [open, setOpen]       = useState(false);

  function addSlot() {
    if (!newTime || slots.includes(newTime)) return;
    const sorted = [...slots, newTime].sort();
    onSave(sorted);
    setNewTime("");
  }

  function removeSlot(s) {
    onSave(slots.filter(x => x !== s));
  }

  return (
    <div style={{ background: "var(--surface2)", borderRadius: 12, overflow: "hidden", border: `1px solid ${active ? "var(--brand-alpha)" : "transparent"}` }}>
      {/* Fila principal */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
        <button onClick={onToggle}
          style={{ width: 42, height: 24, borderRadius: 12, background: active ? O : "var(--border)", border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
          <div style={{ position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", left: active ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </button>
        <span style={{ flex: 1, fontSize: 14, fontWeight: active ? 700 : 400, color: active ? "var(--text)" : "var(--text-faint)" }}>
          {label}
        </span>
        {active && (
          <>
            <span style={{ fontSize: 12, color: slots.length ? O : "var(--text-faint)", fontWeight: 600 }}>
              {slots.length > 0 ? `${slots.length} hora${slots.length > 1 ? "s" : ""}` : "Sin horas"}
            </span>
            <button onClick={() => setOpen(!open)}
              style={{ fontSize: 11, color: O, background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: "2px 8px" }}>
              {open ? "Cerrar" : "Editar"}
            </button>
          </>
        )}
      </div>

      {/* Panel de horas */}
      {active && open && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border)" }}>
          {/* Horas agregadas */}
          {slots.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 12 }}>
              {slots.map(s => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 10, background: "var(--card-bg)", border: `1px solid ${O}44` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: O }}>{s}</span>
                  <button onClick={() => removeSlot(s)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", padding: 0, display: "flex", alignItems: "center", lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {slots.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 10, marginBottom: 10 }}>
              Agrega las horas en que puedes atender este día.
            </p>
          )}

          {/* Input para agregar hora */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 15, fontFamily: "inherit" }} />
            <button onClick={addSlot} disabled={!newTime || slots.includes(newTime)}
              style={{ padding: "10px 16px", borderRadius: 10, background: newTime && !slots.includes(newTime) ? O : "var(--border)", color: newTime && !slots.includes(newTime) ? "#fff" : "var(--text-faint)", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              + Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
