import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Copy, ExternalLink, Users, TrendingUp, Clock, Plus, PlayCircle, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSupplierReferrals, getSupplierCommissions, createReferredShop } from "../services/supplierService";
import { useActiveSupplier } from "../../../hooks/useActiveSupplier";
import { formatCurrency } from "../../../lib/utils";

const O = "var(--brand, #FF6B2C)";
const DEMO_SLUG = "noblecut"; // barbería demo para mostrar el sistema en visitas de venta

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

const EMPTY_FORM = { shopName: "", ownerName: "", ownerEmail: "", city: "", phone: "" };

export default function SupplierReferralsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [credenciales, setCredenciales] = useState(null);

  const { data: supplier } = useActiveSupplier();

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

  const createMut = useMutation({
    mutationFn: () => {
      if (!supplier?.id) throw new Error("Perfil de proveedor no disponible");
      return createReferredShop({ supplierId: supplier.id, ...form });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["supplier-referrals"] });
      qc.invalidateQueries({ queryKey: ["supplier-commissions"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setCredenciales(data);
    },
    onError: (e) => toast.error("Error: " + (e?.message ?? "no se pudo crear la barbería")),
  });

  const referralLink = supplier ? `${window.location.origin}/register?ref=${supplier.id}` : "";
  const pendingTotal  = commissions.filter(c => c.status === "pending").reduce((s, c) => s + (c.commission_amount ?? 0), 0);
  const paidTotal     = commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.commission_amount ?? 0), 0);

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    toast.success("Link copiado");
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!supplier?.id) {
      toast.error("Cargando tu perfil de proveedor, intenta de nuevo en un momento");
      return;
    }
    if (!form.shopName.trim() || !form.ownerName.trim() || !form.ownerEmail.trim()) {
      toast.error("Completa nombre de la barbería, dueño y email");
      return;
    }
    createMut.mutate();
  }

  const inp = {
    width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 14,
    background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--text)",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div className="sup-page" style={{ maxWidth: "min(1100px, 100%)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>Tus barberías Clippr</h1>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Activa clientes y sigue tu comisión del 40% por cada uno.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href={`/${DEMO_SLUG}/booking`} target="_blank" rel="noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 16px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
            <PlayCircle size={15} /> Ver demo
          </a>
          <button onClick={() => setShowForm(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 16px", background: O, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            <Plus size={15} /> Nuevo cliente
          </button>
        </div>
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
        <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 10 }}>Compártelo si el dueño prefiere registrarse solo. Si estás en la visita, usa "Nuevo cliente" y actívalo tú mismo.</p>
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
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Usa "Nuevo cliente" en tu próxima visita, o comparte tu link.</p>
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

      {/* Modal: nuevo cliente */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Nuevo cliente Clippr</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Nombre de la barbería">
                <input style={inp} value={form.shopName} onChange={e => setForm({ ...form, shopName: e.target.value })} placeholder="NobleCut Barber Shop" required />
              </Field>
              <Field label="Nombre del dueño">
                <input style={inp} value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} placeholder="Carlos Rodríguez" required />
              </Field>
              <Field label="Email del dueño">
                <input style={inp} type="email" value={form.ownerEmail} onChange={e => setForm({ ...form, ownerEmail: e.target.value })} placeholder="carlos@mibarberia.com" required />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Ciudad">
                  <input style={inp} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Santiago" />
                </Field>
                <Field label="WhatsApp">
                  <input style={inp} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+56912345678" />
                </Field>
              </div>
              <button type="submit" disabled={createMut.isPending}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 10, background: O, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 6, opacity: createMut.isPending ? 0.7 : 1 }}>
                {createMut.isPending && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                {createMut.isPending ? "Creando..." : "Activar trial de 30 días"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: credenciales creadas */}
      {credenciales && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>¡Listo! Cuenta creada</h3>
            <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 20 }}>
              Comparte estas credenciales con <strong style={{ color: "var(--text)" }}>{credenciales.name}</strong> por WhatsApp
            </p>
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>EMAIL</p>
              <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 15, marginBottom: 12 }}>{credenciales.email}</p>
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>CONTRASEÑA TEMPORAL</p>
              <p style={{ fontWeight: 700, color: O, fontSize: 18, letterSpacing: 1 }}>{credenciales.password}</p>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 20 }}>
              El dueño entra a <strong style={{ color: "var(--text)" }}>{window.location.origin}/login</strong>, usa estas credenciales y puede cambiar la contraseña después. Su link de reservas: <strong style={{ color: "var(--text)" }}>{window.location.origin}/{credenciales.slug}/booking</strong>
            </p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hola ${credenciales.name}! 👋\n\nYa activé tu barbería en Clippr, 30 días gratis.\n\n📱 URL: ${window.location.origin}/login\n📧 Email: ${credenciales.email}\n🔑 Contraseña: ${credenciales.password}\n\nTu link para que tus clientes reserven: ${window.location.origin}/${credenciales.slug}/booking\n\nEntra desde tu celular y cambia la contraseña cuando quieras. ✂️`)}`}
              target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 10, background: "#25D366", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none", marginBottom: 10 }}
            >
              Enviar por WhatsApp
            </a>
            <button onClick={() => setCredenciales(null)}
              style={{ width: "100%", padding: "12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", marginBottom: 6, fontWeight: 600 }}>{label}</label>
      {children}
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
