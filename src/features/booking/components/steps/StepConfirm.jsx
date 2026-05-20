import { formatCurrency } from "../../../../lib/utils";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, MapPin, User, Scissors, Calendar, Clock, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useBookingStore } from "../../../../store/bookingStore";
import { createBooking } from "../../services/bookingService";
import { getDistanceKm, calcDeliveryFee } from "../../../../lib/mapbox";

const O = "var(--brand, #FF6B2C)";
const WA_URL = import.meta.env.VITE_WA_SERVICE_URL ?? "http://localhost:3001";

const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .confirm-input:focus { border-color: var(--brand, #FF6B2C) !important; }
`;

async function notifyBarber(bookingRecord, clientInfo, serviceInfo) {
  if (!bookingRecord?.barber_id) return;
  try {
    const fecha = bookingRecord.scheduled_at
      ? new Date(bookingRecord.scheduled_at).toLocaleString("es-CL", {
          weekday: "short", day: "numeric", month: "short",
          hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago",
        })
      : "";
    const message = [
      `🔔 *Nueva reserva* ✂️`, ``,
      `👤 Cliente: ${clientInfo?.full_name ?? "—"}`,
      `📱 Teléfono: ${clientInfo?.phone ?? "—"}`,
      `✂️ Servicio: ${serviceInfo?.name ?? "—"}`,
      `📅 Fecha: ${fecha}`,
      bookingRecord.type === "delivery" ? `📍 Domicilio: ${bookingRecord.address_line ?? ""}` : `📍 En el local`,
      clientInfo?.notes ? `📝 Nota: ${clientInfo.notes}` : "",
    ].filter(Boolean).join("\n");
    await fetch(`${WA_URL}/notify`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId: bookingRecord.barber_id, message }),
    });
  } catch {}
}

export default function StepConfirm() {
  const { type, service, barber, date, slot, address, clientInfo, setClientInfo, setStep, prevStep, shopConfig } = useBookingStore();
  const [form, setForm] = useState(clientInfo);
  const [errors, setErrors] = useState({});
  const [showPhone, setShowPhone] = useState(false);

  const origin = barber?.lat && barber?.lng
    ? { lat: Number(barber.lat), lng: Number(barber.lng) }
    : shopConfig?.lat && shopConfig?.lng
    ? { lat: shopConfig.lat, lng: shopConfig.lng }
    : { lat: -33.4489, lng: -70.6693 };

  const feePerKm     = shopConfig?.delivery_fee_per_km ?? 650;
  const distanceKm   = type === "delivery" && address.lat ? getDistanceKm(origin, { lat: address.lat, lng: address.lng }) : null;
  const deliveryFee  = distanceKm != null ? calcDeliveryFee(distanceKm, 0, feePerKm) : 0;
  const servicePrice = service?.price ?? 0;
  const total        = servicePrice + deliveryFee;
  const dateLabel    = date ? format(new Date(date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es }) : "";

  const mutation = useMutation({
    mutationFn: () => createBooking({ type, serviceId: service.id, barberId: barber.id, date, slot, durationMin: service.duration_min, price: servicePrice, deliveryFee, address, clientInfo: form }),
    onSuccess: (booking) => {
      setClientInfo(form);
      setStep(7);
      toast.success("¡Reserva creada!");
      notifyBarber(booking, form, service);
    },
    onError: (err) => toast.error(err?.message || "Error al crear la reserva"),
  });

  function validate() {
    const e = {};
    if (!form.full_name?.trim()) e.full_name = "Ingresa tu nombre";
    if (!/^\d{7,15}$/.test((form.phone || "").replace(/\s/g, ""))) e.phone = "Teléfono inválido";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    mutation.mutate();
  }

  const inp = {
    width: "100%", padding: "14px 16px", borderRadius: 12, fontSize: 14, fontFamily: "inherit",
    background: "var(--card-bg)", border: "2px solid var(--border)", color: "var(--text)",
    outline: "none", boxSizing: "border-box", transition: "border-color .15s",
  };

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <style>{CSS}</style>

      <button onClick={prevStep} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontSize: 13, marginBottom: 28, padding: 0 }}>
        <ChevronLeft size={15} /> Atrás
      </button>

      <p style={{ color: "var(--brand)", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 10 }}>Último paso</p>
      <h2 style={{ fontSize: 30, fontWeight: 900, color: "var(--text)", lineHeight: 1.1, marginBottom: 28 }}>Confirmar reserva</h2>

      {/* Resumen */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SRow icon={<Scissors size={14} />} label="Servicio" value={service?.name} sub={formatCurrency(servicePrice)} />
          <SRow icon={<User size={14} />} label="Barbero" value={barber?.full_name} />
          <SRow icon={<Calendar size={14} />} label="Fecha" value={<span style={{ textTransform: "capitalize" }}>{dateLabel}</span>} />
          <SRow icon={<Clock size={14} />} label="Hora" value={slot} />
          {type === "delivery" && address.line && (
            <SRow icon={<MapPin size={14} />} label="Dirección" value={address.line} accent />
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
            <span>Servicio</span><span style={{ color: "var(--text)" }}>{formatCurrency(servicePrice)}</span>
          </div>
          {type === "delivery" && distanceKm != null && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
              <span>Domicilio ({distanceKm.toFixed(1)} km)</span>
              <span style={{ color: "var(--text)" }}>{formatCurrency(deliveryFee)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 18, marginTop: 8 }}>
            <span style={{ color: "var(--text)" }}>Total</span>
            <span style={{ color: "var(--brand)" }}>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Datos cliente */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 700, letterSpacing: 0.5 }}>NOMBRE COMPLETO *</label>
          <input className="confirm-input" style={inp} value={form.full_name || ""} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Juan Pérez" />
          {errors.full_name && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{errors.full_name}</p>}
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 700, letterSpacing: 0.5 }}>WHATSAPP / TELÉFONO *</label>
          <div style={{ position: "relative" }}>
            <input className="confirm-input" style={{ ...inp, paddingRight: 44 }}
              type={showPhone ? "text" : "tel"} value={form.phone || ""}
              onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="56912345678" />
            <button type="button" onClick={() => setShowPhone(!showPhone)}
              style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}>
              {showPhone ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.phone && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{errors.phone}</p>}
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 700, letterSpacing: 0.5 }}>NOTAS PARA EL BARBERO</label>
          <textarea className="confirm-input" style={{ ...inp, resize: "none" }} rows={3}
            value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Ej: fade bien bajo, con línea..." />
        </div>
      </div>

      {mutation.isError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ color: "#ef4444", fontSize: 13 }}>{mutation.error?.message || "Error al crear la reserva"}</p>
        </div>
      )}

      <button onClick={handleSubmit} disabled={mutation.isPending}
        style={{
          width: "100%", padding: "17px", borderRadius: 14, fontSize: 16, fontWeight: 800,
          background: "var(--brand)", color: "#fff", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          opacity: mutation.isPending ? 0.7 : 1,
          boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
        }}
      >
        {mutation.isPending && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
        {mutation.isPending ? "Creando reserva..." : `Confirmar — ${formatCurrency(total)}`}
      </button>

      <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-faint)", marginTop: 14 }}>
        Recibirás confirmación por WhatsApp 📱
      </p>
    </div>
  );
}

function SRow({ icon, label, value, sub, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <span style={{ color: "var(--brand)", marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>{label.toUpperCase()}</p>
        <p style={{ fontSize: 14, color: accent ? "var(--brand)" : "var(--text)", fontWeight: 600, textTransform: label === "Fecha" ? "capitalize" : "none" }}>{value}</p>
        {sub && <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}
