import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, Package, X, AlertTriangle,
  TrendingDown, History, Search, ShoppingBag,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { formatCurrency } from "../../../lib/utils";
import { uploadImage } from "../../../components/shared/ImageUpload";
import {
  getInventory, upsertInventoryProduct, deleteInventoryProduct,
  adjustStock, getInventoryMovements,
} from "../services/inventoryService";

const O = "var(--brand, #FF6B2C)";

const EMPTY = {
  name: "", description: "", category: "", price_cost: "", price_sell: "",
  stock: "", stock_min: "3", unit: "unidad", image_url: "", is_active: true,
};

const SHIMMER = `
  @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
  .inv-shimmer { background: linear-gradient(90deg, var(--surface2) 25%, var(--card-border,#2A2A2A) 50%, var(--surface2) 75%); background-size: 1200px 100%; animation: shimmer 1.4s infinite linear; border-radius: 12px; }
`;

export default function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch]               = useState("");
  const [catFilter, setCatFilter]         = useState("");
  const [productModal, setProductModal]   = useState(null); // null | "new" | product
  const [form, setForm]                   = useState(EMPTY);
  const [formErrors, setFormErrors]       = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [historyModal, setHistoryModal]   = useState(null);
  const [adjModal, setAdjModal]           = useState(null);
  const [adjDelta, setAdjDelta]           = useState("");
  const [adjReason, setAdjReason]         = useState("");
  const [uploading, setUploading]         = useState(false);
  const [saving, setSaving]               = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn:  getInventory,
    refetchInterval: 60000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["inventory-movements", historyModal?.id],
    queryFn:  () => getInventoryMovements(historyModal.id),
    enabled:  !!historyModal?.id,
  });

  const adjMut = useMutation({
    mutationFn: ({ id, delta, reason }) => adjustStock(id, delta, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Stock ajustado");
      setAdjModal(null); setAdjDelta(""); setAdjReason("");
    },
    onError: () => toast.error("Error al ajustar stock"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteInventoryProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Producto eliminado");
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Error al eliminar"),
  });

  function openNew()   { setForm({ ...EMPTY }); setFormErrors({}); setProductModal("new"); }
  function openEdit(p) {
    setForm({ ...p, price_cost: String(p.price_cost ?? ""), price_sell: String(p.price_sell), stock: String(p.stock ?? ""), stock_min: String(p.stock_min ?? 3) });
    setFormErrors({});
    setProductModal(p);
  }

  async function handleImageUpload(file) {
    setUploading(true);
    try { const url = await uploadImage(file, "shop-images", "inventory"); setForm(f => ({ ...f, image_url: url })); }
    catch { toast.error("Error subiendo imagen"); }
    finally { setUploading(false); }
  }

  async function handleSave() {
    const errors = {};
    if (!form.name?.trim()) errors.name = "Nombre obligatorio";
    if (!form.price_sell || isNaN(Number(form.price_sell)) || Number(form.price_sell) <= 0) errors.price_sell = "Precio de venta requerido";
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      await upsertInventoryProduct({
        ...form,
        price_cost: form.price_cost !== "" ? Number(form.price_cost) : null,
        price_sell: Number(form.price_sell),
        stock:      form.stock !== ""      ? Number(form.stock)      : 0,
        stock_min:  form.stock_min !== ""  ? Number(form.stock_min)  : 3,
      });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(productModal === "new" ? "Producto creado" : "Producto actualizado");
      setProductModal(null);
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = useMemo(() => products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.category ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat    = !catFilter || p.category === catFilter;
    return matchSearch && matchCat;
  }), [products, search, catFilter]);

  const lowStock = products.filter(p => p.stock != null && p.stock <= (p.stock_min ?? 3) && p.is_active);

  const totalValue = products.reduce((s, p) => s + (p.price_sell * (p.stock ?? 0)), 0);
  const totalCost  = products.reduce((s, p) => s + ((p.price_cost ?? 0) * (p.stock ?? 0)), 0);

  const grouped = filtered.reduce((acc, p) => {
    const cat = p.category || "Sin categoría";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="admin-page" style={{ maxWidth: "min(1100px, 100%)" }}>
      <style>{SHIMMER}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>Inventario</h1>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>{products.length} productos · {products.reduce((s, p) => s + (p.stock ?? 0), 0)} unidades totales</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/admin/caja"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", textDecoration: "none", fontWeight: 600, fontSize: 13 }}>
            <ShoppingBag size={14} /> Ir a Caja para vender
          </Link>
          <button onClick={openNew} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: O, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
            <Plus size={16} /> Nuevo producto
          </button>
        </div>
      </div>

      {/* Alerta stock bajo */}
      {lowStock.length > 0 && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, marginBottom: 20 }}>
          <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 2 }}>Stock bajo en {lowStock.length} producto(s)</p>
            <p style={{ fontSize: 12, color: "var(--text-faint)" }}>{lowStock.map(p => p.name).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Valor en stock",   value: formatCurrency(totalValue),           sub: "precio venta" },
          { label: "Costo del stock",  value: formatCurrency(totalCost),            sub: "precio costo" },
          { label: "Margen estimado",  value: formatCurrency(totalValue - totalCost), sub: "ganancia potencial", accent: true },
          { label: "Productos activos",value: String(products.filter(p => p.is_active).length), sub: "en catálogo" },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} style={{ background: accent ? "rgba(255,107,44,0.05)" : "var(--card-bg)", border: `1px solid ${accent ? "rgba(255,107,44,0.2)" : "var(--card-border)"}`, borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: accent ? O : "var(--text)", marginBottom: 2 }}>{value}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-faint)" }}>{label}</p>
            <p style={{ fontSize: 11, color: "var(--text-faint)", opacity: 0.6 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..."
            style={{ width: "100%", paddingLeft: 32, padding: "8px 12px 8px 32px", borderRadius: 9, background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 9, background: "var(--card-bg)", border: "1px solid var(--card-border)", color: catFilter ? "var(--text)" : "var(--text-faint)", fontSize: 13, cursor: "pointer" }}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid productos */}
      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {[1,2,3,4].map(i => <div key={i} className="inv-shimmer" style={{ height: 200 }} />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 20px", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📦</div>
          <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 16, marginBottom: 8 }}>
            {products.length === 0 ? "Sin productos aún" : "Sin resultados"}
          </p>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 20 }}>
            {products.length === 0 ? "Agrega los productos que vendes en el local." : "Intenta con otro filtro."}
          </p>
          {products.length === 0 && (
            <button onClick={openNew} style={{ padding: "10px 20px", borderRadius: 10, background: O, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>
              Agregar producto
            </button>
          )}
        </div>
      )}

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 700, marginBottom: 14, paddingLeft: 4 }}>{cat}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {items.map(p => {
              const isLow = p.stock != null && p.stock <= (p.stock_min ?? 3);
              return (
                <div key={p.id} style={{ background: "var(--card-bg)", border: `1px solid ${isLow ? "rgba(239,68,68,0.3)" : "var(--card-border)"}`, borderRadius: 14, overflow: "hidden" }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} style={{ width: "100%", height: 130, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: 130, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Package size={32} color="var(--text-faint)" style={{ opacity: 0.3 }} />
                    </div>
                  )}
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14, lineHeight: 1.3 }}>{p.name}</p>
                      <span style={{ padding: "2px 7px", borderRadius: 20, fontSize: 10, fontWeight: 700, flexShrink: 0, background: isLow ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: isLow ? "#ef4444" : "#22c55e" }}>
                        {p.stock ?? 0} {p.unit}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <p style={{ fontWeight: 800, color: O, fontSize: 15 }}>{formatCurrency(p.price_sell)}</p>
                      {p.price_cost && <p style={{ fontSize: 11, color: "var(--text-faint)" }}>costo {formatCurrency(p.price_cost)}</p>}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                      <button onClick={() => { setAdjModal(p); setAdjDelta(""); setAdjReason(""); }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px 4px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>
                        <TrendingDown size={12} /> Ajustar stock
                      </button>
                      <button onClick={() => setHistoryModal(p)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px 4px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>
                        <History size={12} /> Historial
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(p)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>
                        <Pencil size={12} /> Editar
                      </button>
                      <button onClick={() => setDeleteConfirm(p)} style={{ padding: "7px 10px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", cursor: "pointer" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ── MODAL CREAR/EDITAR ── */}
      {productModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setProductModal(null)}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <p style={{ fontWeight: 800, fontSize: 18, color: "var(--text)" }}>{productModal === "new" ? "Nuevo producto" : "Editar producto"}</p>
              <button onClick={() => setProductModal(null)} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--text-faint)", display: "flex" }}><X size={16} /></button>
            </div>

            {/* Imagen */}
            <div style={{ marginBottom: 16 }}>
              {form.image_url ? (
                <div style={{ position: "relative" }}>
                  <img src={form.image_url} alt="preview" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 12 }} />
                  <button onClick={() => setForm(f => ({ ...f, image_url: "" }))} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#fff", fontSize: 12 }}>Quitar</button>
                </div>
              ) : (
                <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, height: 100, borderRadius: 12, border: "2px dashed var(--border)", cursor: "pointer", color: "var(--text-faint)" }}>
                  <Package size={24} />
                  <span style={{ fontSize: 13 }}>{uploading ? "Subiendo..." : "Agregar foto"}</span>
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                </label>
              )}
            </div>

            {[
              { key: "name",       label: "Nombre *",            placeholder: "Ej: Pomada Matte",          type: "text"   },
              { key: "category",   label: "Categoría",           placeholder: "Pomadas, Shampoo...",       type: "text"   },
              { key: "price_sell", label: "Precio de venta *",   placeholder: "0",                         type: "number" },
              { key: "price_cost", label: "Precio de costo",     placeholder: "0 (opcional)",              type: "number" },
              { key: "stock",      label: "Stock inicial",       placeholder: "0",                         type: "number" },
              { key: "stock_min",  label: "Alerta stock mínimo", placeholder: "3",                         type: "number" },
              { key: "unit",       label: "Unidad",              placeholder: "unidad, caja, ml...",       type: "text"   },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>{label.toUpperCase()}</label>
                <input type={type} value={form[key] ?? ""} onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setFormErrors(fe => ({ ...fe, [key]: null })); }} placeholder={placeholder}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "var(--surface2)", border: `1px solid ${formErrors[key] ? "#ef4444" : "var(--border)"}`, color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                {formErrors[key] && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{formErrors[key]}</p>}
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>DESCRIPCIÓN</label>
              <textarea value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción del producto..." rows={2}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="is_active" style={{ fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}>Producto activo</label>
            </div>

            <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: 14, borderRadius: 12, background: O, color: "#fff", fontWeight: 800, fontSize: 15, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Guardando..." : productModal === "new" ? "Crear producto" : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL AJUSTE STOCK ── */}
      {adjModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setAdjModal(null)}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 380 }}
            onClick={e => e.stopPropagation()}>
            <p style={{ fontWeight: 800, fontSize: 18, color: "var(--text)", marginBottom: 4 }}>Ajustar stock</p>
            <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 20 }}>{adjModal.name} · actual: <strong style={{ color: "var(--text)" }}>{adjModal.stock ?? 0} {adjModal.unit}</strong></p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>CANTIDAD (+ entrada / − salida)</label>
              <input type="number" value={adjDelta} onChange={e => setAdjDelta(e.target.value)} placeholder="Ej: 10 o -3"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>MOTIVO</label>
              <input type="text" value={adjReason} onChange={e => setAdjReason(e.target.value)} placeholder="Ej: Compra al proveedor, merma, corrección..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setAdjModal(null)} style={{ flex: 1, padding: 12, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-faint)", cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
              <button
                onClick={() => {
                  const d = Number(adjDelta);
                  if (!adjDelta || isNaN(d)) { toast.error("Ingresa una cantidad"); return; }
                  adjMut.mutate({ id: adjModal.id, delta: d, reason: adjReason });
                }}
                disabled={adjMut.isPending}
                style={{ flex: 1, padding: 12, borderRadius: 10, background: O, color: "#fff", fontWeight: 800, border: "none", cursor: adjMut.isPending ? "not-allowed" : "pointer", opacity: adjMut.isPending ? 0.7 : 1 }}>
                Ajustar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL HISTORIAL ── */}
      {historyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setHistoryModal(null)}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 440, maxHeight: "80vh", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ fontWeight: 800, fontSize: 17, color: "var(--text)" }}>Historial — {historyModal.name}</p>
              <button onClick={() => setHistoryModal(null)} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--text-faint)", display: "flex" }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {history.length === 0 && <p style={{ color: "var(--text-faint)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Sin movimientos registrados.</p>}
              {history.map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface2)", borderRadius: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: m.delta > 0 ? "#22c55e" : "#ef4444", minWidth: 40 }}>
                    {m.delta > 0 ? "+" : ""}{m.delta}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 1 }}>{m.reason || "Sin motivo"}</p>
                    <p style={{ fontSize: 11, color: "var(--text-faint)" }}>{new Date(m.created_at).toLocaleString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ELIMINAR ── */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 380 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <AlertTriangle size={22} color="#ef4444" />
              <p style={{ fontWeight: 800, fontSize: 17, color: "var(--text)" }}>Eliminar producto</p>
            </div>
            <p style={{ color: "var(--text-faint)", fontSize: 14, marginBottom: 22 }}>¿Eliminar <strong style={{ color: "var(--text)" }}>{deleteConfirm.name}</strong>? Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: 12, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-faint)", cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
              <button onClick={() => deleteMut.mutate(deleteConfirm.id)} disabled={deleteMut.isPending}
                style={{ flex: 1, padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontWeight: 700, cursor: "pointer" }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
