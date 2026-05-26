import { formatCurrency } from "../../../lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { getDashboardStats, getUpcomingBookings, resolveShopId } from "../services/adminService";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "../../../lib/constants";
import { useAuthStore } from "../../../store/authStore";
import { supabase } from "../../../lib/supabase";

const O = "var(--brand, #FF6B2C)";

const SHIMMER_CSS = `
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .shimmer {
    background: linear-gradient(90deg, var(--surface2) 25%, var(--card-border, #2A2A2A) 50%, var(--surface2) 75%);
    background-size: 800px 100%;
    animation: shimmer 1.4s infinite linear;
    border-radius: 12px;
  }
`;

export default function DashboardPage() {
  const profile = useAuthStore(s => s.profile);
  const shopId  = profile?.shop_id;

  const { data: stats, isLoading: statsLoading } = useQuery({
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

  // Últimos 7 días para el gráfico
  const { data: weekData = [] } = useQuery({
    queryKey: ["week-bookings", shopId],
    queryFn: async () => {
      const from = subDays(startOfDay(new Date()), 6).toISOString();
      const { data } = await supabase
        .from("bookings")
        .select("scheduled_at, status")
        .eq("shop_id", shopId)
        .gte("scheduled_at", from)
        .in("status", ["completed", "confirmed", "pending", "in_progress"]);
      const days = Array.from({ length: 7 }, (_, i) => {
        const d     = subDays(new Date(), 6 - i);
        const key   = format(d, "yyyy-MM-dd");
        const label = format(d, "EEE", { locale: es });
        const count = (data || []).filter(b => b.scheduled_at.startsWith(key)).length;
        return { label, count, isToday: i === 6, isYesterday: i === 5 };
      });
      return days;
    },
    enabled: !!shopId,
    refetchInterval: 60000,
  });
  const maxCount = Math.max(...weekData.map(d => d.count), 1);

  // Tendencia: hoy vs ayer
  const todayCount     = weekData.find(d => d.isToday)?.count ?? 0;
  const yesterdayCount = weekData.find(d => d.isYesterday)?.count ?? 0;
  const trend = todayCount - yesterdayCount;

  return (
    <div className="admin-page" style={{ maxWidth: "min(1100px, 100%)" }}>
      <style>{SHIMMER_CSS}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: "var(--text-faint)", fontSize: 13, textTransform: "capitalize" }}>{today}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>Dashboard</h1>
          {!statsLoading && trend !== 0 && (
            <span style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: trend > 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)",
              color: trend > 0 ? "#22c55e" : "#ef4444",
            }}>
              {trend > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {trend > 0 ? "+" : ""}{trend} vs ayer
            </span>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
        {statsLoading ? (
          [1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height: 100 }} />)
        ) : (
          <>
            <StatCard icon={<Calendar size={20} />} label="Reservas hoy"    value={stats?.bookingsToday ?? 0} />
            <StatCard icon={<TrendingUp size={20} />} label="Ingresos hoy"  value={stats ? formatCurrency(stats.revenueToday) : "$0"} accent />
            <StatCard icon={<MapPin size={20} />} label="Domicilios"        value={stats?.deliveriesToday ?? 0} />
            <StatCard icon={<Users size={20} />} label="Clientes nuevos"    value={stats?.newClients ?? 0} />
          </>
        )}
      </div>

      {/* Gráfico últimos 7 días */}
      {weekData.length > 0 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "20px 20px 16px", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Reservas — últimos 7 días</p>
            <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
              Total: <strong style={{ color: "var(--text)" }}>{weekData.reduce((a, d) => a + d.count, 0)}</strong>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
            {weekData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                  <div style={{
                    width: "100%",
                    height: d.count === 0 ? "4px" : `${Math.round((d.count / maxCount) * 100)}%`,
                    borderRadius: "6px 6px 4px 4px",
                    background: d.isToday ? "var(--brand)" : d.isYesterday ? "rgba(255,107,44,0.35)" : "var(--surface2)",
                    border: d.isToday || d.isYesterday ? "none" : "1px solid var(--border)",
                    transition: "height 0.4s ease",
                    position: "relative",
                  }}>
                    {d.count > 0 && (
                      <span style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, color: d.isToday ? "var(--brand)" : "var(--text-faint)", whiteSpace: "nowrap" }}>
                        {d.count}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: d.isToday ? "var(--brand)" : "var(--text-faint)", fontWeight: d.isToday ? 700 : 400, textTransform: "capitalize" }}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reservas del día */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
          Próximas reservas
          {!isLoading && <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-faint)", marginLeft: 8 }}>({bookings.length})</span>}
        </h2>

        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 72 }} />)}
          </div>
        )}

        {!isLoading && bookings.length === 0 && (
          <div style={{ textAlign: "center", padding: "56px 20px", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✂️</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", marginBottom: 6 }}>Sin reservas por ahora</p>
            <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Cuando lleguen nuevas reservas aparecerán aquí.</p>
          </div>
        )}

        {!isLoading && bookings.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bookings.map(b => {
              const statusColor = BOOKING_STATUS_COLOR[b.status] ?? { bg: "var(--surface2)", text: "var(--text-faint)" };
              const accentColor = {
                pending:     "#f59e0b",
                confirmed:   "#3b82f6",
                in_progress: "var(--brand)",
                completed:   "#22c55e",
                cancelled:   "#ef4444",
                no_show:     "#6b7280",
              }[b.status] ?? "var(--border)";

              return (
                <div key={b.id} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  background: "var(--card-bg)", border: "1px solid var(--card-border)",
                  borderRadius: 12, overflow: "hidden",
                  borderLeft: `4px solid ${accentColor}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px 14px 14px", flex: 1, minWidth: 0 }}>
                    {/* hora */}
                    <div style={{ textAlign: "center", minWidth: 48, flexShrink: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
                        {format(new Date(b.scheduled_at), "HH:mm")}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-faint)" }}>{b.duration_min}min</p>
                    </div>

                    <div style={{ width: 1, height: 36, background: "var(--border)", flexShrink: 0 }} />

                    {/* info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 14, marginBottom: 2 }}>
                        {b.clients?.full_name ?? "Cliente"}
                      </p>
                      <p style={{ color: "var(--text-faint)", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {b.services?.name} · {b.barbers?.full_name}
                        {b.type === "delivery" && <span style={{ color: "#3b82f6", marginLeft: 6 }}>📍 Domicilio</span>}
                      </p>
                    </div>

                    {/* precio */}
                    <p style={{ fontWeight: 700, color: "var(--brand)", fontSize: 14, flexShrink: 0 }}>{formatCurrency(b.price)}</p>

                    {/* status badge */}
                    <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: statusColor.bg, color: statusColor.text, flexShrink: 0, whiteSpace: "nowrap" }}>
                      {BOOKING_STATUS_LABEL[b.status]}
                    </span>
                  </div>
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
    <div style={{
      background: accent ? "linear-gradient(135deg, rgba(255,107,44,0.08), rgba(255,107,44,0.03))" : "var(--card-bg)",
      border: `1px solid ${accent ? "rgba(255,107,44,0.3)" : "var(--card-border)"}`,
      borderRadius: 14, padding: "20px",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ color: accent ? O : "var(--text-faint)" }}>{icon}</span>
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color: accent ? O : "var(--text)", marginBottom: 4 }}>{value}</p>
      <p style={{ fontSize: 13, color: "var(--text-faint)" }}>{label}</p>
    </div>
  );
}
