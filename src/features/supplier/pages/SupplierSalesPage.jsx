import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ScanLine, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Banknote, Clock, CheckCircle, Search, X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../../../store/authStore";
import { getSupplierByProfileId, getSupplierProducts } from "../services/supplierService";
import { supabase } from "../../../lib/supabase";
import { formatCurrency } from "../../../lib/utils";

const O = "var(--brand, #FF6B2C)";

const PAYMENT_METHODS = [
  { id: "cash",     label: "Efectivo",       icon: Banknote   },
  { id: "transfer", label: "Transferencia",  icon: CreditCard },
  { id: "credit",   label: "A crédito",      icon: Clock      },
];

async function recordSale({ supplierId, items, paymentMethod, creditDays, clientName, clientPhone, note }) {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const { data, error } = await supabase
    .from("supplier_sales")
    .insert({
      supplier_id:    supplierId,
      items,
      total,
      payment_method: paymentMethod,
      credit_days:    paymentMethod === "credit" ? (creditDays || 30) : null,
      client_name:    clientName || null,
      client_phone:   clientPhone || null,
      note:           note || null,
      status:         paymentMethod === "credit" ? "pending" : "paid",
    })
    .select()
    .single();
  if (error) throw error;
  for (const item of items) {
    if (item.product_id) {
      await supabase.rpc("decrement_supplier_stock", {
        p_product_id: item.product_id,
        p_qty:        item.qty,
      }).throwOnError();
    }
  }
  return data;
}

