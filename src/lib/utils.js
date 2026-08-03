export function formatCLP(n) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export const formatCurrency = formatCLP;

// 240 → "4 h", 90 → "1 h 30 min", 45 → "45 min"
export function formatDuration(min) {
  if (!min || min < 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
