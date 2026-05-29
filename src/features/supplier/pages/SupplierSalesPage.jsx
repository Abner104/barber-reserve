import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ScanLine, Plus, Minus, Trash2, X, ShoppingCart,
  CreditCard, Banknote, Clock, CheckCircle, Search, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../../../store/authStore";
import { getSupplierByProfileId, getSupplierProducts } from "../services/supplierService";
import { supabase } from "../../../lib/supabase";
import { formatCurrency } from "../../../lib/utils";

const O = "var(--brand, #FF6B2C)";

const PAYMENT_METHODS = [
  { id: "cash",     label: "Efectivo",    icon: Banknote   },
  { id: "transfer", label: "Transferencia", icon: CreditCard },
  { id: "credit",   label: "A crédito",   icon: Clock      },
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
  // Descontar stock
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
  const [scanInput, setScanInput]     = useState("");
  const [skuSearch, setSkuSearch]     = useState("");
  const [scanning, setScanning]       = useState(false);
  const [payMethod, setPayMethod]     = useState("cash");
  const [creditDays, setCreditDays]   = useState("30");
  const [clientName, setClientName]   = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [note, setNote]               = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [done, setDone]               = useState(false);
  const [manualSearch, setManualSearch] = useState("");

  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const scanIntervalRef = useRef(null);
  const scanInputRef = useRef(null);

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

  // ── Cámara + BarcodeDetector ──
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setScanning(true);

      if ("BarcodeDetector" in window) {
        const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a", "upc_e", "code_39"] });
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              handleSku(barcodes[0].rawValue);
            }
          } catch {}
        }, 600);
      }
    } catch {
      toast.error("No se pudo acceder a la cámara");
    }
  }, [products]);

  const stopCamera = useCallback(() => {
    clearInterval(scanIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  function handleSku(sku) {
    if (!sku?.trim()) return;
    const found = products.find(p => p.sku?.toLowerCase() === sku.trim().toLowerCase());
    if (!found) {
      toast.error(`SKU "${sku}" no encontrado`);
      setScanInput("");
      return;
    }
    addToCart(found);
    setScanInput("");
    stopCamera();
  }

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        product_id: product.id,
        name:       product.name,
        sku:        product.sku,
        price:      product.price,
        qty:        1,
        unit:       product.unit,
      }];
    });
    toast.success(`${product.name} agregado`);
  }

  function changeQty(productId, delta) {
    setCart(prev => prev
      .map(i => i.product_id === productId ? { ...i, qty: i.qty + delta } : i)
      .filter(i => i.qty > 0)
    );
  }

  function removeItem(productId) {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  }

  function handleScanSubmit(e) {
    e.preventDefault();
    handleSku(scanInput);
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const filteredProducts = manualSearch
    ? products.filter(p =>
        p.name.toLowerCase().includes(manualSearch.toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(manualSearch.toLowerCase())
      )
    : [];

  async function handleConfirm() {
    if (cart.length === 0) return;
    if (!supplier?.id) return;
    await saleMut.mutateAsync({
      supplierId:    supplier.id,
      items:         cart,
      paymentMethod: payMethod,
      creditDays:    payMethod === "credit" ? Number(creditDays) : null,
      clientName,
      clientPhone,
      note,
    });
  }

  function resetSale() {
    setCart([]); setPayMethod("cash"); setCreditDays("30");
    setClientName(""); setClientPhone(""); setNote("");
    setDone(false); setShowCheckout(false);
  }

  if (done) {
    return (
      <div className="sup-page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
        <CheckCircle size={64} color="#22c55e" style={{ marginBottom: 20 }} />
        <p style={{ fontWeight: 800, fontSize: 22, color: "var(--text)", marginBottom: 8 }}>Venta registrada</p>
        <p style={{ color: "var(--text-faint)", fontSize: 14, marginBottom: 28 }}>
          {payMethod === "credit" ? `Crédito a ${creditDays} días para ${clientName || "cliente"}` : "Pago recibido"}
        </p>
        <button onClick={resetSale} style={{ padding: "12px 28px", borderRadius: 12, background: O, color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}>
          Nueva venta
        </button>
      </div>
    );
  }

  return (
    <div className="sup-page" style={{ maxWidth: "min(700px, 100%)" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)" }}>Registrar venta</h1>
        <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Escaneá o buscá un producto para agregarlo</p>
      </div>

      {/* ── Scanner / búsqueda ── */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button
            onClick={scanning ? stopCamera : startCamera}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, background: scanning ? "rgba(239,68,68,0.08)" : `rgba(255,107,44,0.08)`, border: `1px solid ${scanning ? "rgba(239,68,68,0.3)" : "rgba(255,107,44,0.3)"}`, color: scanning ? "#ef4444" : O, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            <ScanLine size={16} />
            {scanning ? "Detener cámara" : "Escanear código"}
          </button>
        </div>

        {scanning && (
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, border: "2px solid", borderColor: O, borderRadius: 12, pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: "50%", left: "10%", right: "10%", height: 2, background: O, opacity: 0.7, transform: "translateY(-50%)" }} />
            </div>
            {"BarcodeDetector" in window
              ? <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-faint)", padding: "8px 0" }}>Apuntá el código de barras</p>
              : <p style={{ textAlign: "center", fontSize: 12, color: "#f87171", padding: "8px 0" }}>Tu navegador no soporta detección automática — ingresá el SKU abajo</p>
            }
          </div>
        )}

        {/* Ingreso manual de SKU */}
        <form onSubmit={handleScanSubmit} style={{ display: "flex", gap: 8 }}>
          <input
            ref={scanInputRef}
            value={scanInput}
            onChange={e => setScanInput(e.target.value)}
            placeholder="Ingresá o escaneá el SKU manualmente..."
            style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none" }}
          />
          <button type="submit" style={{ padding: "10px 16px", borderRadius: 10, background: O, color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
            Agregar
          </button>
        </form>

        {/* Búsqueda por nombre */}
        <div style={{ marginTop: 12, position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} />
          <input
            value={manualSearch}
            onChange={e => setManualSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
            style={{ width: "100%", paddingLeft: 32, padding: "9px 12px 9px 32px", borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {filteredProducts.length > 0 && (
          <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", maxHeight: 220, overflowY: "auto" }}>
            {filteredProducts.map(p => (
              <button key={p.id} onClick={() => { addToCart(p); setManualSearch(""); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", background: "var(--surface2)", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left" }}>
                <div>
                  <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 13 }}>{p.name}</p>
                  {p.sku && <p style={{ fontSize: 11, color: "var(--text-faint)" }}>SKU: {p.sku}</p>}
                </div>
                <p style={{ fontWeight: 700, color: O, fontSize: 14 }}>{formatCurrency(p.price)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Carrito ── */}
      {cart.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingCart size={16} /> Carrito ({cart.length} {cart.length === 1 ? "producto" : "productos"})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cart.map(item => (
              <div key={item.product_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 14 }}>{item.name}</p>
                  {item.sku && <p style={{ fontSize: 11, color: "var(--text-faint)" }}>SKU: {item.sku}</p>}
                  <p style={{ fontSize: 12, color: "var(--text-faint)" }}>{formatCurrency(item.price)} c/u</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => changeQty(item.product_id, -1)} style={{ width: 28, height: 28, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Minus size={12} />
                  </button>
                  <span style={{ fontWeight: 700, color: "var(--text)", minWidth: 24, textAlign: "center", fontSize: 14 }}>{item.qty}</span>
                  <button onClick={() => changeQty(item.product_id, 1)} style={{ width: 28, height: 28, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Plus size={12} />
                  </button>
                </div>
                <p style={{ fontWeight: 800, color: O, fontSize: 14, minWidth: 70, textAlign: "right" }}>{formatCurrency(item.price * item.qty)}</p>
                <button onClick={() => removeItem(item.product_id)} style={{ padding: 6, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", cursor: "pointer", display: "flex" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 14, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>Total</p>
            <p style={{ fontWeight: 900, color: O, fontSize: 20 }}>{formatCurrency(total)}</p>
          </div>
        </div>
      )}

      {/* ── Checkout ── */}
      {cart.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
          <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 15, marginBottom: 14 }}>Método de pago</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 18 }}>
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setPayMethod(id)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 8px", borderRadius: 12, border: `2px solid ${payMethod === id ? O : "var(--border)"}`, background: payMethod === id ? `rgba(255,107,44,0.08)` : "var(--surface2)", cursor: "pointer", color: payMethod === id ? O : "var(--text-faint)", fontWeight: payMethod === id ? 700 : 400, fontSize: 13 }}>
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>

          {payMethod === "credit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14, padding: 14, background: "rgba(255,107,44,0.05)", border: "1px solid rgba(255,107,44,0.2)", borderRadius: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: O }}>DATOS DEL CRÉDITO</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 4 }}>CLIENTE / LOCAL</label>
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
                <label style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 4 }}>PLAZO (DÍAS)</label>
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

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 4 }}>NOTA</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ej: entrega a domicilio..."
              style={{ width: "100%", padding: "9px 12px", borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>

          <button onClick={handleConfirm} disabled={saleMut.isPending}
            style={{ width: "100%", padding: 14, borderRadius: 12, background: O, color: "#fff", fontWeight: 800, fontSize: 15, border: "none", cursor: saleMut.isPending ? "not-allowed" : "pointer", opacity: saleMut.isPending ? 0.7 : 1 }}>
            {saleMut.isPending ? "Registrando..." : `Confirmar venta · ${formatCurrency(total)}`}
          </button>
        </div>
      )}

      {cart.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16 }}>
          <ShoppingCart size={40} color="var(--text-faint)" style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ color: "var(--text-faint)", fontSize: 14 }}>Escaneá o buscá productos para armar la venta</p>
        </div>
      )}
    </div>
  );
}
