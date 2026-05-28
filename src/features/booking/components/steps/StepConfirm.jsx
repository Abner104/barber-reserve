import { formatCurrency } from "../../../../lib/utils";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, MapPin, User, Scissors, Calendar, Clock, Loader2, Eye, EyeOff, Upload, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useBookingStore } from "../../../../store/bookingStore";
import { createBooking } from "../../services/bookingService";
import { getDistanceKm, calcDeliveryFee } from "../../../../lib/mapbox";
import { supabase } from "../../../../lib/supabase";
import { uploadImage } from "../../../../components/shared/ImageUpload";

const O = "var(--brand)";
const WA_URL    = import.meta.env.VITE_WA_SERVICE_URL ?? "http://localhost:3001";
const WA_SECRET = import.meta.env.VITE_WA_SECRET ?? "barberos2026secret";
const WA_HEADERS = { "Content-Type": "application/json", "Authorization": `Bearer ${WA_SECRET}` };

const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .confirm-input:focus { border-color: var(--brand) !important; }
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
    const pc = bookingRecord.people_count || 1;
    const message = [
      `🔔 *Nueva reserva* ✂️`, ``,
      `👤 Cliente: ${clientInfo?.full_name ?? "—"}`,
      `📱 Teléfono: ${clientInfo?.phone ?? "—"}`,
      `✂️ Servicio: ${serviceInfo?.name ?? "—"}${pc > 1 ? ` × ${pc} personas` : ""}`,
      `📅 Fecha: ${fecha}`,
      bookingRecord.type === "delivery" ? `📍 Domicilio: ${bookingRecord.address_line ?? ""}` : `📍 En el local`,
      clientInfo?.notes ? `📝 Nota: ${clientInfo.notes}` : "",
    ].filter(Boolean).join("\n");
    await fetch(`${WA_URL}/notify`, {
      method: "POST", headers: WA_HEADERS,
      body: JSON.stringify({ barberId: bookingRecord.barber_id, message }),
    });
  } catch {}
}

async function notifyClient(bookingRecord, clientInfo, serviceInfo, barberName) {
  if (!bookingRecord?.barber_id || !clientInfo?.phone) return;
  try {
    const fecha = bookingRecord.scheduled_at
      ? new Date(bookingRecord.scheduled_at).toLocaleString("es-CL", {
          weekday: "long", day: "numeric", month: "long",
          hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago",
        })
      : "";
    const pc = bookingRecord.people_count || 1;
    const message = [
      `✅ *¡Reserva confirmada!* ✂️`, ``,
      `Hola ${clientInfo?.full_name?.split(" ")[0] ?? ""}! Tu reserva quedó registrada.`,
      ``,
      `✂️ Servicio: ${serviceInfo?.name ?? "—"}${pc > 1 ? ` × ${pc} personas` : ""}`,
      `💈 Barbero: ${barberName ?? "—"}`,
      `📅 ${fecha}`,
      bookingRecord.type === "delivery" ? `📍 A domicilio: ${bookingRecord.address_line ?? ""}` : `📍 En el local`,
      ``,
      `_Si necesitas cancelar o cambiar, contáctanos por este medio._`,
    ].filter(Boolean).join("\n");
    await fetch(`${WA_URL}/notify`, {
      method: "POST", headers: WA_HEADERS,
      body: JSON.stringify({ barberId: bookingRecord.barber_id, toPhone: clientInfo.phone, message }),
    });
  } catch {}
}

