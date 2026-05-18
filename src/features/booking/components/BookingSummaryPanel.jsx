import { formatCurrency } from "../../../lib/utils";
import { Scissors, User, Calendar, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useBookingStore } from "../../../store/bookingStore";
import { getDistanceKm, calcDeliveryFee } from "../../../lib/mapbox";

const SHOP_LOCATION = { lat: -33.4489, lng: -70.6693 };
const BASE_FEE      = 5000;
const FEE_PER_KM    = 1500;


export default function BookingSummaryPanel() {
  const { type, service, barber, date, slot, address } = useBookingStore();

  if (!type) return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
      <p style={{ color: "var(--text-faint)", fontSize: 12, textAlign: "center", lineHeight: 1.5 }}>
        Tu resumen aparecerá aquí mientras avanzas.
      </p>
    </div>
  );

  const distanceKm   = type === "delivery" && address.lat ? getDistanceKm(SHOP_LOCATION, { lat: address.lat, lng: address.lng }) : null;
  const deliveryFee  = distanceKm != null ? calcDeliveryFee(distanceKm, BASE_FEE, FEE_PER_KM) : 0;
  const servicePrice = type === "delivery" && service?.price_delivery != null ? service.price_delivery : service?.price ?? 0;
  const total        = servicePrice + deliveryFee;
  const barberName   = barber?.full_name;
  const dateLabel    = date ? format(new Date(date + "T12:00:00"), "EEE d MMM", { locale: es }) : null;

  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ color: "var(--text-faint)", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>Tu reserva</p>

      {type && <Row icon={<MapPin size={13} />} value={type === "delivery" ? "A domicilio" : "En el local"} orange />}
      {service && <Row icon={<Scissors size={13} />} value={service.name} sub={formatCurrency(servicePrice)} />}
      {barberName && <Row icon={<User size={13} />} value={barberName} />}
      {dateLabel && <Row icon={<Calendar size={13} />} value={<span style={{ textTransform: "capitalize" }}>{dateLabel}</span>} />}
      {slot && <Row icon={<Clock size={13} />} value={slot} />}
      {type === "delivery" && address.line && (
        <Row icon={<MapPin size={13} />} value={address.line} sub={`Domicilio: ${formatCurrency(deliveryFee)}`} />
      )}

      {service && (
        <div style={{ borderTop: "1px solid #2A2A2A", marginTop: 4, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Total estimado</span>
          <span style={{ color: "var(--brand)", fontWeight: 700, fontSize: 14 }}>{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  );
}

function Row({ icon, value, sub, orange }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={{ color: "var(--text-faint)", marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 12, lineHeight: 1.3, color: orange ? "var(--brand, #FF6B2C)" : "#D0D0D0", fontWeight: orange ? 600 : 400 }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}
