import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Package, X, AlertTriangle, ScanLine, ChevronRight, ChevronLeft, Check, PackagePlus, History, TrendingDown } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { toast } from "sonner";
import { getSupplierProducts, upsertProduct, deleteProduct, adjustProductStock, registerProductPurchase, getProductMovements } from "../services/supplierService";
import { useActiveSupplier } from "../../../hooks/useActiveSupplier";
import { uploadImage } from "../../../components/shared/ImageUpload";
import { formatCurrency } from "../../../lib/utils";

const O = "var(--brand, #FF6B2C)";
const EMPTY = { name: "", description: "", price: "", price_cost: "", category: "", image_url: "", images: [], unit: "unidad", is_available: true, sku: "" };
const STEPS = [
  { id: 1, label: "Identidad", desc: "Nombre, SKU y categoría" },
  { id: 2, label: "Precio",    desc: "Precio y stock" },
  { id: 3, label: "Foto",      desc: "Imagen del producto" },
];

export default function SupplierProductsPage() {
  const qc = useQueryClient();
  const [modal, setModal]               = useState(null);
  const [wizardStep, setWizardStep]     = useState(1);
  const [form, setForm]                 = useState(EMPTY);
  const [formErrors, setFormErrors]     = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [skuScanning, setSkuScanning]   = useState(false);
  const [adjModal, setAdjModal]         = useState(null); // merma / ajuste
  const [adjDelta, setAdjDelta]         = useState("");
  const [adjReason, setAdjReason]       = useState("");
  const [purchaseModal, setPurchaseModal] = useState(null); // reponer stock (con costo)
  const [purchaseQty, setPurchaseQty]     = useState("");
  const [purchaseCost, setPurchaseCost]   = useState("");
  const [purchaseReason, setPurchaseReason] = useState("");
  const [historyModal, setHistoryModal] = useState(null);

  const skuVideoRef = useRef(null);
  const skuControls = useRef(null);

  const { data: supplier } = useActiveSupplier();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["supplier-products", supplier?.id],
    queryFn:  () => getSupplierProducts(supplier.id),
    enabled:  !!supplier?.id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["supplier-product-movements", historyModal?.id],
    queryFn:  () => getProductMovements(historyModal.id),
    enabled:  !!historyModal?.id,
  });

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier-products"] }); toast.success("Producto eliminado"); setDeleteConfirm(null); },
    onError: () => toast.error("Error al eliminar"),
  });

  const adjMut = useMutation({
    mutationFn: ({ productId, delta, reason }) => adjustProductStock({ productId, supplierId: supplier.id, delta, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-products"] });
      toast.success("Stock actualizado");
      setAdjModal(null); setAdjDelta(""); setAdjReason("");
    },
    onError: (e) => toast.error("Error: " + (e?.message ?? "no se pudo actualizar el stock")),
  });

  const purchaseMut = useMutation({
    mutationFn: ({ productId, qty, unitCost, reason }) => registerProductPurchase({ productId, supplierId: supplier.id, qty, unitCost, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-products"] });
      toast.success("Stock repuesto ✅");
      setPurchaseModal(null); setPurchaseQty(""); setPurchaseCost(""); setPurchaseReason("");
    },
    onError: (e) => toast.error("Error: " + (e?.message ?? "no se pudo registrar la reposición")),
  });

  const stopSkuCamera = useCallback(() => {
    if (skuControls.current) { try { skuControls.current.stop(); } catch {} skuControls.current = null; }
    setSkuScanning(false);
  }, []);

  useEffect(() => () => stopSkuCamera(), [stopSkuCamera]);

  useEffect(() => {
    if (!skuScanning || !skuVideoRef.current) return;
    let alive = true;
    new BrowserMultiFormatReader()
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } } },
        skuVideoRef.current,
        (result) => {
          if (!result || !alive) return;
          setForm(f => ({ ...f, sku: result.getText() }));
          toast.success(`SKU capturado: ${result.getText()}`);
          stopSkuCamera();
        }
      )
      .then(c => { if (!alive) { try { c.stop(); } catch {} return; } skuControls.current = c; })
      .catch(() => {});
    return () => { alive = false; if (skuControls.current) { try { skuControls.current.stop(); } catch {} skuControls.current = null; } };
  }, [skuScanning, stopSkuCamera]);

  function openWizard() {
    if (!supplier?.id) { toast.error("Cargando tu perfil de proveedor, intenta de nuevo en un momento"); return; }
    setForm({ ...EMPTY, supplier_id: supplier.id });
    setFormErrors({});
    setWizardStep(1);
    setModal("wizard");
  }

  function openEdit(p) {
    const { stock, ...rest } = p; // el stock no se edita a mano — solo vía "Reponer stock"
    setForm({ ...rest, price: String(p.price), price_cost: String(p.price_cost ?? ""), sku: p.sku ?? "", images: p.images ?? [] });
    setFormErrors({});
    setModal(p);
  }

  function closeModal() { stopSkuCamera(); setModal(null); setFormErrors({}); }

  async function handleImageUpload(file) {
    setUploading(true);
    try {
      const url = await uploadImage(file, "shop-images", "supplier-products");
      setForm(f => ({ ...f, image_url: f.image_url || url, images: [...(f.images ?? []), url] }));
    } catch { toast.error("Error subiendo imagen"); }
    finally { setUploading(false); }
  }

  function removeImage(idx) {
    setForm(f => {
      const next = f.images.filter((_, i) => i !== idx);
      return { ...f, images: next, image_url: next[0] ?? "" };
    });
  }

  function validateStep(step) {
    const errors = {};
    if (step === 1 && !form.name?.trim()) errors.name = "El nombre es obligatorio";
    if (step === 2 && (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)) errors.price = "Ingresá un precio válido";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateStep(wizardStep)) return;
    setSaving(true);
    try {
      // Producto nuevo arranca en 0 — el stock se carga después con "Reponer stock"
      await upsertProduct({ ...form, supplier_id: supplier.id, price: Number(form.price), price_cost: form.price_cost !== "" ? Number(form.price_cost) : null, stock: 0 });
      qc.invalidateQueries({ queryKey: ["supplier-products"] });
      toast.success("Producto creado");
      closeModal();
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  async function handleEditSave() {
    const errors = {};
    if (!form.name?.trim()) errors.name = "El nombre es obligatorio";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) errors.price = "Precio inválido";
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    setSaving(true);
    try {
      // stock no viaja acá — no se edita a mano, solo vía "Reponer stock"
      await upsertProduct({ ...form, supplier_id: supplier.id, price: Number(form.price), price_cost: form.price_cost !== "" ? Number(form.price_cost) : null });
      qc.invalidateQueries({ queryKey: ["supplier-products"] });
      toast.success("Producto actualizado");
      closeModal();
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const grouped    = products.reduce((acc, p) => { const c = p.category || "Sin categoría"; if (!acc[c]) acc[c] = []; acc[c].push(p); return acc; }, {});
  const inp = { width: "100%", padding: "11px 12px", borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" };

  // JSX reutilizable para la galería de fotos (no es un componente — es JSX inline)
  const galeriaFotosJSX = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {(form.images ?? []).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {(form.images ?? []).map((url, i) => (
            <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "1" }}>
              <img src={url} alt={`foto ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {i === 0 && <span style={{ position: "absolute", top: 4, left: 4, background: O, color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 6 }}>PRINCIPAL</span>}
              <button onClick={() => removeImage(i)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: 6, width: 22, height: 22, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, height: (form.images ?? []).length > 0 ? 80 : 160, borderRadius: 12, border: "2px dashed var(--border)", cursor: uploading ? "not-allowed" : "pointer", color: "var(--text-faint)", opacity: uploading ? 0.6 : 1 }}>
        <Package size={28} style={{ opacity: 0.4 }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{uploading ? "Subiendo..." : (form.images ?? []).length > 0 ? "Agregar más fotos" : "Tocar para agregar foto"}</span>
        {(form.images ?? []).length === 0 && <span style={{ fontSize: 11, opacity: 0.6 }}>JPG, PNG — opcional, podés poner varias</span>}
        <input type="file" accept="image/*" multiple style={{ display: "none" }} disabled={uploading}
          onChange={async e => { for (const f of Array.from(e.target.files ?? [])) await handleImageUpload(f); }} />
      </label>
      {(form.images ?? []).length > 0 && (
        <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 12 }}>
          {(form.images ?? []).length} foto{(form.images ?? []).length > 1 ? "s" : ""} · La primera es la principal
        </p>
      )}
    </div>
  );

  // JSX del scanner SKU (reutilizado en wizard y edición)
  const skuScannerJSX = (
    <>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={form.sku}
          onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
          placeholder="Ej: 7791234567890 (opcional)"
          style={{ ...inp, flex: 1 }}
        />
        <button type="button" onClick={() => setSkuScanning(s => !s)}
          style={{ padding: "11px 12px", borderRadius: 10, background: skuScanning ? "rgba(239,68,68,0.08)" : "var(--surface2)", border: `1px solid ${skuScanning ? "rgba(239,68,68,0.3)" : "var(--border)"}`, color: skuScanning ? "#ef4444" : "var(--text-faint)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
          <ScanLine size={15} />{skuScanning ? "Detener" : "Escanear"}
        </button>
      </div>
      {skuScanning && (
        <div style={{ marginTop: 10, borderRadius: 12, overflow: "hidden", position: "relative", background: "#000" }}>
          <video ref={skuVideoRef} autoPlay playsInline muted style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "15%", left: "8%", right: "8%", bottom: "15%", border: `2px solid ${O}`, borderRadius: 10 }} />
            <style>{`@keyframes sku-scan { 0%{top:18%} 50%{top:72%} 100%{top:18%} }`}</style>
            <div style={{ position: "absolute", left: "8%", right: "8%", height: 2, background: O, borderRadius: 2, boxShadow: `0 0 8px ${O}`, animation: "sku-scan 2s ease-in-out infinite" }} />
          </div>
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-faint)", padding: "6px 0 4px", background: "var(--surface)" }}>Apuntá el código — se captura automático</p>
        </div>
      )}
    </>
  );

  return (
    <div className="sup-page" style={{ maxWidth: "min(1100px, 100%)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>Productos</h1>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>{products.length} productos en tu catálogo</p>
        </div>
        <button onClick={openWizard} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: O, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 200, borderRadius: 14, background: "var(--surface)" }} />)}
        </div>
      )}

      {!isLoading && products.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📦</div>
          <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 16, marginBottom: 8 }}>Sin productos aún</p>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 20 }}>Empieza subiendo tu primer producto al catálogo.</p>
          <button onClick={openWizard} style={{ padding: "10px 20px", borderRadius: 10, background: O, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>Agregar producto</button>
        </div>
      )}

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 700, marginBottom: 14 }}>{cat}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {items.map(p => (
              <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                {p.image_url
                  ? <img src={p.image_url} alt={p.name} style={{ width: "100%", height: 140, objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: 140, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Package size={36} color="var(--text-faint)" style={{ opacity: 0.3 }} /></div>
                }
                <div style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <div>
                      <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{p.name}</p>
                      {p.sku && <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 2 }}>SKU: {p.sku}</p>}
                    </div>
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, flexShrink: 0, background: p.is_available ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)", color: p.is_available ? "#4ade80" : "#f87171" }}>
                      {p.is_available ? "Activo" : "Pausado"}
                    </span>
                  </div>
                  {p.description && <p style={{ color: "var(--text-faint)", fontSize: 12, marginBottom: 8, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div>
                      <p style={{ fontWeight: 800, color: O, fontSize: 16 }}>{formatCurrency(p.price)}</p>
                      {p.price_cost > 0 && <p style={{ fontSize: 11, color: "var(--text-faint)" }}>costo {formatCurrency(p.price_cost)}</p>}
                    </div>
                    {p.price_cost > 0 && (() => {
                      const margin = Math.round(((p.price - p.price_cost) / p.price) * 100);
                      return (
                        <span style={{ fontSize: 11, fontWeight: 700, color: margin >= 30 ? "#22c55e" : margin >= 10 ? "#f59e0b" : "#ef4444" }}>
                          {margin}% margen
                        </span>
                      );
                    })()}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    {p.stock != null && <p style={{ fontSize: 12, color: p.stock <= 5 ? "#f87171" : "var(--text-faint)" }}>Stock: {p.stock} {p.unit}</p>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                    <button onClick={() => { setPurchaseModal(p); setPurchaseQty(""); setPurchaseCost(String(p.price_cost ?? "")); setPurchaseReason(""); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px 4px", borderRadius: 8, background: "var(--brand-alpha, rgba(255,107,44,0.1))", border: `1px solid ${O}`, color: O, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                      <PackagePlus size={12} /> Reponer stock
                    </button>
                    <button onClick={() => { setAdjModal(p); setAdjDelta(""); setAdjReason(""); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px 4px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>
                      <TrendingDown size={12} /> Merma/Ajuste
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                    <button onClick={() => setHistoryModal(p)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px 4px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>
                      <History size={12} /> Historial
                    </button>
                    <button onClick={() => openEdit(p)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>
                      <Pencil size={12} /> Editar
                    </button>
                  </div>
                  <button onClick={() => setDeleteConfirm(p)} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12 }}>
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── WIZARD NUEVO PRODUCTO ── */}
      {modal === "wizard" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={closeModal}>
          <div style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 520, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 18, color: "var(--text)" }}>Nuevo producto</p>
                  <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 2 }}>Paso {wizardStep} de {STEPS.length} — {STEPS[wizardStep-1].desc}</p>
                </div>
                <button onClick={closeModal} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--text-faint)", display: "flex" }}><X size={16} /></button>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                {STEPS.map(s => <div key={s.id} style={{ flex: 1, height: 4, borderRadius: 4, background: s.id <= wizardStep ? O : "var(--border)", transition: "background 0.3s" }} />)}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 8px" }}>
              {/* Step 1 — Identidad */}
              {wizardStep === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>NOMBRE DEL PRODUCTO *</label>
                    <input
                      autoFocus
                      value={form.name}
                      onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormErrors(fe => ({ ...fe, name: null })); }}
                      placeholder="Ej: Pomada Matte Strong"
                      style={{ ...inp, border: `1px solid ${formErrors.name ? "#ef4444" : "var(--border)"}` }}
                    />
                    {formErrors.name && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{formErrors.name}</p>}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>SKU / CÓDIGO DE BARRAS</label>
                    {skuScannerJSX}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>CATEGORÍA</label>
                    <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ej: Pomadas, Shampoo, Afeitado" style={inp} list="cats-wiz" />
                    <datalist id="cats-wiz">{categories.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>DESCRIPCIÓN</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción breve..." rows={2} style={{ ...inp, resize: "none" }} />
                  </div>
                </div>
              )}

              {/* Step 2 — Precio */}
              {wizardStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>PRECIO DE VENTA *</label>
                    <input type="number" autoFocus value={form.price} onChange={e => { setForm(f => ({ ...f, price: e.target.value })); setFormErrors(fe => ({ ...fe, price: null })); }} placeholder="0" style={{ ...inp, border: `1px solid ${formErrors.price ? "#ef4444" : "var(--border)"}` }} />
                    {formErrors.price && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{formErrors.price}</p>}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>PRECIO DE COSTO</label>
                    <input type="number" value={form.price_cost} onChange={e => setForm(f => ({ ...f, price_cost: e.target.value }))} placeholder="0 (opcional)" style={inp} />
                    <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>Lo que te cuesta producir/conseguir — se usa para calcular tu margen.</p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>UNIDAD</label>
                    <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="unidad, caja, litro..." style={inp} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--surface2)", borderRadius: 10 }}>
                    <input type="checkbox" id="avail-wiz" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} style={{ width: 18, height: 18 }} />
                    <label htmlFor="avail-wiz" style={{ fontSize: 14, color: "var(--text)", cursor: "pointer", fontWeight: 500 }}>Producto disponible en catálogo</label>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-faint)" }}>El stock arranca en 0 — cargalo con "Reponer stock" desde la card una vez creado.</p>
                </div>
              )}

              {/* Step 3 — Foto */}
              {wizardStep === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 4 }}>
                  {galeriaFotosJSX}
                  {(form.images ?? []).length === 0 && <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>Podés saltear este paso si no tenés foto ahora</p>}
                </div>
              )}
            </div>

            <div style={{ padding: 20, borderTop: "1px solid var(--border)", display: "flex", gap: 10, flexShrink: 0 }}>
              {wizardStep > 1 && (
                <button onClick={() => setWizardStep(s => s - 1)} style={{ flex: 1, padding: 13, borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-faint)", fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <ChevronLeft size={16} /> Atrás
                </button>
              )}
              {wizardStep < STEPS.length ? (
                <button onClick={() => { if (validateStep(wizardStep)) setWizardStep(s => s + 1); }} style={{ flex: 2, padding: 13, borderRadius: 12, background: O, color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  Siguiente <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 13, borderRadius: 12, background: O, color: "#fff", border: "none", fontWeight: 800, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {saving ? "Guardando..." : <><Check size={18} /> Crear producto</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDICIÓN ── */}
      {modal && modal !== "wizard" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={closeModal}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ fontWeight: 800, fontSize: 18, color: "var(--text)" }}>Editar producto</p>
              <button onClick={closeModal} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--text-faint)", display: "flex" }}><X size={16} /></button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 8 }}>FOTOS DEL PRODUCTO</label>
              {galeriaFotosJSX}
            </div>

            {[
              { key: "name",     label: "Nombre *",  placeholder: "Nombre del producto", type: "text"   },
              { key: "category", label: "Categoría", placeholder: "Pomadas, Shampoo...", type: "text"   },
              { key: "price",      label: "Precio de venta *", placeholder: "0",             type: "number" },
              { key: "price_cost", label: "Precio de costo",   placeholder: "0 (opcional)",  type: "number" },
              { key: "unit",       label: "Unidad",            placeholder: "unidad, caja...", type: "text"   },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 5 }}>{label.toUpperCase()}</label>
                <input type={type} value={form[key] ?? ""} onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setFormErrors(fe => ({ ...fe, [key]: null })); }} placeholder={placeholder}
                  style={{ ...inp, border: `1px solid ${formErrors[key] ? "#ef4444" : "var(--border)"}` }} />
                {formErrors[key] && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 3 }}>{formErrors[key]}</p>}
              </div>
            ))}

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 5 }}>SKU / CÓDIGO</label>
              {skuScannerJSX}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 5 }}>DESCRIPCIÓN</label>
              <textarea value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inp, resize: "none" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <input type="checkbox" id="avail-edit" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} />
              <label htmlFor="avail-edit" style={{ fontSize: 14, color: "var(--text)", cursor: "pointer" }}>Disponible en catálogo</label>
            </div>

            <button onClick={handleEditSave} disabled={saving} style={{ width: "100%", padding: 14, borderRadius: 12, background: O, color: "#fff", fontWeight: 800, fontSize: 15, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      {/* ── REPONER STOCK (compra, con costo) ── */}
      {purchaseModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setPurchaseModal(null)}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <p style={{ fontWeight: 800, fontSize: 18, color: "var(--text)", marginBottom: 4 }}>Reponer stock</p>
            <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 20 }}>{purchaseModal.name} · actual: <strong style={{ color: "var(--text)" }}>{purchaseModal.stock ?? 0} {purchaseModal.unit}</strong></p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>CANTIDAD</label>
              <input type="number" value={purchaseQty} onChange={e => setPurchaseQty(e.target.value)} placeholder="Ej: 50" style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>COSTO UNITARIO DE ESTA REPOSICIÓN</label>
              <input type="number" value={purchaseCost} onChange={e => setPurchaseCost(e.target.value)} placeholder="0 (opcional)" style={inp} />
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>Si lo completás, actualiza el costo de referencia del producto.</p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>NOTA (OPCIONAL)</label>
              <input type="text" value={purchaseReason} onChange={e => setPurchaseReason(e.target.value)} placeholder="Ej: Nueva producción" style={inp} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setPurchaseModal(null)} style={{ flex: 1, padding: 12, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-faint)", cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
              <button
                onClick={() => {
                  const q = Number(purchaseQty);
                  if (!purchaseQty || isNaN(q) || q <= 0) { toast.error("Ingresa una cantidad válida"); return; }
                  purchaseMut.mutate({ productId: purchaseModal.id, qty: q, unitCost: purchaseCost, reason: purchaseReason });
                }}
                disabled={purchaseMut.isPending}
                style={{ flex: 1, padding: 12, borderRadius: 10, background: O, color: "#fff", fontWeight: 800, border: "none", cursor: purchaseMut.isPending ? "not-allowed" : "pointer", opacity: purchaseMut.isPending ? 0.7 : 1 }}>
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MERMA / AJUSTE ── */}
      {adjModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setAdjModal(null)}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <p style={{ fontWeight: 800, fontSize: 18, color: "var(--text)", marginBottom: 4 }}>Merma / Ajuste de stock</p>
            <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 20 }}>{adjModal.name} · actual: <strong style={{ color: "var(--text)" }}>{adjModal.stock ?? 0} {adjModal.unit}</strong></p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>CANTIDAD (+ entrada / − salida)</label>
              <input type="number" value={adjDelta} onChange={e => setAdjDelta(e.target.value)} placeholder="Ej: -3 (pérdida) o 5 (corrección)" style={inp} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>MOTIVO *</label>
              <input type="text" value={adjReason} onChange={e => setAdjReason(e.target.value)} placeholder="Ej: Pérdida, rotura, corrección de conteo..." style={inp} />
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>Obligatorio — queda registrado en el historial.</p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setAdjModal(null)} style={{ flex: 1, padding: 12, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-faint)", cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
              <button
                onClick={() => {
                  const d = Number(adjDelta);
                  if (!adjDelta || isNaN(d)) { toast.error("Ingresa una cantidad"); return; }
                  if (!adjReason.trim()) { toast.error("El motivo es obligatorio"); return; }
                  adjMut.mutate({ productId: adjModal.id, delta: d, reason: adjReason });
                }}
                disabled={adjMut.isPending}
                style={{ flex: 1, padding: 12, borderRadius: 10, background: O, color: "#fff", fontWeight: 800, border: "none", cursor: adjMut.isPending ? "not-allowed" : "pointer", opacity: adjMut.isPending ? 0.7 : 1 }}>
                Ajustar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {historyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setHistoryModal(null)}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420, maxHeight: "80vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ fontWeight: 800, fontSize: 17, color: "var(--text)" }}>Historial — {historyModal.name}</p>
              <button onClick={() => setHistoryModal(null)} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--text-faint)", display: "flex" }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {history.length === 0 && <p style={{ color: "var(--text-faint)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Sin movimientos registrados.</p>}
              {history.map(m => {
                const typeLabel = { purchase: "Reposición", adjustment: "Ajuste" }[m.type] ?? "Ajuste";
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface2)", borderRadius: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: m.delta > 0 ? "#22c55e" : "#ef4444", minWidth: 40 }}>
                      {m.delta > 0 ? "+" : ""}{m.delta}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-faint)" }}>{typeLabel}</span>
                        {m.unit_cost != null && <span style={{ fontSize: 10, color: "var(--text-faint)" }}>· costo {formatCurrency(m.unit_cost)}</span>}
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 1 }}>{m.reason || "Sin motivo"}</p>
                      <p style={{ fontSize: 11, color: "var(--text-faint)" }}>
                        {new Date(m.created_at).toLocaleString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {m.performed_by_name && ` · ${m.performed_by_name}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── ELIMINAR ── */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <AlertTriangle size={22} color="#f87171" />
              <p style={{ fontWeight: 800, fontSize: 17, color: "var(--text)" }}>Eliminar producto</p>
            </div>
            <p style={{ color: "var(--text-faint)", fontSize: 14, marginBottom: 22 }}>
              ¿Eliminar <strong style={{ color: "var(--text)" }}>{deleteConfirm.name}</strong>? No se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: 12, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-faint)", cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
              <button onClick={() => deleteMut.mutate(deleteConfirm.id)} disabled={deleteMut.isPending} style={{ flex: 1, padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", cursor: "pointer", fontWeight: 700 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
