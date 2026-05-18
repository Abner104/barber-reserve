import { CheckCircle, Calendar, Clock, MapPin, Scissors } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useBookingStore } from "../../../../store/bookingStore";

const O = "var(--brand, #FF6B2C)";

export default function StepSuccess() {
  const { reset, type, service, barber, date, slot } = useBookingStore();
  const barberName = barber?.full_name ?? "tu barbero";
  const dateLabel  = date
    ? format(new Date(date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })
    : date;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>

        {/* Icono animado */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,107,44,0.12)", border: `2px solid ${O}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={40} color={O} />
          </div>
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
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 20px", marginBottom: 28, display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--brand-alpha)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Scissors size={15} color={O} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 1 }}>Servicio</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{service?.name}</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--brand-alpha)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Calendar size={15} color={O} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 1 }}>Fecha</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", textTransform: "capitalize" }}>{dateLabel}</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--brand-alpha)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Clock size={15} color={O} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 1 }}>Hora</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{slot}</p>
            </div>
          </div>

          {type === "delivery" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--brand-alpha)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MapPin size={15} color={O} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 1 }}>Modalidad</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>A domicilio</p>
              </div>
            </div>
          )}
        </div>

        <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 28 }}>
          Te contactaremos por WhatsApp para confirmar los detalles.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={reset}
            style={{ width: "100%", padding: "14px", borderRadius: 12, background: O, color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}
          >
            Hacer otra reserva
          </button>
          <Link
            to="/"
            style={{ width: "100%", padding: "14px", borderRadius: 12, background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 15, border: "1px solid var(--border)", display: "block", textDecoration: "none", textAlign: "center", boxSizing: "border-box" }}
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
