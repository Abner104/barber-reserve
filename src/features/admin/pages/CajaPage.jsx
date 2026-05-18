import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, X, Loader2, Lock, Unlock, DollarSign, TrendingDown, ShoppingBag } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { resolveShopId } from "../services/adminService";
import { formatCurrency } from "../../../lib/utils";
import { useAuthStore } from "../../../store/authStore";
import ImageUpload from "../../../components/shared/ImageUpload";

const PAYMENT_METHODS = [
  { key: "cash",     label: "Efectivo",       emoji: "💵" },
  { key: "card",     label: "Débito/Crédito", emoji: "💳" },
  { key: "transfer", label: "Transferencia",  emoji: "🏦" },
  { key: "mixed",    label: "Mixto",          emoji: "🔀" },
];

const O = "var(--brand, #FF6B2C)";

const METHOD_CFG = {
  cash:     { label: "Efectivo",       emoji: "💵", color: "#22c55e" },
  card:     { label: "Débito/Crédito", emoji: "💳", color: "#3b82f6" },
  transfer: { label: "Transferencia",  emoji: "🏦", color: "#8b5cf6" },
  mixed:    { label: "Mixto",          emoji: "🔀", color: "#f59e0b" },
};

// ── Queries ──────────────────────────────────────────────────────

