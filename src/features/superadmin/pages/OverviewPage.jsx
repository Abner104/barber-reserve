import { useQuery } from "@tanstack/react-query";
import { Building2, Users, TrendingUp, Calendar, Zap, Crown } from "lucide-react";
import { getGlobalStats } from "../services/superAdminService";
import { formatCurrency } from "../../../lib/utils";

const O = "#FF6B2C";

export default function OverviewPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["sa-global-stats"],
    queryFn: getGlobalStats,
    refetchInterval: 60000,
  });

  const cards = [
    { icon: <Building2 size={20} />, label: "Barberías totales",  value: stats?.totalShops     ?? "—", color: O },
    { icon: <Zap size={20} />,       label: "En plan Pro",         value: stats?.proShops       ?? "—", color: "#22c55e" },
    { icon: <Crown size={20} />,     label: "En trial",            value: stats?.trialShops     ?? "—", color: "#f59e0b" },
    { icon: <Calendar size={20} />,  label: "Reservas este mes",   value: stats?.bookingsMonth  ?? "—", color: "#3b82f6" },
    { icon: <Users size={20} />,     label: "Clientes totales",    value: stats?.totalClients   ?? "—", color: "#a855f7" },
    { icon: <TrendingUp size={20} />,label: "Ingresos procesados", value: stats ? formatCurrency(stats.totalRevenue) : "—", color: "#22c55e" },
  ];

  return (
    <div className="sa-page" style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>Overview</h1>
        <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>Métricas globales de todas las barberías</p>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 40 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: "#141414", border: "1px solid #1E1E1E", borderRadius: 14, padding: "18px 20px" }}>
            <span style={{ color: c.color }}>{c.icon}</span>
            <p style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "8px 0 4px" }}>
              {isLoading ? "—" : c.value}
            </p>
            <p style={{ fontSize: 12, color: "#555" }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Nuevas barberías este mes */}
      {!isLoading && stats && (
        <div style={{ background: "#141414", border: "1px solid #1E1E1E", borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16 }}>
            Resumen del mes
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: "16px", background: "#0F0F0F", borderRadius: 12 }}>
              <p style={{ color: "#555", fontSize: 12, marginBottom: 6 }}>Nuevas barberías</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: O }}>{stats.newShopsMonth}</p>
            </div>
            <div style={{ padding: "16px", background: "#0F0F0F", borderRadius: 12 }}>
              <p style={{ color: "#555", fontSize: 12, marginBottom: 6 }}>Barberías activas</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: "#22c55e" }}>{stats.activeShops}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
