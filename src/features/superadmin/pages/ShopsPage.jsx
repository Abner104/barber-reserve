import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Power, Clock, ChevronDown, ChevronUp, Users, Calendar, TrendingUp, DollarSign, Plus, KeyRound } from "lucide-react";
import { getAllShops, getShopStats, updateShopPlan, deleteShop } from "../services/superAdminService";
import { formatCurrency } from "../../../lib/utils";
import { supabase } from "../../../lib/supabase";

const PAYMENT_METHODS = [
  { value: "transfer",  label: "Transferencia" },
  { value: "cash",      label: "Efectivo" },
  { value: "haircut",   label: "Con corte" },
  { value: "other",     label: "Otro" },
];

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
  const qc = useQueryClient();
  const { data: stats } = useQuery({
    queryKey: ["sa-shop-stats", shop.id],
    queryFn: () => getShopStats(shop.id),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["sa-payments", shop.id],
    queryFn: async () => {
      const { data } = await supabase.from("shop_payments")
        .select("*").eq("shop_id", shop.id).order("paid_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const [showPayForm, setShowPayForm]   = useState(false);
  const [showPwdForm, setShowPwdForm]   = useState(false);
  const [newPassword, setNewPassword]   = useState("");
  const [savingPwd, setSavingPwd]       = useState(false);

  // Obtener el user_id del dueño de esta barbería
  const { data: ownerProfile } = useQuery({
    queryKey: ["sa-shop-owner", shop.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("shop_id", shop.id)
        .or("role.eq.admin,role.eq.owner")
        .maybeSingle();
      return data;
    },
  });

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    if (!ownerProfile?.id) { toast.error("No se encontró el usuario admin de esta barbería"); return; }
    setSavingPwd(true);
    try {
      const res = await fetch("/api/reset-user-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: ownerProfile.id, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Contraseña de ${ownerProfile.full_name || shop.name} actualizada ✓`);
      setNewPassword("");
      setShowPwdForm(false);
    } catch (e) {
      toast.error(e.message ?? "Error al cambiar la contraseña");
    } finally {
      setSavingPwd(false);
    }
  }
  const [payForm, setPayForm] = useState({ amount: "", method: "transfer", note: "" });
  const [savingPay, setSavingPay] = useState(false);

  async function registerPayment() {
    if (!payForm.amount || isNaN(Number(payForm.amount))) { toast.error("Ingresá un monto"); return; }
    setSavingPay(true);
    try {
      const { error } = await supabase.from("shop_payments").insert({
        shop_id: shop.id,
        amount:  Number(payForm.amount),
        method:  payForm.method,
        note:    payForm.note || null,
        paid_at: new Date().toISOString(),
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["sa-payments", shop.id] });
      toast.success("Pago registrado ✓");
      setPayForm({ amount: "", method: "transfer", note: "" });
      setShowPayForm(false);
    } catch (e) {
      toast.error(e.message ?? "Error al registrar");
    } finally { setSavingPay(false); }
  }

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

        {/* Cambiar contraseña del admin */}
        <div style={{ marginTop: 16 }}>
          <button onClick={() => { setShowPwdForm(f => !f); setNewPassword(""); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <KeyRound size={14} />
            {showPwdForm ? "Cancelar" : "Cambiar contraseña del admin"}
          </button>
          {showPwdForm && (
            <form onSubmit={handleResetPassword} style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                autoFocus
                style={{ padding: "8px 12px", borderRadius: 9, background: "#0F0F0F", border: "1px solid #2A2A2A", color: "#fff", fontSize: 13, outline: "none", flex: 1, minWidth: 220 }}
              />
              <button type="submit" disabled={savingPwd}
                style={{ padding: "8px 16px", borderRadius: 9, background: "#4f46e5", border: "none", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: savingPwd ? 0.7 : 1, whiteSpace: "nowrap" }}>
                {savingPwd ? "Guardando..." : "Confirmar"}
              </button>
            </form>
          )}
          {ownerProfile && (
            <p style={{ fontSize: 11, color: "#3f3f3f", marginTop: 5 }}>
              Admin: {ownerProfile.full_name || "—"} · ID: {ownerProfile.id.slice(0,8)}...
            </p>
          )}
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

      {/* ── Pagos ── */}
      <div style={{ marginTop: 20, borderTop: "1px solid #1E1E1E", paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#aaa" }}>
            <DollarSign size={14} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Historial de pagos</span>
          </div>
          <button onClick={() => setShowPayForm(f => !f)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "rgba(255,107,44,0.1)", border: "1px solid rgba(255,107,44,0.3)", color: "#FF6B2C", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            <Plus size={13} /> Registrar pago
          </button>
        </div>

        {/* Formulario de pago */}
        {showPayForm && (
          <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#555", marginBottom: 4 }}>MONTO ($)</label>
                <input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="11990" style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#555", marginBottom: 4 }}>MÉTODO</label>
                <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))} style={{ ...inp, width: "100%", boxSizing: "border-box" }}>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 11, color: "#555", marginBottom: 4 }}>NOTA (opcional)</label>
              <input value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Ej: Pagó con corte a domicilio..." style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowPayForm(false)} style={{ flex: 1, padding: "8px", borderRadius: 8, background: "transparent", border: "1px solid #2A2A2A", color: "#555", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
              <button onClick={registerPayment} disabled={savingPay}
                style={{ flex: 2, padding: "8px", borderRadius: 8, background: "#FF6B2C", border: "none", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: savingPay ? 0.7 : 1 }}>
                {savingPay ? "Guardando..." : "Confirmar pago"}
              </button>
            </div>
          </div>
        )}

        {/* Lista de pagos */}
        {payments.length === 0 ? (
          <p style={{ fontSize: 12, color: "#3f3f3f" }}>Sin pagos registrados aún.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {payments.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "#141414", borderRadius: 8 }}>
                <div>
                  <span style={{ fontWeight: 700, color: "#22c55e", fontSize: 14 }}>{formatCurrency(p.amount)}</span>
                  <span style={{ fontSize: 11, color: "#555", marginLeft: 8 }}>
                    {PAYMENT_METHODS.find(m => m.value === p.method)?.label ?? p.method}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "#3f3f3f" }}>
                  {new Date(p.paid_at).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            ))}
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
