import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, X, Loader2, Lock, Unlock, DollarSign, TrendingDown, ShoppingBag, Package, Scissors } from "lucide-react";
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
        clients(full_name), services(name),
        barbers(id, full_name, commission_pct, payment_model, chair_rent_amount, chair_rent_period, day_rate_amount)`)
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
  const [pagoModal, setPagoModal]             = useState(null); // booking a registrar pago
  const [pagoMethod, setPagoMethod]           = useState("cash");
  const [pagoPriceFinal, setPagoPriceFinal]   = useState("");
  const [cajaChica, setCajaChica]     = useState("");
  const [egresoDesc, setEgresoDesc]   = useState("");
  const [egresoMonto, setEgresoMonto] = useState("");
  const [ventaForm, setVentaForm]     = useState({ clientName: "", serviceId: "", price: "", payMethod: "cash", barbero: "", proofUrl: "" });
  const [ventaItems, setVentaItems]   = useState([]); // productos inventario {id, name, qty, price_sell}

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

  const pagoMut = useMutation({
    mutationFn: async ({ bookingId, method, priceFinal }) => {
      const { error } = await supabase.from("bookings")
        .update({
          payment_method: method,
          payment_status: "paid",
          price_final: priceFinal ? Number(priceFinal) : null,
        })
        .eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caja-turno-data"], exact: false, refetchType: "all" });
      setPagoModal(null);
      toast.success("Pago registrado ✅");
    },
    onError: () => toast.error("Error al registrar pago"),
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

  // Servicios del catálogo para venta directa
  const { data: catalogServices = [] } = useQuery({
    queryKey: ["admin-services-caja"],
    queryFn: async () => {
      const sid = resolveShopId();
      const { data } = await supabase.from("services").select("id, name, price").eq("shop_id", sid).eq("is_available", true).order("name");
      return data ?? [];
    },
    enabled: showVentaModal,
  });

  // Productos de inventario para venta directa
  const { data: inventoryProducts = [] } = useQuery({
    queryKey: ["inventory-caja"],
    queryFn: async () => {
      const sid = resolveShopId();
      const { data } = await supabase.from("inventory_products").select("id, name, price_sell, stock, unit").eq("shop_id", sid).eq("is_active", true).gt("stock", 0).order("name");
      return data ?? [];
    },
    enabled: showVentaModal,
  });

  const ventaMut = useMutation({
    mutationFn: async () => {
      const sid = resolveShopId();

      // Buscar o crear cliente
      const clientName = ventaForm.clientName.trim() || "Cliente walk-in";
      const { data: existing } = await supabase.from("clients").select("id").eq("shop_id", sid).ilike("full_name", clientName).maybeSingle();
      let clientId;
      if (existing) {
        clientId = existing.id;
      } else {
        const { data: nc, error: ce } = await supabase.from("clients").insert({ shop_id: sid, full_name: clientName }).select("id").single();
        if (ce) throw ce;
        clientId = nc.id;
      }

      const barberId = ventaForm.barbero || barbers[0]?.id;
      if (!barberId) throw new Error("No hay barberos disponibles");

      // Calcular precio total: servicio + productos
      const servicePrice  = Number(ventaForm.price) || 0;
      const productsTotal = ventaItems.reduce((s, i) => s + i.price_sell * i.qty, 0);
      const totalPrice    = servicePrice + productsTotal;

      const serviceSel = catalogServices.find(s => s.id === ventaForm.serviceId);
      const notes      = ventaItems.length
        ? ventaItems.map(i => `${i.name} x${i.qty}`).join(", ")
        : null;

      const { error } = await supabase.from("bookings").insert({
        shop_id: sid, client_id: clientId, barber_id: barberId,
        service_id: ventaForm.serviceId || null,
        type: "in_store", status: "completed",
        payment_status: "paid", payment_method: ventaForm.payMethod,
        payment_proof_url: ventaForm.proofUrl || null,
        price: totalPrice, price_final: totalPrice,
        duration_min: serviceSel ? (serviceSel.duration_min ?? 30) : 30,
        scheduled_at: new Date().toISOString(),
        client_notes: notes,
      });
      if (error) throw error;

      // Descontar stock de cada producto vendido
      if (ventaItems.length) {
        const { adjustStock, registerSale } = await import("../services/inventoryService");
        await Promise.all(ventaItems.map(item =>
          registerSale({ productId: item.id, qty: item.qty, price: item.price_sell })
        ));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caja-turno-data"], exact: false, refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      setShowVentaModal(false);
      setVentaForm({ clientName: "", serviceId: "", price: "", payMethod: "cash", barbero: "", proofUrl: "" });
      setVentaItems([]);
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

  // Cálculos totales
  const totalIngresos  = bookings.reduce((s, b) => s + Number(b.price_final ?? b.price ?? 0), 0);
  const totalEgresos   = egresos.reduce((s, e) => s + Number(e.monto ?? 0), 0);
  const totalEfectivo  = bookings.filter(b => b.payment_method === "cash").reduce((s, b) => s + Number(b.price_final ?? b.price ?? 0), 0);
  const totalTransf    = bookings.filter(b => b.payment_method === "transfer").reduce((s, b) => s + Number(b.price_final ?? b.price ?? 0), 0);
  const totalTarjeta   = bookings.filter(b => b.payment_method === "card").reduce((s, b) => s + Number(b.price_final ?? b.price ?? 0), 0);
  const cajaChicaVal   = Number(turno?.caja_chica ?? 0);
  const totalEnCaja    = cajaChicaVal + totalEfectivo - totalEgresos;

  // Compensación por barbero según su modelo de pago
  const PERIOD_LABEL = { daily: "por día", weekly: "por semana", monthly: "por mes" };

  // Solo calcular compensación sobre reservas reales (no ventas directas walk-in sin servicio)
  const byBarber = bookings.filter(b => b.service_id != null).reduce((acc, b) => {
    const barber = b.barbers;
    if (!barber) return acc;
    const name  = barber.full_name ?? "Sin asignar";
    const model = barber.payment_model ?? "percentage";
    const amt   = Number(b.price_final ?? b.price ?? 0);

    if (!acc[name]) {
      acc[name] = { count: 0, totalServices: 0, compensation: 0, model, barber };
    }
    acc[name].count++;
    acc[name].totalServices += amt;

    if (model === "percentage") {
      acc[name].compensation += amt * (Number(barber.commission_pct ?? 0) / 100);
    }
    // Para arriendo y día_rate se calcula al cierre, no por servicio
    return acc;
  }, {});

  // Para arriendo de silla y día_rate: calcular lo que debe el barbero al local
  Object.values(byBarber).forEach(b => {
    if (b.model === "day_rate") {
      // Cada barbero aparece = 1 día trabajado en este turno
      b.debtToShop = Number(b.barber?.day_rate_amount ?? 0);
    } else if (b.model === "chair_rent") {
      b.debtToShop = Number(b.barber?.chair_rent_amount ?? 0);
      b.rentPeriod = PERIOD_LABEL[b.barber?.chair_rent_period ?? "monthly"];
    }
  });

  const inp = { width: "100%", padding: "11px 13px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, boxSizing: "border-box", outline: "none" };

  if (loadingTurno) return <div className="admin-page" style={{ color: "var(--text-faint)" }}>Cargando...</div>;

  // ── SIN TURNO ABIERTO ────────────────────────────────────────
  if (!turno) return (
    <div className="admin-page" style={{ maxWidth: "min(600px, 100%)" }}>
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
    <div className="admin-page" style={{ maxWidth: "min(900px, 100%)" }}>
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
              const m      = b.payment_method;
              const cfg    = METHOD_CFG[m] ?? null;
              const amt    = Number(b.price_final ?? b.price ?? 0);
              const sinPago = !m;
              return (
                <div key={b.id} style={{ background: "var(--card-bg)", border: `1px solid ${sinPago ? "rgba(251,191,36,0.4)" : "var(--border)"}`, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{cfg ? cfg.emoji : "❓"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 12, color: "var(--text)", marginBottom: 1 }}>{b.clients?.full_name}</p>
                      <p style={{ fontSize: 11, color: "var(--text-faint)" }}>{b.services?.name} · {b.barbers?.full_name}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <p style={{ fontWeight: 700, color: O, fontSize: 13 }}>{formatCurrency(amt)}</p>
                      {sinPago && (
                        <button
                          onClick={() => { setPagoModal(b); setPagoMethod("cash"); setPagoPriceFinal(String(amt)); }}
                          style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)", color: "#f59e0b", cursor: "pointer", whiteSpace: "nowrap" }}>
                          Registrar pago
                        </button>
                      )}
                    </div>
                  </div>
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

      {/* ── COMPENSACIÓN POR BARBERO ── */}
      {Object.keys(byBarber).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
            Compensación barberos
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(byBarber).map(([name, data]) => (
              <div key={name} style={{ padding: "14px 16px", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{name}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        background: data.model === "percentage" ? "rgba(59,130,246,0.1)" : data.model === "chair_rent" ? "rgba(168,85,247,0.1)" : "rgba(245,158,11,0.1)",
                        color: data.model === "percentage" ? "#3b82f6" : data.model === "chair_rent" ? "#a855f7" : "#f59e0b" }}>
                        {data.model === "percentage" ? "📊 Porcentaje" : data.model === "chair_rent" ? "🪑 Arriendo" : "📅 Día"}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-faint)" }}>
                      {data.count} servicio{data.count > 1 ? "s" : ""} · {formatCurrency(data.totalServices)} facturado
                    </p>
                  </div>

                  {/* Lo que gana o debe según modelo */}
                  <div style={{ textAlign: "right" }}>
                    {data.model === "percentage" && (
                      <>
                        <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 2 }}>
                          Gana ({data.barber?.commission_pct ?? 0}%)
                        </p>
                        <p style={{ fontWeight: 800, fontSize: 16, color: "#22c55e" }}>
                          +{formatCurrency(data.compensation)}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                          Local: {formatCurrency(data.totalServices - data.compensation)}
                        </p>
                      </>
                    )}
                    {data.model === "chair_rent" && (
                      <>
                        <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 2 }}>
                          Debe pagar ({data.rentPeriod})
                        </p>
                        <p style={{ fontWeight: 800, fontSize: 16, color: "#a855f7" }}>
                          {formatCurrency(data.debtToShop)}
                        </p>
                        <p style={{ fontSize: 11, color: "#22c55e", marginTop: 2 }}>
                          Facturó: {formatCurrency(data.totalServices)}
                        </p>
                      </>
                    )}
                    {data.model === "day_rate" && (
                      <>
                        <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 2 }}>
                          Debe pagar (hoy)
                        </p>
                        <p style={{ fontWeight: 800, fontSize: 16, color: "#f59e0b" }}>
                          {formatCurrency(data.debtToShop)}
                        </p>
                        <p style={{ fontSize: 11, color: "#22c55e", marginTop: 2 }}>
                          Facturó: {formatCurrency(data.totalServices)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* ── MODAL REGISTRAR PAGO ── */}
      {pagoModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 500 }}>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>Registrar pago</p>
              <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
                {pagoModal.clients?.full_name} · {pagoModal.services?.name} · {pagoModal.barbers?.full_name}
              </p>
            </div>

            {/* Precio final */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, display: "block", marginBottom: 8 }}>MONTO COBRADO</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18, color: "var(--text-faint)" }}>$</span>
                <input type="number" value={pagoPriceFinal} onChange={e => setPagoPriceFinal(e.target.value)}
                  style={{ flex: 1, padding: "12px 14px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 18, fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            {/* Método de pago */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, display: "block", marginBottom: 10 }}>MÉTODO DE PAGO</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PAYMENT_METHODS.map(m => (
                  <button key={m.key} onClick={() => setPagoMethod(m.key)}
                    style={{ padding: "12px", borderRadius: 10, cursor: "pointer", border: `1px solid ${pagoMethod === m.key ? O : "var(--border)"}`, background: pagoMethod === m.key ? "var(--brand-alpha)" : "var(--surface2)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{m.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: pagoMethod === m.key ? 700 : 400, color: pagoMethod === m.key ? O : "var(--text)" }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setPagoModal(null)}
                style={{ flex: 1, padding: "13px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button
                onClick={() => pagoMut.mutate({ bookingId: pagoModal.id, method: pagoMethod, priceFinal: pagoPriceFinal })}
                disabled={pagoMut.isPending || !pagoPriceFinal}
                style={{ flex: 2, padding: "13px", borderRadius: 10, background: "#22c55e", border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: pagoMut.isPending ? 0.7 : 1 }}>
                {pagoMut.isPending ? "Guardando..." : "✓ Confirmar pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL VENTA DIRECTA ── */}
      {showVentaModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>Venta directa</h2>
                <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>Cliente en el local sin reserva previa</p>
              </div>
              <button onClick={() => { setShowVentaModal(false); setVentaItems([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}><X size={20} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>

              {/* Cliente */}
              <div>
                <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 6 }}>NOMBRE DEL CLIENTE</label>
                <input value={ventaForm.clientName} onChange={e => setVentaForm({ ...ventaForm, clientName: e.target.value })}
                  placeholder="Cliente walk-in"
                  style={{ width: "100%", padding: "11px 13px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Barbero */}
              <div>
                <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 6 }}>BARBERO</label>
                <select value={ventaForm.barbero} onChange={e => setVentaForm({ ...ventaForm, barbero: e.target.value })}
                  style={{ width: "100%", padding: "11px 13px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "pointer" }}>
                  {barbers.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
                </select>
              </div>

              {/* Servicio del catálogo */}
              <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 14, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Scissors size={13} color="var(--brand,#FF6B2C)" />
                  <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700 }}>SERVICIO</label>
                </div>
                <select
                  value={ventaForm.serviceId}
                  onChange={e => {
                    const svc = catalogServices.find(s => s.id === e.target.value);
                    setVentaForm(f => ({ ...f, serviceId: e.target.value, price: svc ? String(svc.price) : f.price }));
                  }}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "pointer", marginBottom: 10 }}
                >
                  <option value="">Sin servicio / solo producto</option>
                  {catalogServices.map(s => <option key={s.id} value={s.id}>{s.name} — ${Number(s.price).toLocaleString("es-CL")}</option>)}
                </select>
                {/* Precio editable (se autocompleta con el servicio pero es modificable) */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--text-faint)", fontSize: 16 }}>$</span>
                  <input type="number" value={ventaForm.price} onChange={e => setVentaForm({ ...ventaForm, price: e.target.value })}
                    placeholder="Precio del servicio"
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 18, fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Productos del inventario */}
              {inventoryProducts.length > 0 && (
                <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 14, border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Package size={13} color="var(--brand,#FF6B2C)" />
                    <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700 }}>PRODUCTOS (opcional)</label>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                    {inventoryProducts.map(p => {
                      const item = ventaItems.find(i => i.id === p.id);
                      const qty  = item?.qty ?? 0;
                      return (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: qty > 0 ? "rgba(255,107,44,0.06)" : "var(--card-bg)", border: `1px solid ${qty > 0 ? "rgba(255,107,44,0.3)" : "var(--border)"}`, borderRadius: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 1 }}>{p.name}</p>
                            <p style={{ fontSize: 11, color: "var(--text-faint)" }}>${Number(p.price_sell).toLocaleString("es-CL")} · stock: {p.stock}</p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            <button type="button" onClick={() => {
                              if (qty <= 0) return;
                              setVentaItems(items => qty === 1
                                ? items.filter(i => i.id !== p.id)
                                : items.map(i => i.id === p.id ? { ...i, qty: i.qty - 1 } : i)
                              );
                            }} style={{ width: 26, height: 26, borderRadius: 6, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontWeight: 700, fontSize: 16, cursor: qty > 0 ? "pointer" : "not-allowed", opacity: qty > 0 ? 1 : 0.3, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                            <span style={{ fontSize: 14, fontWeight: 700, color: qty > 0 ? "var(--brand,#FF6B2C)" : "var(--text-faint)", minWidth: 16, textAlign: "center" }}>{qty}</span>
                            <button type="button" onClick={() => {
                              if (qty >= p.stock) return;
                              setVentaItems(items => item
                                ? items.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i)
                                : [...items, { id: p.id, name: p.name, price_sell: p.price_sell, qty: 1 }]
                              );
                            }} style={{ width: 26, height: 26, borderRadius: 6, background: "var(--brand,#FF6B2C)", border: "none", color: "#fff", fontWeight: 700, fontSize: 16, cursor: qty < p.stock ? "pointer" : "not-allowed", opacity: qty < p.stock ? 1 : 0.3, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resumen total */}
              {(Number(ventaForm.price) > 0 || ventaItems.length > 0) && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,107,44,0.06)", border: "1px solid rgba(255,107,44,0.2)", borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--text-faint)", fontWeight: 600 }}>Total a cobrar</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "var(--brand,#FF6B2C)" }}>
                    ${(Number(ventaForm.price || 0) + ventaItems.reduce((s, i) => s + i.price_sell * i.qty, 0)).toLocaleString("es-CL")}
                  </span>
                </div>
              )}

              {/* Método de pago */}
              <div>
                <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 8 }}>MÉTODO DE PAGO</label>
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
              <button onClick={() => { setShowVentaModal(false); setVentaItems([]); }}
                style={{ flex: 1, padding: "12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => ventaMut.mutate()}
                disabled={ventaMut.isPending || (!ventaForm.price && ventaItems.length === 0) || (ventaForm.payMethod === "transfer" && !ventaForm.proofUrl)}
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
