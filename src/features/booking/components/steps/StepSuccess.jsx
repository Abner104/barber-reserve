import { Calendar, Clock, MapPin, Scissors, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useBookingStore } from "../../../../store/bookingStore";
import { Player } from "@lottiefiles/react-lottie-player";

const SUCCESS_LOTTIE = "/animations/Success Green.json";
const O = "var(--brand)";

function addToCalendar({ date, slot, service, barber, type }) {
  if (!date || !slot) return;
  const start    = new Date(`${date}T${slot}:00`);
  const end      = new Date(start.getTime() + (service?.duration_min ?? 60) * 60000);
  const pad      = n => String(n).padStart(2, "0");
  const fmt      = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const title    = encodeURIComponent(`${service?.name ?? "Corte"} con ${barber?.full_name ?? "Barbero"}`);
  const details  = encodeURIComponent(type === "delivery" ? "Servicio a domicilio" : "En el local");
  const url      = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}`;
  window.open(url, "_blank");
}

function shareWhatsApp({ date, slot, service, barber, shopName }) {
  const dateLabel = date ? format(new Date(date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es }) : "";
  const msg = encodeURIComponent(
    `✂️ Reservé mi cita en *${shopName ?? "la barbería"}*\n\n` +
    `Servicio: ${service?.name}\nBarbero: ${barber?.full_name}\nFecha: ${dateLabel}\nHora: ${slot}`
  );
  window.open(`https://wa.me/?text=${msg}`, "_blank");
}

export default function StepSuccess({ slug, shopName }) {
  const { reset, type, service, barber, date, slot } = useBookingStore();
  const backUrl    = slug ? `/${slug}` : "/";
  const barberName = barber?.full_name ?? "tu barbero";
  const dateLabel  = date ? format(new Date(date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es }) : "";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>

        {/* Checkmark */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <Player src={SUCCESS_LOTTIE} autoplay loop={false} style={{ width: 120, height: 120 }} />
        </div>

        <p style={{ color: O, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
          Reserva exitosa
        </p>
        <h2 style={{ fontSize: 30, fontWeight: 800, color: "var(--text)", marginBottom: 8, lineHeight: 1.2 }}>
          ¡Todo listo!
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 15, marginBottom: 28, lineHeight: 1.5 }}>
          Tu cita de <span style={{ color: "var(--text)", fontWeight: 600 }}>{service?.name}</span> con{" "}
          <span style={{ color: "var(--text)", fontWeight: 600 }}>{barberName}</span> está confirmada.
        </p>

        {/* Card resumen */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
          {[
            { icon: <Scissors size={15} color={O} />, label: "Servicio", value: service?.name },
            { icon: <Calendar size={15} color={O} />, label: "Fecha",    value: dateLabel, cap: true },
            { icon: <Clock size={15} color={O} />,    label: "Hora",     value: slot },
            ...(type === "delivery" ? [{ icon: <MapPin size={15} color={O} />, label: "Modalidad", value: "A domicilio" }] : []),
          ].map(({ icon, label, value, cap }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--brand-alpha)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {icon}
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 1 }}>{label}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", textTransform: cap ? "capitalize" : "none" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Acciones rápidas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <button onClick={() => addToCalendar({ date, slot, service, barber, type })}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Calendar size={15} /> Agendar
          </button>
          <button onClick={() => shareWhatsApp({ date, slot, service, barber, shopName })}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", borderRadius: 12, background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)", color: "#25d166", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Share2 size={15} /> Compartir
          </button>
        </div>

        <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 20 }}>
          Recibirás confirmación por WhatsApp 📱
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={reset}
            style={{ width: "100%", padding: "14px", borderRadius: 12, background: O, color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}>
            Hacer otra reserva
          </button>
          <Link to={backUrl}
            style={{ width: "100%", padding: "14px", borderRadius: 12, background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 15, border: "1px solid var(--border)", display: "block", textDecoration: "none", textAlign: "center", boxSizing: "border-box" }}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
