import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Link2, Copy, Check } from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import { getSupplierByProfileId } from "../services/supplierService";
import { supabase } from "../../../lib/supabase";
import WhatsAppQR from "../../admin/components/WhatsAppQR";

const O = "#FF6B2C";

export default function SupplierSettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState(null);

  const { data: supplier, isLoading } = useQuery({
    queryKey: ["supplier-profile", user?.id],
    queryFn:  () => getSupplierByProfileId(user.id),
    enabled:  !!user?.id,
    onSuccess: (data) => { if (data && !form) setForm({ name: data.name, description: data.description ?? "", whatsapp: data.whatsapp ?? "" }); },
  });

  // Inicializar form cuando carga
  if (supplier && !form) {
    setForm({ name: supplier.name, description: supplier.description ?? "", whatsapp: supplier.whatsapp ?? "" });
  }

  const catalogUrl = supplier?.slug
    ? `${window.location.origin}/catalogo/${supplier.slug}`
    : null;

  function copyLink() {
    if (!catalogUrl) return;
    navigator.clipboard.writeText(catalogUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    if (!form?.name?.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("suppliers")
        .update({ name: form.name, description: form.description, whatsapp: form.whatsapp })
        .eq("id", supplier.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["supplier-profile"] });
      qc.invalidateQueries({ queryKey: ["public-supplier"] });
      toast.success("Perfil actualizado");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  if (isLoading) return (
    <div className="sup-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
      <div style={{ width: 28, height: 28, border: `3px solid #2A2A2A`, borderTopColor: O, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="sup-page" style={{ maxWidth: 680 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>Configuración</h1>
        <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>Perfil y conexión WhatsApp</p>
      </div>

      {/* ── Link del catálogo ─────────────────────────────── */}
      <Section title="🔗 Tu catálogo público">
        <p style={{ color: "#777", fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
          Comparte este link con los barberos. Pueden ver y pedir tus productos directamente sin necesitar cuenta.
        </p>
        {catalogUrl ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 10 }}>
            <Link2 size={15} color={O} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: "#aaa", wordBreak: "break-all" }}>{catalogUrl}</span>
            <button onClick={copyLink} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: copied ? "rgba(34,197,94,0.1)" : "rgba(255,107,44,0.1)", border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(255,107,44,0.3)"}`, color: copied ? "#4ade80" : O, cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        ) : (
          <p style={{ color: "#555", fontSize: 13 }}>El link se generará cuando el super admin asigne un slug a tu perfil.</p>
        )}
        {catalogUrl && (
          <a href={catalogUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12, color: O, textDecoration: "none", fontWeight: 600 }}>
            Ver catálogo →
          </a>
        )}
      </Section>

      {/* ── WhatsApp ──────────────────────────────────────── */}
      <Section title="📱 Notificaciones WhatsApp">
        <p style={{ color: "#777", fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
          Conecta tu WhatsApp para recibir notificaciones automáticas cada vez que un barbero haga un pedido.
        </p>
        {supplier && (
          <WhatsAppQR
            barberId={`supplier_${supplier.id}`}
            barberName={supplier.name}
            barberPhone={supplier.whatsapp}
          />
        )}
      </Section>

      {/* ── Perfil ────────────────────────────────────────── */}
      <Section title="👤 Perfil del proveedor">
        {form && (
          <>
            {[
              { key: "name",        label: "Nombre del negocio *", placeholder: "JP Barber Supply", type: "text" },
              { key: "whatsapp",    label: "WhatsApp de contacto",  placeholder: "+56 9 1234 5678",  type: "tel"  },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, color: "#777", fontWeight: 600, marginBottom: 6 }}>{label.toUpperCase()}</label>
                <input
                  type={type}
                  value={form[key] ?? ""}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "#777", fontWeight: 600, marginBottom: 6 }}>DESCRIPCIÓN</label>
              <textarea
                value={form.description ?? ""}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descripción de tu negocio que verán los barberos..."
                rows={3}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#fff", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box" }}
              />
            </div>

            <button onClick={handleSave} disabled={saving}
              style={{ padding: "12px 24px", borderRadius: 10, background: O, color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 16, padding: "22px 24px", marginBottom: 20 }}>
      <p style={{ fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 16 }}>{title}</p>
      {children}
    </div>
  );
}
