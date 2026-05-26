import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Package, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../../../store/authStore";
import { getSupplierByProfileId, getSupplierProducts, upsertProduct, deleteProduct } from "../services/supplierService";
import { uploadImage } from "../../../components/shared/ImageUpload";
import { formatCurrency } from "../../../lib/utils";

const O = "#FF6B2C";

const EMPTY = { name: "", description: "", price: "", stock: "", category: "", image_url: "", unit: "unidad", is_available: true };

export default function SupplierProductsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [modal, setModal]               = useState(null); // null | "new" | product
  const [form, setForm]                 = useState(EMPTY);
  const [formErrors, setFormErrors]     = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [saving, setSaving]             = useState(false);

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-products"] });
      toast.success("Producto eliminado");
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Error al eliminar"),
  });

  function openNew() { setForm({ ...EMPTY, supplier_id: supplier.id }); setFormErrors({}); setModal("new"); }
  function openEdit(p) { setForm({ ...p, price: String(p.price), stock: String(p.stock ?? "") }); setFormErrors({}); setModal(p); }
  function closeModal() { setModal(null); setFormErrors({}); }

  async function handleImageUpload(file) {
    setUploading(true);
    try {
      const url = await uploadImage(file, "shop-images", "supplier-products");
      setForm(f => ({ ...f, image_url: url }));
    } catch { toast.error("Error subiendo imagen"); }
    finally { setUploading(false); }
  }

  async function handleSave() {
    const errors = {};
    if (!form.name?.trim()) errors.name = "El nombre es obligatorio";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) errors.price = "Ingresa un precio válido";
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      await upsertProduct({
        ...form,
        supplier_id: supplier.id,
        price:  Number(form.price),
        stock:  form.stock !== "" ? Number(form.stock) : null,
      });
      qc.invalidateQueries({ queryKey: ["supplier-products"] });
      toast.success(modal === "new" ? "Producto creado" : "Producto actualizado");
      closeModal();
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const grouped = products.reduce((acc, p) => {
    const cat = p.category || "Sin categoría";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="sup-page" style={{ maxWidth: "min(1100px, 100%)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>Productos</h1>
          <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>{products.length} productos en tu catálogo</p>
        </div>
        <button onClick={openNew} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: O, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 200, borderRadius: 14, background: "#111" }} />)}
        </div>
      )}

      {!isLoading && products.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 20px", background: "#111", border: "1px solid #1E1E1E", borderRadius: 16 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📦</div>
          <p style={{ fontWeight: 700, color: "#fff", fontSize: 16, marginBottom: 8 }}>Sin productos aún</p>
          <p style={{ color: "#555", fontSize: 13, marginBottom: 20 }}>Empieza subiendo tu primer producto al catálogo.</p>
          <button onClick={openNew} style={{ padding: "10px 20px", borderRadius: 10, background: O, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>
            Agregar producto
          </button>
        </div>
      )}

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#555", fontWeight: 700, marginBottom: 14 }}>{cat}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {items.map(p => (
              <div key={p.id} style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 14, overflow: "hidden" }}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} style={{ width: "100%", height: 140, objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: 140, background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Package size={36} color="#333" />
                  </div>
                )}
                <div style={{ padding: "14px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <p style={{ fontWeight: 700, color: "#fff", fontSize: 14, lineHeight: 1.3 }}>{p.name}</p>
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, flexShrink: 0, background: p.is_available ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)", color: p.is_available ? "#4ade80" : "#f87171" }}>
                      {p.is_available ? "Activo" : "Pausado"}
                    </span>
                  </div>
                  {p.description && <p style={{ color: "#555", fontSize: 12, marginBottom: 8, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <p style={{ fontWeight: 800, color: O, fontSize: 16 }}>{formatCurrency(p.price)}</p>
                    {p.stock != null && <p style={{ fontSize: 12, color: p.stock <= 5 ? "#f87171" : "#555" }}>Stock: {p.stock} {p.unit}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openEdit(p)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 8, background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#aaa", cursor: "pointer", fontSize: 13 }}>
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

      {/* Modal crear/editar */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={closeModal}>
          <div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <p style={{ fontWeight: 800, fontSize: 18, color: "#fff" }}>{modal === "new" ? "Nuevo producto" : "Editar producto"}</p>
              <button onClick={closeModal} style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 8, padding: 6, cursor: "pointer", color: "#aaa", display: "flex" }}>
                <X size={16} />
              </button>
            </div>

            {/* Imagen */}
            <div style={{ marginBottom: 16 }}>
              {form.image_url ? (
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <img src={form.image_url} alt="preview" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 12 }} />
                  <button onClick={() => setForm(f => ({ ...f, image_url: "" }))} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#fff", fontSize: 12 }}>
                    Quitar
                  </button>
                </div>
              ) : (
                <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, height: 120, borderRadius: 12, border: "2px dashed #2A2A2A", cursor: "pointer", color: "#555" }}>
                  <Package size={28} />
                  <span style={{ fontSize: 13 }}>{uploading ? "Subiendo..." : "Agregar foto del producto"}</span>
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                </label>
              )}
            </div>

            {[
              { key: "name",        label: "Nombre *",     placeholder: "Ej: Pomada Matte Strong", type: "text" },
              { key: "category",    label: "Categoría",    placeholder: "Ej: Pomadas, Shampoo, Afeitado", type: "text" },
              { key: "price",       label: "Precio *",     placeholder: "0", type: "number" },
              { key: "stock",       label: "Stock",        placeholder: "Dejar vacío = sin límite", type: "number" },
              { key: "unit",        label: "Unidad",       placeholder: "unidad, caja, litro...", type: "text" },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, color: "#777", fontWeight: 600, marginBottom: 6 }}>{label.toUpperCase()}</label>
                <input
                  type={type}
                  value={form[key] ?? ""}
                  onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setFormErrors(fe => ({ ...fe, [key]: null })); }}
                  placeholder={placeholder}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#0A0A0A", border: `1px solid ${formErrors[key] ? "#ef4444" : "#2A2A2A"}`, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
                {formErrors[key] && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{formErrors[key]}</p>}
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "#777", fontWeight: 600, marginBottom: 6 }}>DESCRIPCIÓN</label>
              <textarea
                value={form.description ?? ""}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descripción del producto..."
                rows={3}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#fff", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <input type="checkbox" id="available" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} />
              <label htmlFor="available" style={{ fontSize: 14, color: "#aaa", cursor: "pointer" }}>Producto disponible</label>
            </div>

            <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: 14, borderRadius: 12, background: O, color: "#fff", fontWeight: 800, fontSize: 15, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Guardando..." : modal === "new" ? "Crear producto" : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: "#111", border: "1px solid #2A2A2A", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <AlertTriangle size={22} color="#f87171" />
              <p style={{ fontWeight: 800, fontSize: 17, color: "#fff" }}>Eliminar producto</p>
            </div>
            <p style={{ color: "#777", fontSize: 14, marginBottom: 24 }}>
              ¿Eliminar <strong style={{ color: "#fff" }}>{deleteConfirm.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: 12, borderRadius: 10, background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#777", cursor: "pointer", fontWeight: 600 }}>
                Cancelar
              </button>
              <button onClick={() => deleteMut.mutate(deleteConfirm.id)} disabled={deleteMut.isPending} style={{ flex: 1, padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", cursor: "pointer", fontWeight: 700 }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
