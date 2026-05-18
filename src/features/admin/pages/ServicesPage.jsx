import { formatCurrency } from "../../../lib/utils";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Power, X, Loader2, Clock, Trash2 } from "lucide-react";
import { getAdminServices, getAdminCategories, createService, updateService, toggleServiceAvailable, deleteService } from "../services/adminService";

const B = "var(--brand, #FF6B2C)";
const EMPTY_SVC = { name: "", description: "", duration_min: 30, price: 0, price_delivery: "", allows_delivery: true, is_available: true, category_id: "", sort_order: 0 };

export default function ServicesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);

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
    onSuccess: () => { qc.invalidateQueries(["admin-services"]); toast.success("Servicio eliminado"); },
    onError: (e) => toast.error("No se puede eliminar: tiene reservas asociadas"),
  });

  return (
    <div className="admin-page" style={{ maxWidth: 900 }}>
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 14 }}>{s.name}</p>
                    {!s.is_available && <span style={{ fontSize: 11, color: "var(--text-faint)", background: "var(--surface2)", padding: "2px 8px", borderRadius: 20 }}>Inactivo</span>}
                    {s.allows_delivery && <span style={{ fontSize: 11, color: B, background: "var(--brand-alpha)", padding: "2px 8px", borderRadius: 20 }}>Domicilio</span>}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock size={11} /> {s.duration_min}min
                    </span>
                    <span style={{ fontSize: 12, color: B, fontWeight: 600 }}>{formatCurrency(s.price)}</span>
                    {s.price_delivery && <span style={{ fontSize: 12, color: "var(--text-faint)" }}>Dom: {formatCurrency(s.price_delivery)}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <IconBtn onClick={() => setModal(s)}><Pencil size={14} /></IconBtn>
                  <IconBtn onClick={() => toggleMut.mutate({ id: s.id, is_available: !s.is_available })} danger={s.is_available}>
                    <Power size={14} />
                  </IconBtn>
                  <IconBtn
                    onClick={() => {
                      if (window.confirm(`¿Eliminar "${s.name}"? Esta acción no se puede deshacer.`)) {
                        deleteMut.mutate(s.id);
                      }
                    }}
                    danger
                  >
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
    </div>
  );
}

function ServiceModal({ service, categories, onClose, onSave, loading }) {
  const [form, setForm] = useState(service ? {
    name: service.name, description: service.description ?? "", duration_min: service.duration_min,
    price: service.price, price_delivery: service.price_delivery ?? "", allows_delivery: service.allows_delivery,
    is_available: service.is_available, category_id: service.category_id ?? "", sort_order: service.sort_order,
  } : EMPTY_SVC);

  const inp = {
    background: "var(--input-bg, #1E1E1E)", border: "1px solid var(--border)", borderRadius: 10,
    padding: "10px 12px", color: "var(--text)", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none",
  };

  function handleSave() {
    if (!form.name.trim() || !form.price) return;
    onSave({ ...form, price: Number(form.price), price_delivery: form.price_delivery ? Number(form.price_delivery) : null, category_id: form.category_id || null });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{service ? "Editar servicio" : "Nuevo servicio"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nombre *"><input style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Corte clásico" /></Field>
          <Field label="Descripción"><textarea style={{ ...inp, resize: "none" }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Categoría">
            <select style={{ ...inp, cursor: "pointer" }} value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Duración (min)"><input style={inp} type="number" min={5} value={form.duration_min} onChange={e => setForm({ ...form, duration_min: Number(e.target.value) })} /></Field>
            <Field label="Precio"><input style={inp} type="number" min={0} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="25000" /></Field>
            <Field label="Precio domicilio"><input style={inp} type="number" min={0} value={form.price_delivery} onChange={e => setForm({ ...form, price_delivery: e.target.value })} placeholder="35000" /></Field>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, allows_delivery: !form.allows_delivery })}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
              borderRadius: 10, cursor: "pointer", textAlign: "left",
              background: form.allows_delivery ? "var(--brand-alpha)" : "var(--surface2)",
              border: `1px solid ${form.allows_delivery ? "var(--brand, #FF6B2C)" : "var(--border)"}`,
            }}
          >
            <div style={{
              width: 40, height: 22, borderRadius: 11, position: "relative", flexShrink: 0,
              background: form.allows_delivery ? "var(--brand, #FF6B2C)" : "var(--border)",
              transition: "background 0.2s",
            }}>
              <div style={{
                position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff",
                left: form.allows_delivery ? 20 : 2, transition: "left 0.2s",
              }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                {form.allows_delivery ? "✓ Disponible a domicilio" : "No disponible a domicilio"}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-faint)" }}>
                {form.allows_delivery ? "Los clientes pueden pedirlo a su dirección" : "Solo en el local"}
              </p>
            </div>
          </button>
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
