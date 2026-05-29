import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ScanLine, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Banknote, Clock, CheckCircle, Search, X,
} from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { toast } from "sonner";
import { useAuthStore } from "../../../store/authStore";
import { getSupplierByProfileId, getSupplierProducts } from "../services/supplierService";
import { supabase } from "../../../lib/supabase";
import { formatCurrency } from "../../../lib/utils";

const O = "var(--brand, #FF6B2C)";

const PAYMENT_METHODS = [
  { id: "cash",     label: "Efectivo",      icon: Banknote   },
  { id: "transfer", label: "Transferencia", icon: CreditCard },
  { id: "credit",   label: "A crédito",     icon: Clock      },
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

  const [cart, setCart]                 = useState([]);
  const [scanning, setScanning]         = useState(false);
  const [lastScanned, setLastScanned]   = useState(null);
  const [manualSku, setManualSku]       = useState("");
  const [manualSearch, setManualSearch] = useState("");
  const [payMethod, setPayMethod]       = useState("cash");
  const [creditDays, setCreditDays]     = useState("30");
  const [clientName, setClientName]     = useState("");
  const [clientPhone, setClientPhone]   = useState("");
  const [note, setNote]                 = useState("");
  const [done, setDone]                 = useState(false);

  const videoRef       = useRef(null);
  const readerRef      = useRef(null);
  const lastScannedRef = useRef("");
  // ref estable para addBySku (evita re-crear el reader en cada render)
  const productsRef    = useRef([]);

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

  // Mantener ref actualizado sin re-crear el reader
  useEffect(() => { productsRef.current = products; }, [products]);

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

  // ── ZXing Scanner ────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    lastScannedRef.current = "";
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Cuando scanning cambia a true y el video está en DOM, iniciamos ZXing
  useEffect(() => {
    if (!scanning || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.decodeFromConstraints(
      { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      videoRef.current,
      (result, err) => {
        if (!result) return;
        const raw = result.getText();
        if (raw === lastScannedRef.current) return;
        lastScannedRef.current = raw;
        setTimeout(() => { lastScannedRef.current = ""; }, 2500);
        // Buscar en products via ref (sin closure stale)
        const found = productsRef.current.find(
          p => p.sku?.toLowerCase() === raw.toLowerCase()
        );
        if (found) {
          addToCartDirect(found);
        } else {
          toast.error(`SKU "${raw}" no encontrado`);
        }
      }
    ).catch(() => {});

    return () => { reader.reset(); };
  }, [scanning]);

  // Separamos addToCart para usarlo sin closure sobre products
  function addToCartDirect(product) {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product_id: product.id, name: product.name, sku: product.sku, price: product.price, qty: 1, unit: product.unit }];
    });
    setLastScanned({ name: product.name });
    setTimeout(() => setLastScanned(null), 2000);
  }

  function addBySku(sku) {
    if (!sku?.trim()) return;
    const found = products.find(p => p.sku?.toLowerCase() === sku.trim().toLowerCase());
    if (!found) { toast.error(`SKU "${sku}" no encontrado`); return; }
    addToCartDirect(found);
  }

  function addToCart(product) { addToCartDirect(product); }

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
      ).slice(0, 6)
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
      <style>{`
        @keyframes scan-sweep {
          0%   { top: 18%; }
          50%  { top: 72%; }
          100% { top: 18%; }
        }
      `}</style>

      {/* ── CÁMARA ESCÁNER ── */}
      {!scanning ? (
        <button onClick={() => setScanning(true)}
          style={{ width: "100%", padding: "20px", borderRadius: 16, background: "rgba(255,107,44,0.07)", border: "2px dashed rgba(255,107,44,0.4)", color: O, fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
          <ScanLine size={24} /> Activar cámara para escanear
        </button>
      ) : (
        <div style={{ marginBottom: 16, borderRadius: 16, overflow: "hidden", background: "#000", position: "relative" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: 260, objectFit: "cover", display: "block" }}
          />

          {/* Overlay */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "15%", left: "8%", right: "8%", bottom: "15%", border: "2px solid rgba(255,107,44,0.7)", borderRadius: 12 }} />
            <div style={{ position: "absolute", left: "8%", right: "8%", height: 3, background: O, borderRadius: 2, boxShadow: `0 0 10px ${O}`, animation: "scan-sweep 2s ease-in-out infinite" }} />
            {/* Esquinas */}
            {[["top","left"],["top","right"],["bottom","left"],["bottom","right"]].map(([v,h]) => (
              <div key={v+h} style={{
                position: "absolute",
                [v]: "calc(15% - 2px)", [h]: "calc(8% - 2px)",
                width: 22, height: 22,
                borderTop:    v === "top"    ? `3px solid ${O}` : "none",
                borderBottom: v === "bottom" ? `3px solid ${O}` : "none",
                borderLeft:   h === "left"   ? `3px solid ${O}` : "none",
                borderRight:  h === "right"  ? `3px solid ${O}` : "none",
              }} />
            ))}
          </div>

          {/* Feedback escaneo */}
          {lastScanned && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(34,197,94,0.93)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle size={18} color="#fff" />
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>✓ {lastScanned.name} agregado</p>
            </div>
          )}

          <div style={{ position: "absolute", top: 10, left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "0 10px" }}>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, background: "rgba(0,0,0,0.45)", padding: "4px 8px", borderRadius: 6 }}>
              Apuntá el código de barras
            </p>
            <button onClick={stopCamera}
              style={{ background: "rgba(0,0,0,0.55)", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
              <X size={13} /> Detener
            </button>
          </div>
        </div>
      )}

      {/* ── MANUAL SKU ── */}
      <form onSubmit={handleManualSku} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={manualSku}
          onChange={e => setManualSku(e.target.value)}
          placeholder="Ingresar SKU manualmente..."
          style={{ flex: 1, padding: "11px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none" }}
        />
        <button type="submit" style={{ padding: "11px 18px", borderRadius: 10, background: O, color: "#fff", fontWeight: 800, fontSize: 18, border: "none", cursor: "pointer" }}>+</button>
      </form>

      {/* ── BÚSQUEDA ── */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} />
        <input
          value={manualSearch}
          onChange={e => setManualSearch(e.target.value)}
          placeholder="Buscar producto por nombre..."
          style={{ width: "100%", paddingLeft: 32, padding: "10px 12px 10px 32px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {filteredProducts.length > 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
          {filteredProducts.map((p, i) => (
            <button key={p.id} onClick={() => { addToCart(p); setManualSearch(""); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 14px", background: "var(--surface)", border: "none", borderBottom: i < filteredProducts.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", textAlign: "left" }}>
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
        <div style={{ textAlign: "center", padding: "32px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, marginBottom: 14 }}>
          <ShoppingCart size={34} color="var(--text-faint)" style={{ opacity: 0.2, marginBottom: 8 }} />
          <p style={{ color: "var(--text-faint)", fontSize: 14 }}>Los productos escaneados aparecen aquí</p>
        </div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <ShoppingCart size={15} /> {cart.length} {cart.length === 1 ? "producto" : "productos"}
            </p>
            <button onClick={() => setCart([])} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 12, fontWeight: 600 }}>Limpiar</button>
          </div>

          {cart.map((item, i) => (
            <div key={item.product_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: i < cart.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                <p style={{ fontSize: 12, color: "var(--text-faint)" }}>{formatCurrency(item.price)} c/u</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <button onClick={() => changeQty(item.product_id, -1)}
                  style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Minus size={14} />
                </button>
                <span style={{ fontWeight: 700, color: "var(--text)", minWidth: 24, textAlign: "center", fontSize: 15 }}>{item.qty}</span>
                <button onClick={() => changeQty(item.product_id, 1)}
                  style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={14} />
                </button>
              </div>
              <p style={{ fontWeight: 800, color: O, fontSize: 14, minWidth: 68, textAlign: "right", flexShrink: 0 }}>{formatCurrency(item.price * item.qty)}</p>
              <button onClick={() => changeQty(item.product_id, -item.qty)}
                style={{ padding: 6, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", cursor: "pointer", display: "flex", flexShrink: 0 }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface2)" }}>
            <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>Total</p>
            <p style={{ fontWeight: 900, color: O, fontSize: 24 }}>{formatCurrency(total)}</p>
          </div>
        </div>
      )}

      {/* ── PAGO ── */}
      {cart.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 18 }}>
          <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14, marginBottom: 12 }}>Método de pago</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setPayMethod(id)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "12px 6px", borderRadius: 12, border: `2px solid ${payMethod === id ? O : "var(--border)"}`, background: payMethod === id ? "rgba(255,107,44,0.08)" : "var(--surface2)", cursor: "pointer", color: payMethod === id ? O : "var(--text-faint)", fontWeight: payMethod === id ? 700 : 400, fontSize: 12 }}>
                <Icon size={18} />{label}
              </button>
            ))}
          </div>

          {payMethod === "credit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14, padding: 12, background: "rgba(255,107,44,0.05)", border: "1px solid rgba(255,107,44,0.2)", borderRadius: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 4 }}>CLIENTE *</label>
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
            style={{ width: "100%", padding: 16, borderRadius: 12, background: O, color: "#fff", fontWeight: 800, fontSize: 16, border: "none", cursor: saleMut.isPending ? "not-allowed" : "pointer", opacity: saleMut.isPending ? 0.7 : 1 }}>
            {saleMut.isPending ? "Registrando..." : `Confirmar venta · ${formatCurrency(total)}`}
          </button>
        </div>
      )}
    </div>
  );
}
