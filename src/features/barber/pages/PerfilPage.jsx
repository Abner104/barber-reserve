import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MapPin, Search, X } from "lucide-react";
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

  const [addrInput, setAddrInput]       = useState("");
  const [addrSuggestions, setAddrSugg] = useState([]);
  const [addrLoading, setAddrLoading]  = useState(false);
  const addrDebounce = useRef(null);

  useEffect(() => {
    if (barber && !form) {
      setForm({
        is_active:       barber.is_active,
        does_delivery:   barber.does_delivery,
        delivery_radius: barber.delivery_radius,
        phone:           barber.phone ?? "",
        specialty:       barber.specialty ?? "",
        avatar_url:      barber.avatar_url ?? "",
        lat:             barber.lat ?? null,
        lng:             barber.lng ?? null,
        address:         barber.address ?? "",
      });
      if (barber.address) setAddrInput(barber.address);
    }
  }, [barber, form]);

  // Buscar dirección con Nominatim
  useEffect(() => {
    if (addrDebounce.current) clearTimeout(addrDebounce.current);
    if (!addrInput || addrInput.length < 4 || addrInput === form?.address) { setAddrSugg([]); return; }
    addrDebounce.current = setTimeout(async () => {
      setAddrLoading(true);
      try {
        const q    = encodeURIComponent(addrInput + ", Chile");
        const url  = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=cl&addressdetails=1`;
        const res  = await fetch(url, { headers: { "Accept-Language": "es" } });
        const data = await res.json();
        setAddrSugg(data.map(r => ({
          display: [r.address?.road, r.address?.house_number, r.address?.suburb, r.address?.city || r.address?.town].filter(Boolean).join(", ") || r.display_name.split(",").slice(0,3).join(","),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        })));
      } catch { setAddrSugg([]); }
      finally { setAddrLoading(false); }
    }, 500);
    return () => clearTimeout(addrDebounce.current);
  }, [addrInput]);

  async function selectAddress(s) {
    setAddrInput(s.display);
    setAddrSugg([]);
    setForm(f => ({ ...f, lat: s.lat, lng: s.lng, address: s.display }));
    // Guardar inmediatamente
    const { error } = await supabase.from("barbers").update({ lat: s.lat, lng: s.lng, address: s.display }).eq("id", barber.id);
    if (error) toast.error("Error al guardar dirección");
    else { qc.invalidateQueries(["my-barber-profile"]); toast.success("Dirección base guardada ✅"); }
  }

  function clearAddress() {
    setAddrInput("");
    setAddrSugg([]);
    setForm(f => ({ ...f, lat: null, lng: null, address: "" }));
  }

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
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
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

            {/* Dirección base del barbero */}
            <div style={{ background: "var(--surface2)", borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", marginBottom: 4 }}>MI DIRECCIÓN BASE</p>
              <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12, lineHeight: 1.5 }}>
                Los km del domicilio se calcularán desde aquí. Escribe tu dirección exacta.
              </p>

              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", background: "var(--card-bg)", border: `1px solid ${form.lat ? "var(--brand)" : "var(--border)"}`, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "0 12px", color: form.lat ? "var(--brand)" : "var(--text-faint)" }}>
                    <MapPin size={16} />
                  </div>
                  <input
                    value={addrInput}
                    onChange={e => { setAddrInput(e.target.value); if (form.lat) clearAddress(); }}
                    placeholder="Ej: Arauco 507, La Cisterna"
                    style={{ flex: 1, padding: "11px 0", background: "transparent", border: "none", outline: "none", fontSize: 14, color: "var(--text)", fontFamily: "inherit" }}
                  />
                  {addrLoading && <Loader2 size={14} color="var(--text-faint)" style={{ marginRight: 12, animation: "spin 1s linear infinite" }} />}
                  {form.lat && !addrLoading && (
                    <button onClick={clearAddress} style={{ padding: "0 12px", background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Sugerencias */}
                {addrSuggestions.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, marginTop: 4, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                    {addrSuggestions.map((s, i) => (
                      <button key={i} onClick={() => selectAddress(s)}
                        style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%", padding: "10px 14px", background: "none", border: "none", borderBottom: i < addrSuggestions.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", textAlign: "left" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}>
                        <MapPin size={13} color="var(--text-faint)" style={{ marginTop: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4 }}>{s.display}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {form.lat && (
                <p style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, marginTop: 8 }}>
                  ✓ Dirección configurada — los domicilios se calculan desde aquí
                </p>
              )}
              {!form.lat && (
                <p style={{ fontSize: 11, color: "#f59e0b", marginTop: 8 }}>
                  ⚠️ Sin dirección — los domicilios usarán la ubicación del local
                </p>
              )}
            </div>
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
                      // Activar el día — guardar con slots vacíos pero is_active=true
                      // El barbero luego selecciona los slots
                      supabase.from("working_hours").upsert({
                        shop_id: shopId, barber_id: barberId, day,
                        start_time: "09:00", end_time: "18:00",
                        is_active: true, available_slots: null,
                      }, { onConflict: "barber_id,day" }).then(({ error }) => {
                        if (error) toast.error("Error: " + error.message);
                        else { qc.invalidateQueries(["wh", barberId]); setOpenDay(day); toast.success("Día activado"); }
                      });
                    } else {
                      mut.mutate({ day, slots: [], is_active: false });
                      setOpenDay(null);
                    }
                  }}
                  style={{ width: 40, height: 22, borderRadius: 11, background: active ? "var(--brand, #FF6B2C)" : "var(--border)", border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}
                >
                  <div style={{ position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", left: active ? 20 : 2, transition: "left 0.2s" }} />
                </button>

                <div
                  style={{ flex: 1, cursor: active ? "pointer" : "default" }}
                  onClick={() => active && setOpenDay(isOpen ? null : day)}
                >
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
