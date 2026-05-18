// ID de la barbería activa — en producción esto vendría del subdominio o URL
// Por ahora hardcodeado al seed de la migración
export const SHOP_ID = "a0000000-0000-0000-0000-000000000001";

export const BOOKING_STATUS = {
  PENDING:     "pending",
  CONFIRMED:   "confirmed",
  IN_PROGRESS: "in_progress",
  COMPLETED:   "completed",
  CANCELLED:   "cancelled",
  NO_SHOW:     "no_show",
};

export const BOOKING_STATUS_LABEL = {
  pending:     "Pendiente",
  confirmed:   "Confirmada",
  in_progress: "En curso",
  completed:   "Completada",
  cancelled:   "Cancelada",
  no_show:     "No se presentó",
};

export const BOOKING_STATUS_COLOR = {
  pending:     { bg: "rgba(251,191,36,0.1)",  text: "#fbbf24" },
  confirmed:   { bg: "rgba(59,130,246,0.1)",  text: "#3b82f6" },
  in_progress: { bg: "rgba(255,107,44,0.1)",  text: "#FF6B2C" },
  completed:   { bg: "rgba(34,197,94,0.1)",   text: "#22c55e" },
  cancelled:   { bg: "rgba(239,68,68,0.1)",   text: "#ef4444" },
  no_show:     { bg: "rgba(113,113,122,0.1)", text: "#71717a" },
};

export const BOOKING_TYPE       = { IN_STORE: "in_store", DELIVERY: "delivery" };
export const BOOKING_TYPE_LABEL = { in_store: "En local", delivery: "Domicilio" };

export const PAYMENT_METHOD_LABEL = {
  cash:      "Efectivo",
  card:      "Tarjeta",
  transfer:  "Transferencia",
  nequi:     "Nequi",
  daviplata: "Daviplata",
};

// Chile
export const DEFAULT_CURRENCY = "CLP";
export const DEFAULT_TIMEZONE = "America/Santiago";
export const DEFAULT_CENTER   = { lat: -33.4489, lng: -70.6693 }; // Santiago

export const USER_ROLE = { SUPER_ADMIN: "super_admin", OWNER: "owner", BARBER: "barber", CLIENT: "client" };

export const DAY_LABEL = {
  monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles",
  thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo",
};

export const DAYS_OF_WEEK = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
