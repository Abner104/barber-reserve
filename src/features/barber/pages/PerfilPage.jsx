import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getMyBarberProfile, updateMyAvailability } from "../services/barberService";
import { getBarberWorkingHours } from "../../admin/services/adminService";
import { supabase } from "../../../lib/supabase";
import ImageUpload from "../../../components/shared/ImageUpload";
import { DAYS_OF_WEEK, DAY_LABEL } from "../../../lib/constants";
import SlotPicker from "../../../components/shared/SlotPicker";
import TimeSelect from "../../../components/shared/TimeSelect";
import WhatsAppQR from "../../admin/components/WhatsAppQR";

const O = "var(--brand, #FF6B2C)";

export default function PerfilPage() {
  const qc = useQueryClient();
  const { data: barber, isLoading } = useQuery({ queryKey: ["my-barber-profile"], queryFn: getMyBarberProfile });

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (barber && !form) {
      setForm({
        is_active:      barber.is_active,
        does_delivery:  barber.does_delivery,
        delivery_radius: barber.delivery_radius,
        phone:          barber.phone ?? "",
        specialty:      barber.specialty ?? "",
        avatar_url:     barber.avatar_url ?? "",
      });
    }
  }, [barber, form]);

  const mut = useMutation({
    mutationFn: () => updateMyAvailability(form),
    onSuccess: () => { qc.invalidateQueries(["my-barber-profile"]); toast.success("Perfil actualizado ✅"); },
    onError:   () => toast.error("Error al guardar"),
  });

  if (isLoading || !form) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-faint)" }}>Cargando...</div>
  );

  const inp = { width: "100%", padding: "11px 13px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, boxSizing: "border-box", outline: "none" };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 24 }}>Mi perfil</h1>

      {/* Estado */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Disponibilidad</p>

        <Toggle
          label="Estoy disponible hoy"
          desc={form.is_active ? "Apareces en el sistema de reservas" : "No recibes reservas nuevas"}
          active={form.is_active}
          onChange={v => setForm({ ...form, is_active: v })}
          color="#22c55e"
        />

        <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />

        <Toggle
          label="Hago domicilios"
          desc={form.does_delivery ? `Radio: ${form.delivery_radius} km` : "Solo en el local"}
          active={form.does_delivery}
          onChange={v => setForm({ ...form, does_delivery: v })}
          color={O}
        />

        {form.does_delivery && (
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 6, display: "block", fontWeight: 600 }}>
              Radio máximo (km)
            </label>
            <input
              type="number" min={1} max={50}
              style={{ ...inp, width: 120 }}
              value={form.delivery_radius}
              onChange={e => setForm({ ...form, delivery_radius: Number(e.target.value) })}
            />
          </div>
        )}
      </div>

      {/* Datos personales */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Datos personales</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6, display: "block" }}>WhatsApp / Teléfono</label>
            <input style={inp} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="56912345678" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6, display: "block" }}>Especialidad</label>
            <input style={inp} value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="Fades, Barbas, Diseños..." />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6, display: "block" }}>Foto de perfil</label>
            <ImageUpload
              value={form.avatar_url}
              onChange={url => setForm({ ...form, avatar_url: url })}
              folder="avatars"
              label="Subir foto"
              aspect="square"
              capture="user"
            />
          </div>
        </div>
      </div>

      {/* Horario semanal */}
      {barber?.id && <HorarioEditor barberId={barber.id} shopId={barber.shop_id} />}

      {/* WhatsApp — el barbero conecta su propio WS */}
      {barber?.id && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
            Notificaciones WhatsApp
          </p>
          <WhatsAppQR barberId={barber.id} barberName={barber.full_name} />
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8, lineHeight: 1.5 }}>
            Conecta tu WhatsApp para recibir alertas automáticas cuando llegue una reserva nueva.
          </p>
        </div>
      )}

      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending}
        style={{ width: "100%", padding: "14px", borderRadius: 12, background: O, color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: mut.isPending ? 0.7 : 1 }}
      >
        {mut.isPending && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
        Guardar cambios
      </button>
    </div>
  );
}

