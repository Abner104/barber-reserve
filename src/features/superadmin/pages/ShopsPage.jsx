import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Power, Crown, Clock, ChevronDown, ChevronUp, Users, Calendar, TrendingUp } from "lucide-react";
import { getAllShops, getShopStats, updateShopPlan, deleteShop } from "../services/superAdminService";
import { formatCurrency } from "../../../lib/utils";

const O = "#FF6B2C";

const PLAN_CONFIG = {
  trial:      { label: "Trial",      color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  basic:      { label: "Basic",      color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  pro:        { label: "Pro",        color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  enterprise: { label: "Enterprise", color: "#a855f7", bg: "rgba(168,85,247,0.1)"  },
};

export default function ShopsPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch]     = useState("");

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["sa-shops"],
    queryFn: getAllShops,
  });

  const planMut = useMutation({
    mutationFn: ({ shopId, plan, is_active }) => updateShopPlan(shopId, plan, is_active),
    onSuccess: () => { qc.invalidateQueries(["sa-shops"]); toast.success("Plan actualizado"); },
    onError:   () => toast.error("Error al actualizar el plan"),
  });

  const filtered = shops.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase()) ||
    (s.city ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const trialExpired = (shop) => {
    if (!shop.trial_ends_at) return false;
    return new Date(shop.trial_ends_at) < new Date();
  };

  return (
    <div className="sa-page" style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>Barberías</h1>
          <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>{shops.length} registradas</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, slug o ciudad..."
          style={{ padding: "9px 14px", borderRadius: 10, background: "#141414", border: "1px solid #2A2A2A", color: "#fff", fontSize: 13, width: 260, outline: "none" }}
        />
      </div>

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: "#141414" }} />)}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(shop => {
          const plan    = PLAN_CONFIG[shop.plan] ?? PLAN_CONFIG.trial;
          const isOpen  = expanded === shop.id;
          const expired = trialExpired(shop);

          return (
            <div key={shop.id} style={{ background: "#141414", border: `1px solid ${!shop.is_active ? "#3f3f3f" : "#1E1E1E"}`, borderRadius: 14, overflow: "hidden", opacity: shop.is_active ? 1 : 0.6 }}>
              {/* Fila principal */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
                {/* Logo / inicial */}
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                  {shop.logo_url
                    ? <img src={shop.logo_url} alt={shop.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontWeight: 800, fontSize: 18, color: O }}>{shop.name[0]}</span>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <p style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>{shop.name}</p>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: plan.bg, color: plan.color, fontWeight: 700 }}>
                      {plan.label}
                    </span>
                    {!shop.is_active && (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>Suspendida</span>
                    )}
                    {expired && shop.plan === "trial" && (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>Trial expirado</span>
                    )}
                  </div>
                  <p style={{ color: "#555", fontSize: 12, marginTop: 2 }}>
                    /{shop.slug}{shop.city ? ` · ${shop.city}` : ""}
                  </p>
                </div>

                {/* Acciones rápidas */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <a href={`/${shop.slug}`} target="_blank" rel="noopener noreferrer"
                    style={{ width: 32, height: 32, borderRadius: 8, background: "#1E1E1E", border: "1px solid #2A2A2A", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", textDecoration: "none" }}>
                    <ExternalLink size={14} />
                  </a>
                  <button onClick={() => setExpanded(isOpen ? null : shop.id)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: "#1E1E1E", border: "1px solid #2A2A2A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Panel expandido */}
              {isOpen && (
                <ShopDetail
                  shop={shop}
                  planMut={planMut}
                  expired={expired}
                  plan={plan}
                />
              )}
            </div>
          );
        })}

        {!isLoading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#555" }}>
            No hay barberías que coincidan con la búsqueda.
          </div>
        )}
      </div>
    </div>
  );
}

function ShopDetail({ shop, planMut, expired, plan }) {
  const { data: stats } = useQuery({
    queryKey: ["sa-shop-stats", shop.id],
    queryFn: () => getShopStats(shop.id),
  });

  const inp = { background: "#0F0F0F", border: "1px solid #2A2A2A", borderRadius: 9, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none", cursor: "pointer" };

  return (
    <div style={{ borderTop: "1px solid #1E1E1E", padding: "16px 18px", background: "#0F0F0F" }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { icon: <Users size={14} />,      label: "Barberos",   value: stats?.barbers ?? "—" },
          { icon: <Calendar size={14} />,   label: "Reservas",   value: stats?.totalBookings ?? "—" },
          { icon: <Users size={14} />,      label: "Clientes",   value: stats?.clients ?? "—" },
          { icon: <TrendingUp size={14} />, label: "Ingresos",   value: stats ? formatCurrency(stats.revenue) : "—" },
        ].map(s => (
          <div key={s.label} style={{ background: "#141414", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#555", marginBottom: 4 }}>
              {s.icon}<span style={{ fontSize: 11 }}>{s.label}</span>
            </div>
            <p style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Gestión de plan */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 11, color: "#555", marginBottom: 5 }}>Plan</p>
          <select
            value={shop.plan}
            onChange={e => planMut.mutate({ shopId: shop.id, plan: e.target.value })}
            style={inp}
          >
            <option value="trial">Trial</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => planMut.mutate({ shopId: shop.id, is_active: !shop.is_active })}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9,
              background: shop.is_active ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
              border: `1px solid ${shop.is_active ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
              color: shop.is_active ? "#ef4444" : "#22c55e",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            <Power size={14} />
            {shop.is_active ? "Suspender barbería" : "Reactivar barbería"}
          </button>
        </div>

        {/* Info trial */}
        {shop.plan === "trial" && shop.trial_ends_at && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 16, color: expired ? "#ef4444" : "#f59e0b", fontSize: 12 }}>
            <Clock size={13} />
            Trial {expired ? "expiró" : "expira"} el{" "}
            {new Date(shop.trial_ends_at).toLocaleDateString("es-CL")}
          </div>
        )}
      </div>

      {/* Info registro */}
      <p style={{ fontSize: 11, color: "#3f3f3f", marginTop: 14 }}>
        Registrada el {new Date(shop.created_at).toLocaleDateString("es-CL")} ·
        ID: {shop.id.slice(0, 8)}...
      </p>
    </div>
  );
}
