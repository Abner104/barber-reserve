import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Package, X, AlertTriangle, ScanLine, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { toast } from "sonner";
import { useAuthStore } from "../../../store/authStore";
import { getSupplierByProfileId, getSupplierProducts, upsertProduct, deleteProduct } from "../services/supplierService";
import { uploadImage } from "../../../components/shared/ImageUpload";
import { formatCurrency } from "../../../lib/utils";

const O = "var(--brand, #FF6B2C)";

const EMPTY = { name: "", description: "", price: "", stock: "", category: "", image_url: "", unit: "unidad", is_available: true, sku: "" };

const STEPS = [
  { id: 1, label: "Identidad",  desc: "Nombre, SKU y categoría" },
  { id: 2, label: "Precio",     desc: "Precio y stock"          },
  { id: 3, label: "Foto",       desc: "Imagen del producto"     },
];

export default function SupplierProductsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [modal, setModal]               = useState(null); // null | "wizard" | product (edit)
  const [wizardStep, setWizardStep]     = useState(1);
  const [form, setForm]                 = useState(EMPTY);
  const [formErrors, setFormErrors]     = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [skuScanning, setSkuScanning]   = useState(false);

  const skuVideoRef  = useRef(null);
  const skuControls  = useRef(null);

  const { data: supplier } = useQuery({
    queryKey: ["supplier-profile", user?.id],
    queryFn:  () => getSupplierByProfileId(user.id),
    enabled:  !!user?.id,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["supplier-products", supplier?.id],
    queryFn:  () => getSupplierProducts(supplier.id),
    enabled:  !!supplier?.id,
  });

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier-products"] }); toast.success("Producto eliminado"); setDeleteConfirm(null); },
    onError: () => toast.error("Error al eliminar"),
  });

  // ── SKU Camera ──────────────────────────────────────────────
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
          const raw = result.getText();
          setForm(f => ({ ...f, sku: raw }));
          toast.success(`SKU capturado: ${raw}`);
          stopSkuCamera();
        }
      )
      .then(controls => { if (!alive) { try { controls.stop(); } catch {} return; } skuControls.current = controls; })
      .catch(() => {});
    return () => { alive = false; if (skuControls.current) { try { skuControls.current.stop(); } catch {} skuControls.current = null; } };
  }, [skuScanning, stopSkuCamera]);

  // ── Modal helpers ────────────────────────────────────────────
  function openWizard() {
    setForm({ ...EMPTY, supplier_id: supplier.id });
    setFormErrors({});
    setWizardStep(1);
    setModal("wizard");
  }

  function openEdit(p) {
    setForm({ ...p, price: String(p.price), stock: String(p.stock ?? ""), sku: p.sku ?? "" });
    setFormErrors({});
    setModal(p);
  }

  function closeModal() { stopSkuCamera(); setModal(null); setFormErrors({}); }

  async function handleImageUpload(file) {
    setUploading(true);
    try { const url = await uploadImage(file, "shop-images", "supplier-products"); setForm(f => ({ ...f, image_url: url })); }
    catch { toast.error("Error subiendo imagen"); }
    finally { setUploading(false); }
  }

  // ── Wizard navigation ────────────────────────────────────────
  function validateStep(step) {
    const errors = {};
    if (step === 1) {
      if (!form.name?.trim()) errors.name = "El nombre es obligatorio";
    }
    if (step === 2) {
      if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) errors.price = "Ingresá un precio válido";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function nextStep() { if (validateStep(wizardStep)) setWizardStep(s => s + 1); }
  function prevStep() { setWizardStep(s => s - 1); }

  async function handleSave() {
    if (!validateStep(wizardStep)) return;
    setSaving(true);
    try {
      await upsertProduct({
        ...form,
        supplier_id: supplier.id,
        price:  Number(form.price),
        stock:  form.stock !== "" ? Number(form.stock) : null,
      });
      qc.invalidateQueries({ queryKey: ["supplier-products"] });
      toast.success(modal === "wizard" ? "Producto creado" : "Producto actualizado");
      closeModal();
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  // Edit save (no wizard)
  async function handleEditSave() {
    const errors = {};
    if (!form.name?.trim()) errors.name = "El nombre es obligatorio";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) errors.price = "Precio inválido";
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    setSaving(true);
    try {
      await upsertProduct({ ...form, supplier_id: supplier.id, price: Number(form.price), stock: form.stock !== "" ? Number(form.stock) : null });
      qc.invalidateQueries({ queryKey: ["supplier-products"] });
      toast.success("Producto actualizado");
      closeModal();
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const grouped    = products.reduce((acc, p) => { const c = p.category || "Sin categoría"; if (!acc[c]) acc[c] = []; acc[c].push(p); return acc; }, {});

  const inp = { width: "100%", padding: "11px 12px", borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" };
  const inpErr = (key) => ({ ...inp, border: `1px solid ${formErrors[key] ? "#ef4444" : "var(--border)"}` });

  // ── Wizard step content ──────────────────────────────────────
  function StepIdentidad() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>NOMBRE DEL PRODUCTO *</label>
          <input autoFocus value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormErrors(fe => ({ ...fe, name: null })); }}
            placeholder="Ej: Pomada Matte Strong" style={inpErr("name")} />
          {formErrors.name && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{formErrors.name}</p>}
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>SKU / CÓDIGO DE BARRAS</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
              placeholder="Ej: 7791234567890 (opcional)" style={{ ...inp, flex: 1 }} />
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
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>CATEGORÍA</label>
          <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            placeholder="Ej: Pomadas, Shampoo, Afeitado" style={inp} list="cats" />
          <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>DESCRIPCIÓN</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Descripción breve..." rows={2}
            style={{ ...inp, resize: "none" }} />
        </div>
      </div>
    );
  }

  function StepPrecio() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>PRECIO DE VENTA *</label>
          <input type="number" autoFocus value={form.price} onChange={e => { setForm(f => ({ ...f, price: e.target.value })); setFormErrors(fe => ({ ...fe, price: null })); }}
            placeholder="0" style={inpErr("price")} />
          {formErrors.price && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{formErrors.price}</p>}
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>STOCK DISPONIBLE</label>
          <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
            placeholder="Dejar vacío = sin límite" style={inp} />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>UNIDAD</label>
          <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
            placeholder="unidad, caja, litro..." style={inp} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--surface2)", borderRadius: 10 }}>
          <input type="checkbox" id="avail" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} style={{ width: 18, height: 18 }} />
          <label htmlFor="avail" style={{ fontSize: 14, color: "var(--text)", cursor: "pointer", fontWeight: 500 }}>Producto disponible en catálogo</label>
        </div>
      </div>
    );
  }

  function StepFoto() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {form.image_url ? (
          <div style={{ position: "relative" }}>
            <img src={form.image_url} alt="preview" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 14 }} />
            <button onClick={() => setForm(f => ({ ...f, image_url: "" }))}
              style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: "#fff", fontSize: 12 }}>
              Quitar
            </button>
          </div>
        ) : (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, height: 180, borderRadius: 14, border: "2px dashed var(--border)", cursor: "pointer", color: "var(--text-faint)" }}>
            <Package size={36} style={{ opacity: 0.4 }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{uploading ? "Subiendo..." : "Tocar para agregar foto"}</span>
            <span style={{ fontSize: 12, opacity: 0.6 }}>JPG, PNG — opcional</span>
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
          </label>
        )}
        <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
          {form.image_url ? "Foto lista ✓" : "Podés saltear este paso si no tenés foto ahora"}
        </p>
      </div>
    );
  }

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

      {/* Loading */}
      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 200, borderRadius: 14, background: "var(--surface)" }} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && products.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📦</div>
          <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 16, marginBottom: 8 }}>Sin productos aún</p>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 20 }}>Empieza subiendo tu primer producto al catálogo.</p>
          <button onClick={openWizard} style={{ padding: "10px 20px", borderRadius: 10, background: O, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>
            Agregar producto
          </button>
        </div>
      )}

      {/* Grid */}
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <p style={{ fontWeight: 800, color: O, fontSize: 16 }}>{formatCurrency(p.price)}</p>
                    {p.stock != null && <p style={{ fontSize: 12, color: p.stock <= 5 ? "#f87171" : "var(--text-faint)" }}>Stock: {p.stock} {p.unit}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openEdit(p)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
                      <Pencil size={13} /> Editar
                    </button>
                    <button onClick={() => setDeleteConfirm(p)} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", cursor: "pointer" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── WIZARD NUEVO PRODUCTO ── */}
      {modal === "wizard" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={closeModal}>
          <div style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 520, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}>

            {/* Header wizard */}
            <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 18, color: "var(--text)" }}>Nuevo producto</p>
                  <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 2 }}>Paso {wizardStep} de {STEPS.length} — {STEPS[wizardStep-1].desc}</p>
                </div>
                <button onClick={closeModal} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--text-faint)", display: "flex" }}>
                  <X size={16} />
                </button>
              </div>

              {/* Progress bar */}
              <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                {STEPS.map(s => (
                  <div key={s.id} style={{ flex: 1, height: 4, borderRadius: 4, background: s.id <= wizardStep ? O : "var(--border)", transition: "background 0.3s" }} />
                ))}
              </div>
            </div>

            {/* Step content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
              {wizardStep === 1 && <StepIdentidad />}
              {wizardStep === 2 && <StepPrecio />}
              {wizardStep === 3 && <StepFoto />}
            </div>

            {/* Footer nav */}
            <div style={{ padding: 20, borderTop: "1px solid var(--border)", display: "flex", gap: 10, flexShrink: 0 }}>
              {wizardStep > 1 && (
                <button onClick={prevStep} style={{ flex: 1, padding: 13, borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-faint)", fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <ChevronLeft size={16} /> Atrás
                </button>
              )}
              {wizardStep < STEPS.length ? (
                <button onClick={nextStep} style={{ flex: 2, padding: 13, borderRadius: 12, background: O, color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
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

      {/* ── MODAL EDICIÓN (sin wizard) ── */}
      {modal && modal !== "wizard" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={closeModal}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ fontWeight: 800, fontSize: 18, color: "var(--text)" }}>Editar producto</p>
              <button onClick={closeModal} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--text-faint)", display: "flex" }}><X size={16} /></button>
            </div>

            {form.image_url ? (
              <div style={{ position: "relative", marginBottom: 14 }}>
                <img src={form.image_url} alt="preview" style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 12 }} />
                <button onClick={() => setForm(f => ({ ...f, image_url: "" }))} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#fff", fontSize: 12 }}>Quitar</button>
              </div>
            ) : (
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, height: 100, borderRadius: 12, border: "2px dashed var(--border)", cursor: "pointer", color: "var(--text-faint)", marginBottom: 14 }}>
                <Package size={24} />
                <span style={{ fontSize: 13 }}>{uploading ? "Subiendo..." : "Agregar foto"}</span>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
              </label>
            )}

            {[
              { key: "name",     label: "Nombre *",    placeholder: "Nombre del producto", type: "text"   },
              { key: "category", label: "Categoría",   placeholder: "Pomadas, Shampoo...", type: "text"   },
              { key: "price",    label: "Precio *",    placeholder: "0",                   type: "number" },
              { key: "stock",    label: "Stock",       placeholder: "Sin límite",          type: "number" },
              { key: "unit",     label: "Unidad",      placeholder: "unidad, caja...",     type: "text"   },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 5 }}>{label.toUpperCase()}</label>
                <input type={type} value={form[key] ?? ""} onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setFormErrors(fe => ({ ...fe, [key]: null })); }} placeholder={placeholder}
                  style={{ ...inp, border: `1px solid ${formErrors[key] ? "#ef4444" : "var(--border)"}` }} />
                {formErrors[key] && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 3 }}>{formErrors[key]}</p>}
              </div>
            ))}

            {/* SKU con cámara en edición */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 5 }}>SKU / CÓDIGO</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={form.sku ?? ""} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Ej: 7791234567890" style={{ ...inp, flex: 1 }} />
                <button type="button" onClick={() => setSkuScanning(s => !s)}
                  style={{ padding: "11px 12px", borderRadius: 10, background: skuScanning ? "rgba(239,68,68,0.08)" : "var(--surface2)", border: `1px solid ${skuScanning ? "rgba(239,68,68,0.3)" : "var(--border)"}`, color: skuScanning ? "#ef4444" : "var(--text-faint)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, flexShrink: 0 }}>
                  <ScanLine size={15} />{skuScanning ? "Detener" : "Escanear"}
                </button>
              </div>
              {skuScanning && (
                <div style={{ marginTop: 8, borderRadius: 10, overflow: "hidden", position: "relative", background: "#000" }}>
                  <video ref={skuVideoRef} autoPlay playsInline muted style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", inset: 0, border: `2px solid ${O}`, borderRadius: 10, pointerEvents: "none" }}>
                    <div style={{ position: "absolute", top: "50%", left: "8%", right: "8%", height: 2, background: O, opacity: 0.8, transform: "translateY(-50%)" }} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 5 }}>DESCRIPCIÓN</label>
              <textarea value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                style={{ ...inp, resize: "none" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <input type="checkbox" id="avail2" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} />
              <label htmlFor="avail2" style={{ fontSize: 14, color: "var(--text)", cursor: "pointer" }}>Disponible en catálogo</label>
            </div>

            <button onClick={handleEditSave} disabled={saving} style={{ width: "100%", padding: 14, borderRadius: 12, background: O, color: "#fff", fontWeight: 800, fontSize: 15, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      {/* ── ELIMINAR ── */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <AlertTriangle size={22} color="#f87171" />
              <p style={{ fontWeight: 800, fontSize: 17, color: "var(--text)" }}>Eliminar producto</p>
            </div>
            <p style={{ color: "var(--text-faint)", fontSize: 14, marginBottom: 22 }}>
              ¿Eliminar <strong style={{ color: "var(--text)" }}>{deleteConfirm.name}</strong>? No se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: 12, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-faint)", cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
              <button onClick={() => deleteMut.mutate(deleteConfirm.id)} disabled={deleteMut.isPending}
                style={{ flex: 1, padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", cursor: "pointer", fontWeight: 700 }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
