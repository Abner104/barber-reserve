import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Package, AlertTriangle, ExternalLink, Power } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";

const O = "#FF6B2C";

async function getSuppliers() {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*, profiles(full_name, email:id)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function createSupplierWithUser({ email, password, fullName, supplierName, description, whatsapp }) {
  // 1. Crear usuario en Auth
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr) throw authErr;

  const userId = authData.user.id;

  // 2. Crear/actualizar profile con rol supplier
  const { error: profileErr } = await supabase
    .from("profiles")
    .upsert({ id: userId, full_name: fullName, role: "supplier" });
  if (profileErr) throw profileErr;

  // 3. Crear registro en suppliers
  const { data: supplier, error: supplierErr } = await supabase
    .from("suppliers")
    .insert({ profile_id: userId, name: supplierName, description, whatsapp, is_active: true })
    .select()
    .single();
  if (supplierErr) throw supplierErr;

  return supplier;
}

async function toggleSupplierActive(id, is_active) {
  const { error } = await supabase.from("suppliers").update({ is_active }).eq("id", id);
  if (error) throw error;
}

const EMPTY_FORM = { email: "", password: "", fullName: "", supplierName: "", description: "", whatsapp: "" };

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving]         = useState(false);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["sa-suppliers"],
    queryFn:  getSuppliers,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) => toggleSupplierActive(id, is_active),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sa-suppliers"] }); toast.success("Estado actualizado"); },
    onError:   () => toast.error("Error al actualizar"),
  });

  function openModal() { setForm(EMPTY_FORM); setFormErrors({}); setModal(true); }
  function closeModal() { setModal(false); setFormErrors({}); }

  async function handleCreate() {
    const errors = {};
    if (!form.email.trim())        errors.email        = "Email requerido";
    if (!form.password.trim() || form.password.length < 6) errors.password = "Mínimo 6 caracteres";
    if (!form.fullName.trim())     errors.fullName     = "Nombre requerido";
    if (!form.supplierName.trim()) errors.supplierName = "Nombre del negocio requerido";
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      await createSupplierWithUser(form);
      qc.invalidateQueries({ queryKey: ["sa-suppliers"] });
      toast.success(`Proveedor ${form.supplierName} creado. Ya puede iniciar sesión.`);
      closeModal();
    } catch (e) {
      toast.error(e?.message ?? "Error al crear el proveedor");
    } finally {
      setSaving(false);
    }
  }

  const FIELDS = [
    { key: "supplierName", label: "Nombre del negocio *", placeholder: "Ej: Distribuidora JP Barber Supply", type: "text" },
    { key: "fullName",     label: "Nombre del dueño *",   placeholder: "Juan Pérez", type: "text" },
    { key: "whatsapp",     label: "WhatsApp",              placeholder: "+56 9 1234 5678", type: "tel" },
    { key: "email",        label: "Email de acceso *",     placeholder: "proveedor@email.com", type: "email" },
    { key: "password",     label: "Contraseña inicial *",  placeholder: "mínimo 6 caracteres", type: "password" },
  ];

  return (
    <div className="sa-page" style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>Proveedores</h1>
          <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>{suppliers.length} proveedor(es) registrado(s)</p>
        </div>
        <button onClick={openModal} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: O, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          <Plus size={16} /> Nuevo proveedor
        </button>
      </div>

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2].map(i => <div key={i} style={{ height: 80, borderRadius: 14, background: "#111" }} />)}
        </div>
      )}

      {!isLoading && suppliers.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 20px", background: "#111", border: "1px solid #1E1E1E", borderRadius: 16 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📦</div>
          <p style={{ fontWeight: 700, color: "#fff", fontSize: 16, marginBottom: 8 }}>Sin proveedores</p>
          <p style={{ color: "#555", fontSize: 13, marginBottom: 20 }}>Crea el primer proveedor para que aparezca en la landing y tenga acceso a su panel.</p>
          <button onClick={openModal} style={{ padding: "10px 20px", borderRadius: 10, background: O, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>
            Crear proveedor
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {suppliers.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", background: "#111", border: `1px solid ${s.is_active ? "#1E1E1E" : "rgba(239,68,68,0.2)"}`, borderRadius: 14, borderLeft: `4px solid ${s.is_active ? O : "#ef4444"}` }}>
            {s.logo_url ? (
              <img src={s.logo_url} alt={s.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,107,44,0.1)", border: "1px solid rgba(255,107,44,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Package size={20} color={O} />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, color: "#fff", fontSize: 15, marginBottom: 2 }}>{s.name}</p>
              <p style={{ color: "#555", fontSize: 12 }}>
                {s.whatsapp && <span style={{ marginRight: 12 }}>📱 {s.whatsapp}</span>}
                {s.description && <span>{s.description.slice(0, 60)}{s.description.length > 60 ? "..." : ""}</span>}
              </p>
            </div>

            <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.is_active ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)", color: s.is_active ? "#4ade80" : "#f87171", flexShrink: 0 }}>
              {s.is_active ? "Activo" : "Inactivo"}
            </span>

            <a href="/supplier" target="_blank" rel="noopener noreferrer"
              title="Ver panel del proveedor"
              style={{ padding: "8px", borderRadius: 8, background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#777", display: "flex", textDecoration: "none" }}>
              <ExternalLink size={14} />
            </a>

            <button
              onClick={() => toggleMut.mutate({ id: s.id, is_active: !s.is_active })}
              disabled={toggleMut.isPending}
              title={s.is_active ? "Desactivar" : "Activar"}
              style={{ padding: "8px", borderRadius: 8, background: s.is_active ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${s.is_active ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`, color: s.is_active ? "#f87171" : "#4ade80", cursor: "pointer", display: "flex" }}>
              <Power size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Modal crear proveedor */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={closeModal}>
          <div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 20, padding: 28, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <p style={{ fontWeight: 800, fontSize: 18, color: "#fff" }}>Nuevo proveedor</p>
              <button onClick={closeModal} style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 8, padding: 6, cursor: "pointer", color: "#aaa", display: "flex" }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ color: "#555", fontSize: 13, marginBottom: 24 }}>
              Se creará una cuenta de acceso. El proveedor podrá iniciar sesión en <strong style={{ color: "#aaa" }}>/login</strong> y será redirigido a su panel automáticamente.
            </p>

            {FIELDS.map(({ key, label, placeholder, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, color: "#777", fontWeight: 600, marginBottom: 6 }}>{label.toUpperCase()}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setFormErrors(fe => ({ ...fe, [key]: null })); }}
                  placeholder={placeholder}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#0A0A0A", border: `1px solid ${formErrors[key] ? "#ef4444" : "#2A2A2A"}`, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
                {formErrors[key] && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{formErrors[key]}</p>}
              </div>
            ))}

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, color: "#777", fontWeight: 600, marginBottom: 6 }}>DESCRIPCIÓN</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descripción del proveedor (aparece en la landing)..."
                rows={3}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#fff", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, display: "flex", gap: 10 }}>
              <AlertTriangle size={15} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>
                Comparte el email y la contraseña con el proveedor. Puede cambiar la contraseña desde su perfil después.
              </p>
            </div>

            <button onClick={handleCreate} disabled={saving}
              style={{ width: "100%", padding: 14, borderRadius: 12, background: O, color: "#fff", fontWeight: 800, fontSize: 15, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Creando cuenta..." : "Crear proveedor"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