function HorarioEditor({ barberId, shopId }) {
  const qc = useQueryClient();
  const [openDay, setOpenDay] = useState(null);

  const { data: hours = [] } = useQuery({
    queryKey: ["wh", barberId],
    queryFn:  () => getBarberWorkingHours(barberId),
  });

  const mut = useMutation({
    mutationFn: async ({ day, slots, is_active }) => {
      const sorted = [...slots].sort();

      function addThirty(time) {
        const [h, m] = time.split(":").map(Number);
        const total  = h * 60 + m + 30;
        return `${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
      }

      const startTime = sorted[0]                 ?? "09:00";
      const lastSlot  = sorted[sorted.length - 1] ?? "09:00";
      const endTime   = addThirty(lastSlot);

      const { error } = await supabase
        .from("working_hours")
        .upsert({
          shop_id:         shopId,
          barber_id:       barberId,
          day,
          start_time:      startTime,
          end_time:        endTime,
          is_active:       is_active && sorted.length > 0,
          available_slots: sorted.length > 0 ? sorted : null,
        }, { onConflict: "barber_id,day" });

      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(["wh", barberId]); toast.success("Horario guardado ✅"); },
    onError:   (e) => { console.error("wh error:", e); toast.error("Error al guardar: " + (e?.message ?? "")); },
  });

  const getDay = (day) => hours.find(h => h.day === day);

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
      <p style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
        Mi horario semanal
      </p>
      <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 16 }}>
        Activa el día y selecciona las horas en que estás disponible
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DAYS_OF_WEEK.map(day => {
          const h       = getDay(day);
          const active  = h?.is_active ?? false;
          const slots   = h?.available_slots ?? [];
          const isOpen  = openDay === day;

          return (
            <div key={day} style={{ background: "var(--surface2)", borderRadius: 12, overflow: "hidden" }}>
              {/* Fila del día */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                {/* Toggle activo */}
                <button
                  onClick={() => {
                    if (!active) {
                      mut.mutate({ day, slots: slots.length ? slots : [], is_active: true });
                      setOpenDay(day);
                    } else {
                      mut.mutate({ day, slots, is_active: false });
                      setOpenDay(null);
                    }
                  }}
                  style={{ width: 40, height: 22, borderRadius: 11, background: active ? "var(--brand, #FF6B2C)" : "var(--border)", border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}
                >
                  <div style={{ position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", left: active ? 20 : 2, transition: "left 0.2s" }} />
                </button>

                <div style={{ flex: 1 }} onClick={() => active && setOpenDay(isOpen ? null : day)} style={{ flex: 1, cursor: active ? "pointer" : "default" }}>
                  <p style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? "var(--text)" : "var(--text-faint)" }}>
                    {DAY_LABEL[day]}
                  </p>
                  {active && (
                    <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1 }}>
                      {slots.length > 0 ? `${slots.length} horario${slots.length > 1 ? "s" : ""}` : "Sin horas seleccionadas"}
                    </p>
                  )}
                </div>

                {active && (
                  <span style={{ fontSize: 11, color: "var(--brand)", fontWeight: 600, cursor: "pointer" }} onClick={() => setOpenDay(isOpen ? null : day)}>
                    {isOpen ? "Cerrar ↑" : "Editar →"}
                  </span>
                )}
              </div>

              {/* SlotPicker expandible */}
              {active && isOpen && (
                <div style={{ padding: "4px 14px 14px", borderTop: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 10, marginTop: 10 }}>
                    Toca las horas en que estarás disponible:
                  </p>
                  <SlotPicker
                    selected={slots}
                    onChange={newSlots => mut.mutate({ day, slots: newSlots, is_active: true })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({ label, desc, active, onChange, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 12, color: "var(--text-faint)" }}>{desc}</p>
      </div>
      <button
        onClick={() => onChange(!active)}
        style={{ width: 46, height: 26, borderRadius: 13, background: active ? color : "var(--border)", border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}
      >
        <div style={{ position: "absolute", top: 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", left: active ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
      </button>
    </div>
  );
}
