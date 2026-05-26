import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, TrendingUp, Clock } from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import { getSupplierByProfileId, getSupplierOrders, getSupplierProducts } from "../services/supplierService";
import { formatCurrency } from "../../../lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const O = "#FF6B2C";

const STATUS_LABEL = { pending: "Pendiente", processing: "En proceso", shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado" };
const STATUS_COLOR = {
  pending:    { bg: "rgba(251,191,36,0.12)", text: "#fbbf24" },
  processing: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa" },
  shipped:    { bg: "rgba(168,85,247,0.12)", text: "#c084fc" },
  delivered:  { bg: "rgba(34,197,94,0.12)",  text: "#4ade80" },
  cancelled:  { bg: "rgba(239,68,68,0.12)",  text: "#f87171" },
};

export default function SupplierDashboard() {
  const { user } = useAuthStore();

  const { data: supplier } = useQuery({
    queryKey: ["supplier-profile", user?.id],
    queryFn:  () => getSupplierByProfileId(user.id),
    enabled:  !!user?.id,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["supplier-orders", supplier?.id],
    queryFn:  () => getSupplierOrders(supplier.id),
    enabled:  !!supplier?.id,
    refetchInterval: 30000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["supplier-products", supplier?.id],
    queryFn:  () => getSupplierProducts(supplier.id),
    enabled:  !!supplier?.id,
  });

  const pending   = orders.filter(o => o.status === "pending").length;
  const thisMonth = orders.filter(o => o.created_at?.startsWith(new Date().toISOString().slice(0, 7)));
  const revenue   = thisMonth.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const recent    = orders.slice(0, 5);

  return (
    <div className="sup-page" style={{ maxWidth: "min(1100px, 100%)" }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: "#555", fontSize: 13 }}>{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginTop: 4 }}>
          Bienvenido{supplier?.name ? `, ${supplier.name}` : ""} 👋
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 40 }}>
        <StatCard icon={<ShoppingBag size={20} />} label="Pedidos pendientes" value={pending} accent={pending > 0} />
        <StatCard icon={<TrendingUp size={20} />}  label="Ventas este mes"    value={formatCurrency(revenue)} accent />
        <StatCard icon={<Package size={20} />}     label="Productos activos"  value={products.filter(p => p.is_available).length} />
        <StatCard icon={<Clock size={20} />}       label="Total pedidos"      value={orders.length} />
      </div>

      {/* Últimos pedidos */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Pedidos recientes</h2>
      {recent.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 20px", background: "#111", border: "1px solid #1E1E1E", borderRadius: 16 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📦</div>
          <p style={{ fontWeight: 700, color: "#fff", marginBottom: 6 }}>Sin pedidos aún</p>
          <p style={{ color: "#555", fontSize: 13 }}>Cuando los barberos hagan pedidos aparecerán aquí.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recent.map(o => {
            const sc = STATUS_COLOR[o.status] ?? { bg: "#1E1E1E", text: "#555" };
            return (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", background: "#111", border: "1px solid #1E1E1E", borderRadius: 12, borderLeft: `4px solid ${sc.text}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: "#fff", fontSize: 14, marginBottom: 2 }}>
                    {o.contact_name ?? o.barbershops?.name ?? "Barbería"}
                  </p>
                  <p style={{ color: "#555", fontSize: 12 }}>
                    {o.items?.length ?? 0} producto(s) · {format(new Date(o.created_at), "d MMM HH:mm", { locale: es })}
                  </p>
                </div>
                <p style={{ fontWeight: 700, color: O, fontSize: 14, flexShrink: 0 }}>{formatCurrency(o.total ?? 0)}</p>
                <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.text, whiteSpace: "nowrap" }}>
                  {STATUS_LABEL[o.status]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{
      background: accent ? "rgba(255,107,44,0.06)" : "#111",
      border: `1px solid ${accent ? "rgba(255,107,44,0.25)" : "#1E1E1E"}`,
      borderRadius: 14, padding: 20,
    }}>
      <span style={{ color: accent ? O : "#555" }}>{icon}</span>
      <p style={{ fontSize: 26, fontWeight: 800, color: accent ? O : "#fff", margin: "10px 0 4px" }}>{value}</p>
      <p style={{ fontSize: 13, color: "#555" }}>{label}</p>
    </div>
  );
}
