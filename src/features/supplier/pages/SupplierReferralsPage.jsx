import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Copy, ExternalLink, Users, TrendingUp, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../../../store/authStore";
import { getSupplierByProfileId, getSupplierReferrals, getSupplierCommissions } from "../services/supplierService";
import { formatCurrency } from "../../../lib/utils";

const O = "var(--brand, #FF6B2C)";

const PLAN_LABEL = { trial: "Trial", pro: "Pro", chains: "Cadenas" };
const PLAN_COLOR = {
  trial: { bg: "rgba(251,191,36,0.12)", text: "#fbbf24" },
  pro:   { bg: "rgba(34,197,94,0.12)",  text: "#4ade80" },
  chains:{ bg: "rgba(168,85,247,0.12)", text: "#c084fc" },
};
const COMMISSION_LABEL = { pending: "Por cobrar", paid: "Pagada", void: "Anulada" };
const COMMISSION_COLOR = {
  pending: { bg: "rgba(251,191,36,0.12)", text: "#fbbf24" },
  paid:    { bg: "rgba(34,197,94,0.12)",  text: "#4ade80" },
  void:    { bg: "rgba(239,68,68,0.12)",  text: "#f87171" },
};

export default function SupplierReferralsPage() {
  const { user } = useAuthStore();

  const { data: supplier } = useQuery({
    queryKey: ["supplier-profile", user?.id],
    queryFn:  () => getSupplierByProfileId(user.id),
    enabled:  !!user?.id,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["supplier-referrals", supplier?.id],
    queryFn:  () => getSupplierReferrals(supplier.id),
    enabled:  !!supplier?.id,
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["supplier-commissions", supplier?.id],
    queryFn:  () => getSupplierCommissions(supplier.id),
    enabled:  !!supplier?.id,
  });

  const referralLink = supplier ? `${window.location.origin}/register?ref=${supplier.id}` : "";
  const pendingTotal  = commissions.filter(c => c.status === "pending").reduce((s, c) => s + (c.commission_amount ?? 0), 0);
  const paidTotal     = commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.commission_amount ?? 0), 0);

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    toast.success("Link copiado");
  }

  return (
    <div className="sup-page" style={{ maxWidth: "min(1100px, 100%)" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>Tus barberías Clippr</h1>
        <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Activa clientes con tu link y sigue tu comisión del 40% por cada uno.</p>
      </div>

      {/* Link para compartir */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 10 }}>TU LINK DE REGISTRO</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220, padding: "12px 14px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--text)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {referralLink || "Cargando..."}
          </div>
          <button onClick={copyLink} disabled={!referralLink} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px", background: O, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            <Copy size={14} /> Copiar
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 10 }}>Cuando una barbería se registra con este link, queda vinculada a ti automáticamente.</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 40 }}>
        <StatCard icon={<Users size={20} />}      label="Barberías referidas" value={referrals.length} />
        <StatCard icon={<TrendingUp size={20} />} label="Comisión pagada"     value={formatCurrency(paidTotal)} accent />
        <StatCard icon={<Clock size={20} />}      label="Comisión por cobrar" value={formatCurrency(pendingTotal)} />
      </div>

      {/* Barberías referidas */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Barberías</h2>
      {referrals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, marginBottom: 40 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>✂️</div>
          <p style={{ fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Aún no tienes referidos</p>
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Comparte tu link con tus clientes barberías para empezar.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 40 }}>
          {referrals.map(r => {
            const pc = PLAN_COLOR[r.plan] ?? { bg: "var(--surface2)", text: "#555" };
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14, marginBottom: 2 }}>{r.name}</p>
                  <p style={{ color: "var(--text-faint)", fontSize: 12 }}>
                    Desde {format(new Date(r.created_at), "d MMM yyyy", { locale: es })}
                  </p>
                </div>
                <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: pc.bg, color: pc.text, whiteSpace: "nowrap" }}>
                  {PLAN_LABEL[r.plan] ?? r.plan}
                </span>
                <a href={`/${r.slug}/booking`} target="_blank" rel="noreferrer" style={{ display: "flex", color: "var(--text-faint)" }}>
                  <ExternalLink size={15} />
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Comisiones */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Comisiones</h2>
      {commissions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16 }}>
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Se genera una comisión cuando un referido paga su primer mes.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {commissions.map(c => {
            const cc = COMMISSION_COLOR[c.status] ?? { bg: "var(--surface2)", text: "#555" };
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14, marginBottom: 2 }}>{c.barbershops?.name ?? "Barbería"}</p>
                  <p style={{ color: "var(--text-faint)", fontSize: 12 }}>
                    {(c.rate * 100).toFixed(0)}% de {formatCurrency(c.first_payment_amount ?? 0)}
                  </p>
                </div>
                <p style={{ fontWeight: 700, color: O, fontSize: 14, flexShrink: 0 }}>{formatCurrency(c.commission_amount ?? 0)}</p>
                <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: cc.bg, color: cc.text, whiteSpace: "nowrap" }}>
                  {COMMISSION_LABEL[c.status]}
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
      background: accent ? "rgba(255,107,44,0.06)" : "var(--surface)",
      border: `1px solid ${accent ? "rgba(255,107,44,0.25)" : "var(--surface2)"}`,
      borderRadius: 14, padding: 20,
    }}>
      <span style={{ color: accent ? O : "#555" }}>{icon}</span>
      <p style={{ fontSize: 26, fontWeight: 800, color: accent ? O : "var(--text)", margin: "10px 0 4px" }}>{value}</p>
      <p style={{ fontSize: 13, color: "var(--text-faint)" }}>{label}</p>
    </div>
  );
}
