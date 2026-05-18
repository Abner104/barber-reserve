import { formatCurrency } from "../../../../lib/utils";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, Calendar, Clock, MapPin, User, Scissors, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBookingStore } from "../../../../store/bookingStore";
import { createBooking } from "../../services/bookingService";
import { getDistanceKm, calcDeliveryFee } from "../../../../lib/mapbox";

const O = "var(--brand, #FF6B2C)";
const SHOP_LOCATION = { lat: -33.4489, lng: -70.6693 };
const BASE_FEE = 5000; const FEE_PER_KM = 1500;
const WA_URL    = import.meta.env.VITE_WA_SERVICE_URL ?? "http://localhost:3001";
const WA_SECRET = "barberos2026secret";

async function notifyBarber(bookingRecord) {
  if (!bookingRecord) { console.log("❌ notifyBarber: no booking record"); return; }
  console.log("📤 Llamando a WS service:", WA_URL, bookingRecord?.id);
  try {
    const res = await fetch(`${WA_URL}/notify`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${WA_SECRET}`,
      },
      body: JSON.stringify({ record: bookingRecord }),
    });
    const data = await res.json();
    console.log("✅ WS service response:", data);
  } catch (err) {
    console.error("❌ WS service error:", err);
  }
}


export default function StepConfirm() {
  const { type, service, barber, date, slot, address, clientInfo, setClientInfo, setStep, prevStep } = useBookingStore();
  const [form, setForm] = useState(clientInfo);
  const [errors, setErrors] = useState({});

  const distanceKm   = type === "delivery" && address.lat ? getDistanceKm(SHOP_LOCATION, { lat: address.lat, lng: address.lng }) : null;
  const deliveryFee  = distanceKm != null ? calcDeliveryFee(distanceKm, BASE_FEE, FEE_PER_KM) : 0;
  const servicePrice = type === "delivery" && service?.price_delivery != null ? service.price_delivery : service?.price ?? 0;
  const total        = servicePrice + deliveryFee;
  const barberName   = barber?.full_name ?? "Barbero";
  const dateLabel    = date ? format(new Date(date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es }) : "";

  const mutation = useMutation({
    mutationFn: () => createBooking({
      type,
      serviceId:   service.id,
      barberId:    barber.id,
      date,
      slot,
      durationMin: service.duration_min,
      price:       servicePrice,
      deliveryFee: deliveryFee,
      address,
      clientInfo:  form,
    }),
    onSuccess: (booking) => {
      setClientInfo(form);
      setStep(7);
      toast.success("¡Reserva creada con éxito!");
      // Notificar al barbero via WS (el frontend tiene acceso a localhost:3001)
      notifyBarber(booking);
    },
    onError: (err) => { console.error("createBooking error:", err); toast.error(err?.message || "Error al crear la reserva. Intenta de nuevo."); },
  });

  function validate() {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Ingresa tu nombre";
    if (!/^\d{7,15}$/.test(form.phone.replace(/\s/g, ""))) e.phone = "Teléfono inválido";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    mutation.mutate();
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 12, fontSize: 14,
    background: "var(--card-bg)", border: "1px solid var(--border)", color: "var(--text)",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div>
      <button onClick={prevStep} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}>
        <ChevronLeft size={14} /> Atrás
      </button>

      <p style={{ color: O, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Último paso</p>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", marginBottom: 28 }}>Confirmar reserva</h2>

      {/* resumen */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 18, marginBottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <SummaryRow icon={<Scissors size={14} />} label="Servicio" value={service?.name} />
        <SummaryRow icon={<User size={14} />} label="Barbero" value={barberName} />
        <SummaryRow icon={<Calendar size={14} />} label="Fecha" value={<span style={{ textTransform: "capitalize" }}>{dateLabel}</span>} />
        <SummaryRow icon={<Clock size={14} />} label="Hora" value={slot} />
        <SummaryRow icon={<MapPin size={14} />} label={type === "delivery" ? "Dirección" : "Modalidad"} value={type === "delivery" ? (address.line || address.place_name) : "En el local"} />

        <div style={{ borderTop: "1px solid #2A2A2A", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)" }}>
            <span>Servicio</span><span style={{ color: "var(--text)" }}>{formatCurrency(servicePrice)}</span>
          </div>
          {type === "delivery" && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)" }}>
              <span>Domicilio {distanceKm ? `(${distanceKm.toFixed(1)} km)` : ""}</span>
              <span style={{ color: "var(--text)" }}>{formatCurrency(deliveryFee)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, marginTop: 4 }}>
            <span>Total</span><span style={{ color: O }}>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* datos cliente */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>Nombre completo *</label>
          <input
            style={inputStyle}
            value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })}
            placeholder="Juan Pérez"
            onFocus={e => e.target.style.borderColor = O}
            onBlur={e => e.target.style.borderColor = "var(--border, #2A2A2A)"}
          />
          {errors.full_name && <p style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>{errors.full_name}</p>}
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>WhatsApp / Teléfono *</label>
          <input
            style={inputStyle}
            type="tel"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="3001234567"
            onFocus={e => e.target.style.borderColor = O}
            onBlur={e => e.target.style.borderColor = "var(--border, #2A2A2A)"}
          />
          {errors.phone && <p style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>{errors.phone}</p>}
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>Notas para el barbero</label>
          <textarea
            style={{ ...inputStyle, resize: "none" }}
            rows={3}
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Ej: fade bien bajo, con línea..."
            onFocus={e => e.target.style.borderColor = O}
            onBlur={e => e.target.style.borderColor = "var(--border, #2A2A2A)"}
          />
        </div>
      </div>

      {mutation.isError && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
          <p style={{ color: "#f87171", fontSize: 13, fontWeight: 600 }}>Error al crear la reserva</p>
          <p style={{ color: "#f87171", fontSize: 12, marginTop: 4, opacity: 0.8 }}>
            {mutation.error?.message || "Revisa la consola del browser para más detalles."}
          </p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={mutation.isPending}
        style={{
          width: "100%", padding: 16, borderRadius: 14, fontSize: 15, fontWeight: 700,
          background: O, color: "var(--text)", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          opacity: mutation.isPending ? 0.7 : 1,
        }}
      >
        {mutation.isPending && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
        {mutation.isPending ? "Reservando..." : "Confirmar reserva"}
      </button>
    </div>
  );
}

function SummaryRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <span style={{ color: "var(--text-faint)", marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ color: "var(--text-muted)", fontSize: 13, flexShrink: 0 }}>{label}</span>
        <span style={{ color: "var(--text)", fontSize: 13, textAlign: "right" }}>{value}</span>
      </div>
    </div>
  );
}