export default function StepConfirm() {
  const { type, services, people, barber, date, slot, address, clientInfo, setClientInfo, setStep, prevStep, shopConfig, getTotalDuration, getTotal } = useBookingStore();
  const [form, setForm]         = useState(clientInfo);
  const [errors, setErrors]     = useState({});
  const [showPhone, setShowPhone] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [shopBank, setShopBank] = useState(null);
  const [copiedBank, setCopiedBank] = useState(false);
  const proofInputRef           = useRef(null);

  // Cargar datos bancarios del shop para domicilios
  const shopId = useBookingStore(s => s.shopId);
  useEffect(() => {
    if (type !== "delivery" || !shopId) return;
    supabase.from("barbershops")
      .select("bank_account, bank_name, bank_holder")
      .eq("id", shopId)
      .maybeSingle()
      .then(({ data }) => { if (data) setShopBank(data); });
  }, [type, shopId]);

  async function handleProofUpload(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Máx 5MB"); return; }
    setUploading(true);
    try {
      const url = await uploadImage(file, "delivery-proofs");
      setProofUrl(url);
    } catch { toast.error("Error al subir el comprobante"); }
    finally { setUploading(false); }
  }

  const origin = barber?.lat && barber?.lng
    ? { lat: Number(barber.lat), lng: Number(barber.lng) }
    : shopConfig?.lat && shopConfig?.lng
    ? { lat: shopConfig.lat, lng: shopConfig.lng }
    : { lat: -33.4489, lng: -70.6693 };

  const feePerKm     = shopConfig?.delivery_fee_per_km ?? 650;
  const distanceKm   = type === "delivery" && address.lat ? getDistanceKm(origin, { lat: address.lat, lng: address.lng }) : null;
  const deliveryFee  = distanceKm != null ? calcDeliveryFee(distanceKm, 0, feePerKm) : 0;
  const peopleCount  = people || 1;
  const servicePrice = getTotal();
  const total        = servicePrice + deliveryFee;
  const dateLabel    = date ? format(new Date(date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es }) : "";

  const mutation = useMutation({
    mutationFn: () => createBooking({ type, serviceId: services[0]?.id, serviceIds: services.map(s => s.id), barberId: barber.id, date, slot, durationMin: getTotalDuration(), price: servicePrice, deliveryFee, address, clientInfo: form, proofUrl: proofUrl || null, peopleCount }),
    onSuccess: (booking) => {
      setClientInfo(form);
      setStep(7);
      toast.success("¡Reserva creada!");
      const svcInfo = { name: services.map(s => s.name).join(" + ") };
      notifyBarber(booking, form, svcInfo);
      notifyClient(booking, form, svcInfo, barber?.full_name);
      // Notificar al barbero del comprobante si es domicilio
      if (type === "delivery" && proofUrl) {
        fetch(`${WA_URL}/notify`, {
          method: "POST", headers: WA_HEADERS,
          body: JSON.stringify({
            barberId: booking.barber_id,
            message: `🧾 *Comprobante de domicilio recibido*\n\nCliente: ${form.full_name}\nMonto: ${formatCurrency(deliveryFee)}\n\nRevisa el comprobante antes de salir ✅`,
          }),
        }).catch(() => {});
      }
    },
    onError: (err) => toast.error(err?.message || "Error al crear la reserva"),
  });

  function validate() {
    const e = {};
    if (!form.full_name?.trim()) e.full_name = "Ingresa tu nombre";
    if (!/^\d{7,15}$/.test((form.phone || "").replace(/\s/g, ""))) e.phone = "Teléfono inválido";
    if (type === "delivery" && !proofUrl) e.proof = "Debes subir el comprobante de pago del domicilio";
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
          <SRow icon={<Scissors size={14} />} label={services?.length > 1 ? "Servicios" : "Servicio"} value={services?.map(s => s.name).join(" + ")} sub={peopleCount > 1 ? `${peopleCount} personas · ${formatCurrency(servicePrice)}` : formatCurrency(servicePrice)} />
          <SRow icon={<User size={14} />} label="Barbero" value={barber?.full_name} />
          <SRow icon={<Calendar size={14} />} label="Fecha" value={<span style={{ textTransform: "capitalize" }}>{dateLabel}</span>} />
          <SRow icon={<Clock size={14} />} label="Hora" value={slot} />
          {type === "delivery" && address.line && (
            <SRow icon={<MapPin size={14} />} label="Dirección" value={address.line} accent />
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
            <span>Servicio{peopleCount > 1 ? ` × ${peopleCount}` : ""}</span><span style={{ color: "var(--text)" }}>{formatCurrency(servicePrice)}</span>
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

      {/* Pago domicilio por transferencia */}
      {type === "delivery" && deliveryFee > 0 && (
        <div style={{ background: "var(--card-bg)", border: "2px solid var(--brand)", borderRadius: 20, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand-alpha)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18 }}>💸</span>
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15, color: "var(--text)", marginBottom: 2 }}>Pago del domicilio requerido</p>
              <p style={{ fontSize: 12, color: "var(--text-faint)" }}>Transfiere {formatCurrency(deliveryFee)} antes de confirmar</p>
            </div>
          </div>

          {/* Datos bancarios */}
          {shopBank?.bank_account ? (
            <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {shopBank.bank_name && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: "var(--text-faint)" }}>Banco</span><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{shopBank.bank_name}</span></div>}
                {shopBank.bank_holder && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: "var(--text-faint)" }}>Titular</span><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{shopBank.bank_holder}</span></div>}
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: "var(--text-faint)" }}>Cuenta / RUT</span><span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>{shopBank.bank_account}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: "var(--text-faint)" }}>Monto</span><span style={{ fontSize: 15, fontWeight: 800, color: "var(--brand)" }}>{formatCurrency(deliveryFee)}</span></div>
              </div>
              <button
                onClick={() => {
                  const lines = [
                    shopBank.bank_name   ? `Banco: ${shopBank.bank_name}`     : null,
                    shopBank.bank_holder ? `Titular: ${shopBank.bank_holder}` : null,
                    `Cuenta/RUT: ${shopBank.bank_account}`,
                    `Monto: ${formatCurrency(deliveryFee)}`,
                  ].filter(Boolean).join("\n");
                  navigator.clipboard.writeText(lines);
                  setCopiedBank(true);
                  setTimeout(() => setCopiedBank(false), 2500);
                }}
                style={{ width: "100%", marginTop: 10, padding: "10px", borderRadius: 10, background: copiedBank ? "rgba(34,197,94,0.1)" : "var(--brand-alpha)", border: `1px solid ${copiedBank ? "rgba(34,197,94,0.4)" : "var(--brand)"}`, color: copiedBank ? "#22c55e" : "var(--brand)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {copiedBank ? <Check size={15} /> : <Copy size={15} />}
                {copiedBank ? "¡Copiado!" : "Copiar datos de transferencia"}
              </button>
            </div>
          ) : (
            <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <p style={{ fontSize: 13, color: "var(--text-faint)", textAlign: "center" }}>El barbero te enviará los datos de pago por WhatsApp</p>
            </div>
          )}

          {/* Subir comprobante */}
          <input ref={proofInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => handleProofUpload(e.target.files[0])} />

          {proofUrl ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12 }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>Comprobante subido</p>
                <p style={{ fontSize: 11, color: "var(--text-faint)" }}>El barbero lo revisará antes de salir</p>
              </div>
              <button onClick={() => setProofUrl("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 18 }}>×</button>
            </div>
          ) : (
            <button onClick={() => proofInputRef.current?.click()} disabled={uploading}
              style={{ width: "100%", padding: "12px", borderRadius: 12, background: "var(--surface2)", border: `2px dashed ${errors.proof ? "#ef4444" : "var(--border)"}`, color: "var(--text-muted)", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {uploading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={16} />}
              {uploading ? "Subiendo..." : "📸 Subir foto del comprobante"}
            </button>
          )}
          {errors.proof && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{errors.proof}</p>}
        </div>
      )}

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
