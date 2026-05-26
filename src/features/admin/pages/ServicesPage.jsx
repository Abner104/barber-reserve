import { formatCurrency } from "../../../lib/utils";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Power, X, Loader2, Clock, Trash2, AlertTriangle } from "lucide-react";
import ImageUpload from "../../../components/shared/ImageUpload";
import { getAdminServices, getAdminCategories, createService, updateService, toggleServiceAvailable, deleteService } from "../services/adminService";

const B = "var(--brand, #FF6B2C)";
const EMPTY_SVC = { name: "", description: "", duration_min: 30, price: 0, allows_local: true, allows_delivery: true, is_available: true, category_id: "", sort_order: 0, image_url: "" };

export default function ServicesPage() {
  const qc = useQueryClient();
  const [modal, setModal]           = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // service obj a eliminar

  const { data: services = [], isLoading } = useQuery({ queryKey: ["admin-services"], queryFn: getAdminServices });
  const { data: categories = [] } = useQuery({ queryKey: ["admin-categories"], queryFn: getAdminCategories });

  const grouped = services.reduce((acc, s) => {
    const cat = s.service_categories?.name ?? "Sin categoría";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const createMut = useMutation({
    mutationFn: createService,
    onSuccess: () => { qc.invalidateQueries(["admin-services"]); setModal(null); toast.success("Servicio creado"); },
    onError: () => toast.error("Error al crear el servicio"),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, updates }) => updateService(id, updates),
    onSuccess: () => { qc.invalidateQueries(["admin-services"]); setModal(null); toast.success("Servicio actualizado"); },
    onError: () => toast.error("Error al actualizar el servicio"),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, is_available }) => toggleServiceAvailable(id, is_available),
    onSuccess: (_, { is_available }) => { qc.invalidateQueries(["admin-services"]); toast.success(is_available ? "Servicio activado" : "Servicio desactivado"); },
    onError: () => toast.error("Error al cambiar el estado"),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteService(id),
    onSuccess: () => { qc.invalidateQueries(["admin-services"]); setDeleteConfirm(null); toast.success("Servicio eliminado"); },
    onError: () => { setDeleteConfirm(null); toast.error("No se puede eliminar: tiene reservas asociadas"); },
  });

  return (
    <div className="admin-page" style={{ maxWidth: "min(900px, 100%)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>Servicios</h1>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Catálogo de servicios de tu barbería</p>
        </div>
        <button
          onClick={() => setModal("create")}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: B, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        >
          <Plus size={16} /> Nuevo servicio
        </button>
      </div>

      {isLoading && <p style={{ color: "var(--text-faint)" }}>Cargando...</p>}

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 700, marginBottom: 10 }}>{cat}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, opacity: s.is_available ? 1 : 0.5 }}>
                {/* Miniatura del servicio */}
                {s.image_url ? (
                  <img src={s.image_url} alt={s.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 20 }}>✂️</span>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 14 }}>{s.name}</p>
                    {!s.is_available && <span style={{ fontSize: 11, color: "var(--text-faint)", background: "var(--surface2)", padding: "2px 8px", borderRadius: 20 }}>Inactivo</span>}
                    {s.allows_local && s.allows_delivery && <span style={{ fontSize: 11, color: B, background: "var(--brand-alpha)", padding: "2px 8px", borderRadius: 20 }}>Local y domicilio</span>}
                    {s.allows_local && !s.allows_delivery && <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--surface2)", padding: "2px 8px", borderRadius: 20 }}>Solo local</span>}
                    {!s.allows_local && s.allows_delivery && <span style={{ fontSize: 11, color: B, background: "var(--brand-alpha)", padding: "2px 8px", borderRadius: 20 }}>Solo domicilio</span>}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock size={11} /> {s.duration_min}min
                    </span>
                    <span style={{ fontSize: 12, color: B, fontWeight: 600 }}>{formatCurrency(s.price)}</span>
                    {s.description && <span style={{ fontSize: 12, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{s.description}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <IconBtn onClick={() => setModal(s)}><Pencil size={14} /></IconBtn>
                  <IconBtn onClick={() => toggleMut.mutate({ id: s.id, is_available: !s.is_available })} danger={s.is_available}>
                    <Power size={14} />
                  </IconBtn>
                  <IconBtn onClick={() => setDeleteConfirm(s)} danger>
                    <Trash2 size={14} />
                  </IconBtn>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!isLoading && services.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ color: "var(--text-faint)", marginBottom: 8 }}>No hay servicios aún.</p>
          <button onClick={() => setModal("create")} style={{ color: B, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Crear el primero</button>
        </div>
      )}

      {modal && (
        <ServiceModal
          service={modal === "create" ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSave={(data) => {
            if (modal === "create") createMut.mutate(data);
            else updateMut.mutate({ id: modal.id, updates: data });
          }}
          loading={createMut.isPending || updateMut.isPending}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 380, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <AlertTriangle size={24} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>¿Eliminar servicio?</h3>
            <p style={{ fontSize: 14, color: "var(--text-faint)", marginBottom: 6 }}>
              Estás por eliminar <strong style={{ color: "var(--text)" }}>{deleteConfirm.name}</strong>
            </p>
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 24 }}>Esta acción no se puede deshacer. Si el servicio tiene reservas asociadas no se podrá eliminar.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => deleteMut.mutate(deleteConfirm.id)} disabled={deleteMut.isPending}
                style={{ flex: 1, padding: "12px", borderRadius: 10, background: "#ef4444", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: deleteMut.isPending ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {deleteMut.isPending ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={15} />}
                {deleteMut.isPending ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceModal({ service, categories, onClose, onSave, loading }) {
  const [form, setForm] = useState(service ? {
    name: service.name, description: service.description ?? "", duration_min: service.duration_min,
    price: service.price, allows_local: service.allows_local ?? true, allows_delivery: service.allows_delivery ?? true,
    is_available: service.is_available, category_id: service.category_id ?? "", sort_order: service.sort_order,
    image_url: service.image_url ?? "",
  } : EMPTY_SVC);

  const inp = {
    background: "var(--input-bg, #1E1E1E)", border: "1px solid var(--border)", borderRadius: 10,
    padding: "10px 12px", color: "var(--text)", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none",
  };

  const [formErrors, setFormErrors] = useState({});

  function handleSave() {
    const e = {};
    if (!form.name.trim()) e.name = "El nombre es obligatorio";
    if (!form.price || Number(form.price) <= 0) e.price = "Ingresa un precio válido";
    if (Object.keys(e).length) { setFormErrors(e); return; }
    setFormErrors({});
    onSave({ ...form, price: Number(form.price), category_id: form.category_id || null, image_url: form.image_url || null });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{service ? "Editar servicio" : "Nuevo servicio"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nombre *">
            <input
              style={{ ...inp, borderColor: formErrors.name ? "#ef4444" : "var(--border)" }}
              value={form.name}
              onChange={e => { setForm({ ...form, name: e.target.value }); setFormErrors(p => ({ ...p, name: "" })); }}
              placeholder="Corte clásico"
            />
            {formErrors.name && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 5 }}>{formErrors.name}</p>}
          </Field>

          <Field label="Foto del servicio">
            <ImageUpload
              value={form.image_url || ""}
              onChange={url => setForm({ ...form, image_url: url })}
              folder="services"
              label="Subir foto del servicio"
              aspect="wide"
            />
            <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>Se muestra al cliente en el wizard de reservas</p>
          </Field>

          <Field label="Descripción"><textarea style={{ ...inp, resize: "none" }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe brevemente el servicio..." /></Field>
          <Field label="Categoría">
            <select style={{ ...inp, cursor: "pointer" }} value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Duración (min)"><input style={inp} type="number" min={5} value={form.duration_min} onChange={e => setForm({ ...form, duration_min: Number(e.target.value) })} /></Field>
            <Field label="Precio *">
              <input
                style={{ ...inp, borderColor: formErrors.price ? "#ef4444" : "var(--border)" }}
                type="number" min={0} value={form.price}
                onChange={e => { setForm({ ...form, price: e.target.value }); setFormErrors(p => ({ ...p, price: "" })); }}
                placeholder="25000"
              />
              {formErrors.price && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 5 }}>{formErrors.price}</p>}
            </Field>
          </div>
          <Field label="Disponibilidad">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "Solo local", icon: "🏪", local: true, delivery: false },
                { label: "Solo domicilio", icon: "🛵", local: false, delivery: true },
                { label: "Ambos", icon: "✓", local: true, delivery: true },
              ].map(opt => {
                const active = form.allows_local === opt.local && form.allows_delivery === opt.delivery;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setForm({ ...form, allows_local: opt.local, allows_delivery: opt.delivery })}
                    style={{
                      padding: "10px 6px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                      background: active ? "var(--brand-alpha)" : "var(--surface2)",
                      border: `1.5px solid ${active ? "var(--brand, #FF6B2C)" : "var(--border)"}`,
                      color: active ? "var(--brand, #FF6B2C)" : "var(--text-muted)",
                      fontWeight: active ? 700 : 500, fontSize: 12,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading} style={{ flex: 1, padding: "12px", borderRadius: 10, background: "var(--brand)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1 }}>
            {loading && <Loader2 size={16} />}
            {service ? "Guardar" : "Crear servicio"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

function IconBtn({ onClick, children, danger }) {
  return (
    <button onClick={onClick} style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: danger ? "#ef4444" : "var(--text-muted)" }}>
      {children}
    </button>
  );
}
