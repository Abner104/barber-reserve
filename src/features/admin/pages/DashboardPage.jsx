import { formatCurrency } from "../../../lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getDashboardStats, getUpcomingBookings, resolveShopId } from "../services/adminService";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "../../../lib/constants";
import { useAuthStore } from "../../../store/authStore";

const O = "var(--brand, #FF6B2C)";


export default function DashboardPage() {
  const profile = useAuthStore(s => s.profile);
  const shopId  = profile?.shop_id;

  const { data: stats } = useQuery({
    queryKey: ["admin-stats", shopId],
    queryFn:  getDashboardStats,
    enabled:  !!shopId,
    refetchInterval: 60000,
  });
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["upcoming-bookings", shopId],
    queryFn:  getUpcomingBookings,
    enabled:  !!shopId,
    refetchInterval: 30000,
  });

  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  return (
    <div className="admin-page" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: "var(--text-faint)", fontSize: 13, textTransform: "capitalize" }}>{today}</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", marginTop: 4 }}>Dashboard</h1>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
        <StatCard icon={<Calendar size={20} />} label="Reservas hoy"  value={stats?.bookingsToday ?? "—"} />
        <StatCard icon={<TrendingUp size={20} />} label="Ingresos hoy" value={stats ? formatCurrency(stats.revenueToday) : "—"} accent />
        <StatCard icon={<MapPin size={20} />} label="Domicilios"    value={stats?.deliveriesToday ?? "—"} />
        <StatCard icon={<Users size={20} />} label="Clientes nuevos" value={stats?.newClients ?? "—"} />
      </div>

      {/* Reservas del día */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
          Próximas reservas
          <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-faint)", marginLeft: 8 }}>({bookings.length})</span>
        </h2>

        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 12, background: "var(--card-bg)" }} />)}
          </div>
        )}

        {!isLoading && bookings.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-faint)" }}>
            <Calendar size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p>No hay reservas para hoy.</p>
          </div>
        )}

        {!isLoading && bookings.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bookings.map(b => {
              const statusColor = BOOKING_STATUS_COLOR[b.status] ?? { bg: "var(--surface2)", text: "var(--text-faint)" };
              return (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12 }}>
                  {/* hora */}
                  <div style={{ textAlign: "center", minWidth: 48, flexShrink: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
                      {format(new Date(b.scheduled_at), "HH:mm")}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--text-faint)" }}>{b.duration_min}min</p>
                  </div>

                  {/* separador */}
                  <div style={{ width: 1, height: 36, background: "var(--border)", flexShrink: 0 }} />

                  {/* info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 14, marginBottom: 2 }}>
                      {b.clients?.full_name ?? "Cliente"}
                    </p>
                    <p style={{ color: "var(--text-faint)", fontSize: 12 }}>
                      {b.services?.name} · {b.barbers?.full_name}
                      {b.type === "delivery" && <span style={{ color: "var(--brand)", marginLeft: 6 }}>📍 Domicilio</span>}
                    </p>
                  </div>

                  {/* precio */}
                  <p style={{ fontWeight: 700, color: "var(--brand)", fontSize: 14, flexShrink: 0 }}>{formatCurrency(b.price)}</p>

                  {/* status badge */}
                  <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: statusColor.bg, color: statusColor.text, flexShrink: 0 }}>
                    {BOOKING_STATUS_LABEL[b.status]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{ background: "var(--card-bg)", border: `1px solid ${accent ? "var(--brand-alpha, rgba(255,107,44,0.3))" : "var(--card-border)"}`, borderRadius: 14, padding: "20px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ color: accent ? O : "var(--text-faint)" }}>{icon}</span>
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color: accent ? O : "var(--text)", marginBottom: 4 }}>{value}</p>
      <p style={{ fontSize: 13, color: "var(--text-faint)" }}>{label}</p>
    </div>
  );
}