async function getTurnoAbierto() {
  const sid = resolveShopId();
  const { data } = await supabase
    .from("caja_turnos")
    .select("*")
    .eq("shop_id", sid)
    .eq("estado", "abierto")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function getTurnoData(turnoId) {
  if (!turnoId) return { bookings: [], egresos: [] };

  const turnoStart = (await supabase
    .from("caja_turnos").select("opened_at").eq("id", turnoId).single()
  ).data?.opened_at;

  const [{ data: bookings }, { data: egresos }] = await Promise.all([
    supabase.from("bookings")
      .select(`id, price, price_final, payment_method, delivery_fee, scheduled_at,
        clients(full_name), services(name), barbers(full_name, commission_pct)`)
      .eq("shop_id", resolveShopId())
      .eq("status", "completed")
      .gte("updated_at", turnoStart)
      .order("scheduled_at"),
    supabase.from("caja_egresos")
      .select("*")
      .eq("turno_id", turnoId)
      .order("created_at"),
  ]);

  return { bookings: bookings ?? [], egresos: egresos ?? [] };
}

export default function CajaPage() {
  const qc      = useQueryClient();
  const profile = useAuthStore(s => s.profile);
  const [showAbrirModal, setShowAbrirModal]   = useState(false);
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [showVentaModal, setShowVentaModal]   = useState(false);
  const [cajaChica, setCajaChica]     = useState("");
  const [egresoDesc, setEgresoDesc]   = useState("");
  const [egresoMonto, setEgresoMonto] = useState("");
  const [ventaForm, setVentaForm]     = useState({ clientName: "", service: "", price: "", payMethod: "cash", barbero: "", proofUrl: "" });

  const { data: turno, isLoading: loadingTurno } = useQuery({
    queryKey: ["caja-turno-abierto"],
    queryFn:  getTurnoAbierto,
    refetchInterval: 30000,
  });

  const { data: turnoData = { bookings: [], egresos: [] }, isLoading: loadingData } = useQuery({
    queryKey: ["caja-turno-data", turno?.id],
    queryFn:  () => getTurnoData(turno?.id),
    enabled:  !!turno?.id,
    refetchInterval: 30000,
  });

  const { bookings, egresos } = turnoData;

  // Mutaciones
  const abrirMut = useMutation({
    mutationFn: async () => {
      const sid = resolveShopId();
      const { error } = await supabase.from("caja_turnos").insert({
        shop_id: sid, caja_chica: Number(cajaChica) || 0,
        abierto_por: profile?.id, estado: "abierto",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caja-turno-abierto"] });
      setShowAbrirModal(false); setCajaChica("");
      toast.success("Turno abierto ✅");
    },
    onError: () => toast.error("Error al abrir turno"),
  });

  const egresoMut = useMutation({
    mutationFn: async () => {
      const sid = resolveShopId();
      const { error } = await supabase.from("caja_egresos").insert({
        turno_id: turno.id, shop_id: sid,
        descripcion: egresoDesc, monto: Number(egresoMonto),
        created_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caja-turno-data"] });
      setShowEgresoModal(false); setEgresoDesc(""); setEgresoMonto("");
      toast.success("Egreso registrado");
    },
    onError: () => toast.error("Error al registrar egreso"),
  });

  // Barberos para asignar la venta
  const { data: barbers = [] } = useQuery({
    queryKey: ["admin-barbers-caja"],
    queryFn: async () => {
      const sid = resolveShopId();
      const { data } = await supabase.from("barbers").select("id, full_name").eq("shop_id", sid).eq("is_active", true).order("full_name");
      return data ?? [];
    },
  });

  const ventaMut = useMutation({
    mutationFn: async () => {
      const sid = resolveShopId();
      // Buscar o crear cliente
      let clientId;
      const clientName = ventaForm.clientName.trim() || "Cliente walk-in";
      const { data: existing } = await supabase.from("clients").select("id").eq("shop_id", sid).ilike("full_name", clientName).maybeSingle();
      if (existing) {
        clientId = existing.id;
      } else {
        const { data: nc, error: ce } = await supabase.from("clients").insert({ shop_id: sid, full_name: clientName }).select("id").single();
        if (ce) throw ce;
        clientId = nc.id;
      }
      // Barbero seleccionado o primero activo
      const barberId = ventaForm.barbero || barbers[0]?.id;
      if (!barberId) throw new Error("No hay barberos disponibles");

      // Buscar servicio del catálogo si coincide
      let serviceId = null;
      if (ventaForm.service) {
        const { data: svc } = await supabase.from("services")
          .select("id").eq("shop_id", sid)
          .ilike("name", `%${ventaForm.service}%`).maybeSingle();
        serviceId = svc?.id ?? null;
      }

      const { error } = await supabase.from("bookings").insert({
        shop_id: sid, client_id: clientId, barber_id: barberId,
        service_id: serviceId,
        type: "in_store", status: "completed",
        payment_status: "paid", payment_method: ventaForm.payMethod,
        payment_proof_url: ventaForm.proofUrl || null,
        price: Number(ventaForm.price), price_final: Number(ventaForm.price),
        duration_min: 30, scheduled_at: new Date().toISOString(),
        client_notes: ventaForm.service || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caja-turno-data"], exact: false, refetchType: "all" });
      setShowVentaModal(false);
      setVentaForm({ clientName: "", service: "", price: "", payMethod: "cash", barbero: "", proofUrl: "" });
      toast.success("Venta registrada ✅");
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const cerrarMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("caja_turnos")
        .update({ estado: "cerrado", closed_at: new Date().toISOString() })
        .eq("id", turno.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caja-turno-abierto"] });
      qc.invalidateQueries({ queryKey: ["caja-turno-data"] });
      setShowCierreModal(false);
      toast.success("Turno cerrado 🔒");
    },
    onError: () => toast.error("Error al cerrar turno"),
  });

  // Cálculos
  const totalIngresos  = bookings.reduce((s, b) => s + Number(b.price_final ?? b.price ?? 0), 0);
  const totalEgresos   = egresos.reduce((s, e) => s + Number(e.monto ?? 0), 0);
  const totalEfectivo  = bookings.filter(b => b.payment_method === "cash").reduce((s, b) => s + Number(b.price_final ?? b.price ?? 0), 0);
  const totalTransf    = bookings.filter(b => b.payment_method === "transfer").reduce((s, b) => s + Number(b.price_final ?? b.price ?? 0), 0);
  const totalTarjeta   = bookings.filter(b => b.payment_method === "card").reduce((s, b) => s + Number(b.price_final ?? b.price ?? 0), 0);
  const cajaChicaVal   = Number(turno?.caja_chica ?? 0);
  const totalEnCaja    = cajaChicaVal + totalEfectivo - totalEgresos;

  const inp = { width: "100%", padding: "11px 13px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, boxSizing: "border-box", outline: "none" };

  if (loadingTurno) return <div className="admin-page" style={{ color: "var(--text-faint)" }}>Cargando...</div>;

  // ── SIN TURNO ABIERTO ────────────────────────────────────────
  if (!turno) return (
    <div className="admin-page" style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Caja</h1>
      <p style={{ color: "var(--text-faint)", marginBottom: 40 }}>No hay ningún turno abierto hoy.</p>

      <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--card-bg)", border: "2px dashed var(--border)", borderRadius: 20 }}>
        <p style={{ fontSize: 48, marginBottom: 12 }}>💰</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Abre el turno para empezar</p>
        <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 28, lineHeight: 1.5 }}>
          Al abrir el turno registras la caja chica inicial.<br />
          Los servicios completados se irán sumando automáticamente.
        </p>
        <button
          onClick={() => setShowAbrirModal(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", background: O, border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
        >
          <Unlock size={18} /> Abrir turno
        </button>
      </div>

      {/* Modal abrir turno */}
      {showAbrirModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>Abrir turno</h2>
              <button onClick={() => setShowAbrirModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 6 }}>Caja chica inicial</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--text-faint)", fontSize: 18 }}>$</span>
                <input type="number" value={cajaChica} onChange={e => setCajaChica(e.target.value)}
                  placeholder="0" style={{ ...inp, fontSize: 22, fontWeight: 700 }} autoFocus />
              </div>
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>El monto en efectivo con que inicia el día</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowAbrirModal(false)} style={{ flex: 1, padding: "12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => abrirMut.mutate()} disabled={abrirMut.isPending}
                style={{ flex: 2, padding: "12px", borderRadius: 10, background: "#22c55e", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {abrirMut.isPending ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Unlock size={16} />}
                Abrir turno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── TURNO ABIERTO ────────────────────────────────────────────
  return (
    <div className="admin-page" style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
            <p style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>Turno abierto</p>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", marginBottom: 2 }}>Caja del día</h1>
          <p style={{ fontSize: 12, color: "var(--text-faint)", textTransform: "capitalize" }}>
            Desde {format(new Date(turno.opened_at), "HH:mm 'del' EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowVentaModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: O, border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            <ShoppingBag size={14} /> Venta directa
          </button>
          <button onClick={() => setShowEgresoModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            <TrendingDown size={14} /> Egreso
          </button>
          <button onClick={() => setShowCierreModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            <Lock size={14} /> Cerrar turno
          </button>
        </div>
      </div>

      {/* Resumen financiero */}
      <div style={{ background: "var(--card-bg)", border: `1px solid var(--brand-alpha, rgba(255,107,44,0.3))`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Resumen del turno</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
          <MiniCard label="Caja chica" value={formatCurrency(cajaChicaVal)} color="var(--text-muted)" />
          <MiniCard label="Ingresos" value={formatCurrency(totalIngresos)} color="#22c55e" />
          <MiniCard label="Egresos" value={`-${formatCurrency(totalEgresos)}`} color="#ef4444" />
          <MiniCard label="💵 En caja" value={formatCurrency(totalEnCaja)} color={O} big />
        </div>

        {/* Desglose por método */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, marginBottom: 4 }}>Ingresos por método:</p>
          {[
            { label: "💵 Efectivo",       val: totalEfectivo },
            { label: "💳 Débito/Crédito", val: totalTarjeta  },
            { label: "🏦 Transferencia",  val: totalTransf   },
          ].map(({ label, val }) => val > 0 && (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--text-muted)" }}>{label}</span>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>{formatCurrency(val)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--text-muted)" }}>📋 Servicios completados</span>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>{bookings.length}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Servicios */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
            Servicios ({bookings.length})
          </p>
          {bookings.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-faint)", padding: "20px 0" }}>Sin servicios aún</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {bookings.map(b => {
              const m   = b.payment_method;
              const cfg = METHOD_CFG[m] ?? { emoji: "❓" };
              const amt = Number(b.price_final ?? b.price ?? 0);
              return (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{cfg.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 12, color: "var(--text)", marginBottom: 1 }}>{b.clients?.full_name}</p>
                    <p style={{ fontSize: 11, color: "var(--text-faint)" }}>{b.services?.name} · {b.barbers?.full_name}</p>
                  </div>
                  <p style={{ fontWeight: 700, color: O, fontSize: 13, flexShrink: 0 }}>{formatCurrency(amt)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Egresos */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", letterSpacing: 1.5, textTransform: "uppercase" }}>
              Egresos ({egresos.length})
            </p>
            <button onClick={() => setShowEgresoModal(true)}
              style={{ fontSize: 11, color: O, background: "none", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <Plus size={12} /> Agregar
            </button>
          </div>
          {egresos.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-faint)", padding: "20px 0" }}>Sin egresos registrados</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {egresos.map(e => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--card-bg)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10 }}>
                <TrendingDown size={14} color="#ef4444" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 12, color: "var(--text)", marginBottom: 1 }}>{e.descripcion}</p>
                  <p style={{ fontSize: 11, color: "var(--text-faint)" }}>
                    {format(new Date(e.created_at), "HH:mm")}
                  </p>
                </div>
                <p style={{ fontWeight: 700, color: "#ef4444", fontSize: 13, flexShrink: 0 }}>-{formatCurrency(e.monto)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal egreso */}
      {showEgresoModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>Registrar egreso</h2>
              <button onClick={() => setShowEgresoModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 6 }}>Descripción</label>
                <input value={egresoDesc} onChange={e => setEgresoDesc(e.target.value)}
                  placeholder="Ej: Insumos, arriendo, etc." style={inp} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 6 }}>Monto</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--text-faint)", fontSize: 18 }}>$</span>
                  <input type="number" value={egresoMonto} onChange={e => setEgresoMonto(e.target.value)}
                    placeholder="0" style={{ ...inp, fontSize: 18, fontWeight: 700 }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowEgresoModal(false)} style={{ flex: 1, padding: "12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => egresoMut.mutate()} disabled={egresoMut.isPending || !egresoDesc || !egresoMonto}
                style={{ flex: 2, padding: "12px", borderRadius: 10, background: "#ef4444", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: egresoMut.isPending ? 0.7 : 1 }}>
                {egresoMut.isPending ? "Guardando..." : "Registrar egreso"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cierre de turno */}
      {showCierreModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 440 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>Cierre de turno</h2>
            <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 24 }}>Resumen final antes de cerrar</p>

            <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <CierreRow label="Caja chica inicial"   value={formatCurrency(cajaChicaVal)}    color="var(--text-muted)" />
              <CierreRow label="+ Efectivo cobrado"   value={formatCurrency(totalEfectivo)}    color="#22c55e" />
              <CierreRow label="+ Transferencias"     value={formatCurrency(totalTransf)}      color="#8b5cf6" />
              <CierreRow label="+ Tarjeta"            value={formatCurrency(totalTarjeta)}     color="#3b82f6" />
              <CierreRow label="- Egresos"            value={`-${formatCurrency(totalEgresos)}`} color="#ef4444" />
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <CierreRow label="💵 Total en caja (efectivo)" value={formatCurrency(totalEnCaja)} color={O} bold />
                <CierreRow label="📊 Total facturado"          value={formatCurrency(totalIngresos)} color="var(--text)" bold />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowCierreModal(false)} style={{ flex: 1, padding: "12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => cerrarMut.mutate()} disabled={cerrarMut.isPending}
                style={{ flex: 2, padding: "12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Lock size={15} /> Cerrar turno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL VENTA DIRECTA ── */}
      {showVentaModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>Venta directa</h2>
                <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>Cliente en el local sin reserva previa</p>
              </div>
              <button onClick={() => setShowVentaModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}><X size={20} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 6 }}>Nombre del cliente</label>
                <input value={ventaForm.clientName} onChange={e => setVentaForm({ ...ventaForm, clientName: e.target.value })}
                  placeholder="Cliente walk-in"
                  style={{ width: "100%", padding: "11px 13px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 6 }}>Servicio</label>
                <input value={ventaForm.service} onChange={e => setVentaForm({ ...ventaForm, service: e.target.value })}
                  placeholder="Ej: Fade, Corte clásico..."
                  style={{ width: "100%", padding: "11px 13px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 6 }}>Barbero</label>
                <select value={ventaForm.barbero} onChange={e => setVentaForm({ ...ventaForm, barbero: e.target.value })}
                  style={{ width: "100%", padding: "11px 13px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "pointer" }}>
                  {barbers.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 6 }}>Monto *</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--text-faint)", fontSize: 20 }}>$</span>
                  <input type="number" value={ventaForm.price} onChange={e => setVentaForm({ ...ventaForm, price: e.target.value })}
                    placeholder="0"
                    style={{ flex: 1, padding: "11px 13px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 22, fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 8 }}>Método de pago</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.key} onClick={() => setVentaForm({ ...ventaForm, payMethod: m.key })}
                      style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                        border: `1px solid ${ventaForm.payMethod === m.key ? O : "var(--border)"}`,
                        background: ventaForm.payMethod === m.key ? "var(--brand-alpha)" : "var(--surface2)" }}>
                      <span style={{ fontSize: 16 }}>{m.emoji}</span>
                      <span style={{ fontSize: 12, fontWeight: ventaForm.payMethod === m.key ? 700 : 400, color: ventaForm.payMethod === m.key ? O : "var(--text)" }}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {ventaForm.payMethod === "transfer" && (
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 6 }}>📸 Foto del comprobante</label>
                  <ImageUpload value={ventaForm.proofUrl} onChange={url => setVentaForm({ ...ventaForm, proofUrl: url })}
                    folder="payment-proofs" label="Subir comprobante" aspect="wide" capture="environment" />
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowVentaModal(false)}
                style={{ flex: 1, padding: "12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => ventaMut.mutate()}
                disabled={ventaMut.isPending || !ventaForm.price || (ventaForm.payMethod === "transfer" && !ventaForm.proofUrl)}
                style={{ flex: 2, padding: "12px", borderRadius: 10, background: O, border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: ventaMut.isPending ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {ventaMut.isPending ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <ShoppingBag size={15} />}
                {ventaMut.isPending ? "Registrando..." : "Registrar venta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniCard({ label, value, color, big }) {
  return (
    <div style={{ background: "var(--surface2)", borderRadius: 12, padding: "12px 14px" }}>
      <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: big ? 22 : 17, fontWeight: 900, color }}>{value}</p>
    </div>
  );
}

function CierreRow({ label, value, color, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: bold ? 15 : 13, fontWeight: bold ? 800 : 600, color }}>{value}</span>
    </div>
  );
}