export default function SupplierSalesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [cart, setCart]               = useState([]);
  const [scanning, setScanning]       = useState(false);
  const [lastScanned, setLastScanned] = useState(null); // { name, qty } para feedback visual
  const [manualSku, setManualSku]     = useState("");
  const [manualSearch, setManualSearch] = useState("");
  const [payMethod, setPayMethod]     = useState("cash");
  const [creditDays, setCreditDays]   = useState("30");
  const [clientName, setClientName]   = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [note, setNote]               = useState("");
  const [done, setDone]               = useState(false);

  const videoRef        = useRef(null);
  const streamRef       = useRef(null);
  const scanIntervalRef = useRef(null);
  const lastScannedRef  = useRef("");   // evita agregar el mismo código dos veces seguidas

  const { data: supplier } = useQuery({
    queryKey: ["supplier-profile", user?.id],
    queryFn:  () => getSupplierByProfileId(user.id),
    enabled:  !!user?.id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["supplier-products", supplier?.id],
    queryFn:  () => getSupplierProducts(supplier.id),
    enabled:  !!supplier?.id,
  });

  const saleMut = useMutation({
    mutationFn: recordSale,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-products"] });
      qc.invalidateQueries({ queryKey: ["supplier-sales"] });
      setDone(true);
      toast.success("Venta registrada");
    },
    onError: (e) => toast.error(e.message || "Error al registrar venta"),
  });

  // ── Cámara ──────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    clearInterval(scanIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    lastScannedRef.current = "";
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Cuando llegan los productos arrancamos el detector (puede que lleguen después del startCamera)
  useEffect(() => {
    if (!scanning || !("BarcodeDetector" in window) || products.length === 0) return;
    clearInterval(scanIntervalRef.current);
    const detector = new window.BarcodeDetector({
      formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a", "upc_e", "code_39"],
    });
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length === 0) return;
        const raw = barcodes[0].rawValue;
        if (raw === lastScannedRef.current) return; // mismo código, esperar
        lastScannedRef.current = raw;
        setTimeout(() => { lastScannedRef.current = ""; }, 2000); // reset anti-dup después de 2s
        addBySku(raw);
      } catch {}
    }, 600);
    return () => clearInterval(scanIntervalRef.current);
  }, [scanning, products]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setScanning(true);
    } catch {
      toast.error("No se pudo acceder a la cámara");
    }
  }, []);

  // ── Lógica de carrito ────────────────────────────────────────
  function addBySku(sku) {
    if (!sku?.trim()) return;
    const found = products.find(p => p.sku?.toLowerCase() === sku.trim().toLowerCase());
    if (!found) {
      toast.error(`SKU "${sku}" no encontrado`);
      return;
    }
    addToCart(found);
  }

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product_id: product.id, name: product.name, sku: product.sku, price: product.price, qty: 1, unit: product.unit }];
    });
    setLastScanned({ name: product.name });
    setTimeout(() => setLastScanned(null), 1800);
  }

  function changeQty(productId, delta) {
    setCart(prev => prev.map(i => i.product_id === productId ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
  }

  function handleManualSku(e) {
    e.preventDefault();
    addBySku(manualSku);
    setManualSku("");
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const filteredProducts = manualSearch
    ? products.filter(p =>
        p.name.toLowerCase().includes(manualSearch.toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(manualSearch.toLowerCase())
      )
    : [];

  async function handleConfirm() {
    if (cart.length === 0 || !supplier?.id) return;
    await saleMut.mutateAsync({
      supplierId: supplier.id, items: cart, paymentMethod: payMethod,
      creditDays: payMethod === "credit" ? Number(creditDays) : null,
      clientName, clientPhone, note,
    });
  }

  function resetSale() {
    setCart([]); setPayMethod("cash"); setCreditDays("30");
    setClientName(""); setClientPhone(""); setNote("");
    setDone(false);
  }

  // ── Pantalla de éxito ────────────────────────────────────────
  if (done) {
    return (
      <div className="sup-page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
        <CheckCircle size={64} color="#22c55e" style={{ marginBottom: 20 }} />
        <p style={{ fontWeight: 800, fontSize: 22, color: "var(--text)", marginBottom: 8 }}>Venta registrada</p>
        <p style={{ color: "var(--text-faint)", fontSize: 14, marginBottom: 28 }}>
          {payMethod === "credit" ? `Crédito a ${creditDays} días — ${clientName || "cliente"}` : "Pago recibido"}
        </p>
        <button onClick={resetSale} style={{ padding: "12px 28px", borderRadius: 12, background: O, color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}>
          Nueva venta
        </button>
      </div>
    );
  }

  return (
    <div className="sup-page" style={{ maxWidth: "min(600px, 100%)", paddingBottom: 40 }}>

      {/* ── CÁMARA ESCÁNER (arriba, fija) ── */}
      <div style={{ marginBottom: 16 }}>
        {!scanning ? (
          <button onClick={startCamera}
            style={{ width: "100%", padding: "18px", borderRadius: 16, background: `rgba(255,107,44,0.07)`, border: `2px dashed rgba(255,107,44,0.4)`, color: O, fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <ScanLine size={22} /> Activar cámara para escanear
          </button>
        ) : (
          <div style={{ borderRadius: 16, overflow: "hidden", position: "relative", background: "#000" }}>
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: "100%", height: 240, objectFit: "cover", display: "block" }} />

            {/* Línea de escaneo animada */}
            <style>{`
              @keyframes scan-line {
                0%   { top: 20%; }
                50%  { top: 75%; }
                100% { top: 20%; }
              }
            `}</style>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {/* Marco */}
              <div style={{ position: "absolute", top: "15%", left: "10%", right: "10%", bottom: "15%", border: `2px solid ${O}`, borderRadius: 12 }} />
              {/* Línea animada */}
              <div style={{ position: "absolute", left: "10%", right: "10%", height: 2, background: O, opacity: 0.9, borderRadius: 2, animation: "scan-line 2s ease-in-out infinite" }} />
            </div>

            {/* Feedback de último escaneado */}
            {lastScanned && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(34,197,94,0.9)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={16} color="#fff" />
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>+ {lastScanned.name}</p>
              </div>
            )}

            <button onClick={stopCamera}
              style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <X size={14} /> Detener
            </button>

            {!("BarcodeDetector" in window) && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(239,68,68,0.85)", padding: "8px 12px", textAlign: "center" }}>
                <p style={{ color: "#fff", fontSize: 12 }}>Tu navegador no soporta auto-detección — usá el ingreso manual</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── INGRESO MANUAL DE SKU ── */}
      <form onSubmit={handleManualSku} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={manualSku}
          onChange={e => setManualSku(e.target.value)}
          placeholder="Ingresá el SKU manualmente..."
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none" }}
        />
        <button type="submit" style={{ padding: "10px 14px", borderRadius: 10, background: O, color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
          +
        </button>
      </form>

      {/* ── BÚSQUEDA POR NOMBRE ── */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} />
        <input
          value={manualSearch}
          onChange={e => setManualSearch(e.target.value)}
          placeholder="Buscar por nombre o SKU..."
          style={{ width: "100%", paddingLeft: 32, padding: "10px 12px 10px 32px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {filteredProducts.length > 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          {filteredProducts.slice(0, 6).map(p => (
            <button key={p.id} onClick={() => { addToCart(p); setManualSearch(""); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "11px 14px", background: "var(--surface)", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left" }}>
              <div>
                <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 14 }}>{p.name}</p>
                {p.sku && <p style={{ fontSize: 11, color: "var(--text-faint)" }}>SKU: {p.sku}</p>}
              </div>
              <p style={{ fontWeight: 800, color: O, fontSize: 14, flexShrink: 0 }}>{formatCurrency(p.price)}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── CARRITO ── */}
      {cart.length === 0 ? (
        <div style={{ textAlign: "center", padding: "36px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, marginBottom: 16 }}>
          <ShoppingCart size={36} color="var(--text-faint)" style={{ opacity: 0.25, marginBottom: 10 }} />
          <p style={{ color: "var(--text-faint)", fontSize: 14 }}>Los productos escaneados aparecen aquí</p>
        </div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <ShoppingCart size={15} /> {cart.length} {cart.length === 1 ? "producto" : "productos"}
            </p>
            <button onClick={() => setCart([])} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 12 }}>Limpiar</button>
          </div>

          {cart.map(item => (
            <div key={item.product_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                <p style={{ fontSize: 12, color: "var(--text-faint)" }}>{formatCurrency(item.price)} c/u</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <button onClick={() => changeQty(item.product_id, -1)}
                  style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Minus size={13} />
                </button>
                <span style={{ fontWeight: 700, color: "var(--text)", minWidth: 22, textAlign: "center", fontSize: 15 }}>{item.qty}</span>
                <button onClick={() => changeQty(item.product_id, 1)}
                  style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={13} />
                </button>
              </div>
              <p style={{ fontWeight: 800, color: O, fontSize: 14, minWidth: 64, textAlign: "right", flexShrink: 0 }}>{formatCurrency(item.price * item.qty)}</p>
              <button onClick={() => changeQty(item.product_id, -item.qty)}
                style={{ padding: "6px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", cursor: "pointer", display: "flex", flexShrink: 0 }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>Total</p>
            <p style={{ fontWeight: 900, color: O, fontSize: 22 }}>{formatCurrency(total)}</p>
          </div>
        </div>
      )}

      {/* ── PAGO ── */}
      {cart.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 18 }}>
          <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14, marginBottom: 12 }}>Método de pago</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setPayMethod(id)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "11px 6px", borderRadius: 12, border: `2px solid ${payMethod === id ? O : "var(--border)"}`, background: payMethod === id ? `rgba(255,107,44,0.08)` : "var(--surface2)", cursor: "pointer", color: payMethod === id ? O : "var(--text-faint)", fontWeight: payMethod === id ? 700 : 400, fontSize: 12 }}>
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>

          {payMethod === "credit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14, padding: 12, background: "rgba(255,107,44,0.05)", border: "1px solid rgba(255,107,44,0.2)", borderRadius: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 4 }}>CLIENTE / LOCAL *</label>
                  <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre..."
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 4 }}>TELÉFONO</label>
                  <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Opcional..."
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 4 }}>PLAZO EN DÍAS</label>
                <input type="number" value={creditDays} onChange={e => setCreditDays(e.target.value)} min="1"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          )}

          {payMethod !== "credit" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 4 }}>CLIENTE (OPCIONAL)</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente..."
                style={{ width: "100%", padding: "9px 12px", borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 4 }}>NOTA</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ej: entrega en local..."
              style={{ width: "100%", padding: "9px 12px", borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>

          <button onClick={handleConfirm} disabled={saleMut.isPending}
            style={{ width: "100%", padding: 15, borderRadius: 12, background: O, color: "#fff", fontWeight: 800, fontSize: 16, border: "none", cursor: saleMut.isPending ? "not-allowed" : "pointer", opacity: saleMut.isPending ? 0.7 : 1 }}>
            {saleMut.isPending ? "Registrando..." : `Confirmar venta · ${formatCurrency(total)}`}
          </button>
        </div>
      )}
    </div>
  );
}
