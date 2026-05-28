import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Link2, Copy, Check, Loader2 } from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import { getSupplierByProfileId } from "../services/supplierService";
import { supabase } from "../../../lib/supabase";
import WhatsAppQR from "../../admin/components/WhatsAppQR";
import ImageUpload from "../../../components/shared/ImageUpload";
import { applyTheme } from "../../../lib/applyTheme";

const O = "#FF6B2C";

const FONTS  = ["Inter", "Poppins", "Montserrat", "Raleway", "Oswald"];
const COLORS = ["#FF6B2C", "#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

async function uploadSupplierImage(file, supplierId, folder) {
  const ext  = file.name.split(".").pop();
  const path = `supplier-${supplierId}/${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("shop-images")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("shop-images").getPublicUrl(path);
  return data.publicUrl;
}

export default function SupplierSettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [copied, setCopied]           = useState(false);
  const [saving, setSaving]           = useState(false);
  const [uploadingLogo, setUploadingLogo]     = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [form, setForm] = useState(null);

  const { data: supplier, isLoading } = useQuery({
    queryKey: ["supplier-profile", user?.id],
    queryFn:  () => getSupplierByProfileId(user.id),
    enabled:  !!user?.id,
    onSuccess: (data) => {
      if (data && !form) setForm({
        name:        data.name        ?? "",
        description: data.description ?? "",
        whatsapp:    data.whatsapp    ?? "",
        logo_url:    data.logo_url    ?? "",
        banner_url:  data.banner_url  ?? "",
        theme_color: data.theme_color ?? O,
        theme_font:  data.theme_font  ?? "Inter",
        theme_mode:  data.theme_mode  ?? "dark",
      });
    },
  });

  if (supplier && !form) {
    setForm({
      name:        supplier.name        ?? "",
      description: supplier.description ?? "",
      whatsapp:    supplier.whatsapp    ?? "",
      logo_url:    supplier.logo_url    ?? "",
      banner_url:  supplier.banner_url  ?? "",
      theme_color: supplier.theme_color ?? O,
      theme_font:  supplier.theme_font  ?? "Inter",
      theme_mode:  supplier.theme_mode  ?? "dark",
    });
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

  async function handleLogoUpload(file) {
    if (!supplier) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Máx 5MB"); return; }
    setUploadingLogo(true);
    try {
      const url = await uploadSupplierImage(file, supplier.id, "logo");
      setForm(f => ({ ...f, logo_url: url }));
    } catch { toast.error("Error al subir logo"); }
    finally { setUploadingLogo(false); }
  }

  async function handleBannerUpload(file) {
    if (!supplier) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Máx 5MB"); return; }
    setUploadingBanner(true);
    try {
      const url = await uploadSupplierImage(file, supplier.id, "banner");
      setForm(f => ({ ...f, banner_url: url }));
    } catch { toast.error("Error al subir banner"); }
    finally { setUploadingBanner(false); }
  }

  async function handleSave() {
    if (!form?.name?.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("suppliers")
        .update({
          name:        form.name,
          description: form.description,
          whatsapp:    form.whatsapp,
          logo_url:    form.logo_url    || null,
          banner_url:  form.banner_url  || null,
          theme_color: form.theme_color,
          theme_font:  form.theme_font,
          theme_mode:  form.theme_mode,
        })
        .eq("id", supplier.id);
      if (error) throw error;
      applyTheme({ theme_mode: form.theme_mode, theme_color: form.theme_color, theme_font: form.theme_font });
      qc.invalidateQueries({ queryKey: ["supplier-profile"] });
      qc.invalidateQueries({ queryKey: ["public-supplier"] });
      toast.success("Perfil actualizado");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  const brand = form?.theme_color ?? O;

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
        <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>Perfil y apariencia de tu catálogo</p>
      </div>

      {/* ── Catálogo público ─────────────────────────── */}
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

      {/* ── WhatsApp ─────────────────────────────────── */}
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

      {/* ── Apariencia ───────────────────────────────── */}
      {form && (
        <Section title="🎨 Apariencia del catálogo">

          {/* Preview */}
          <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #2A2A2A", marginBottom: 24 }}>
            {/* Banner */}
            <div style={{ height: 100, background: form.banner_url ? `url(${form.banner_url}) center/cover` : `linear-gradient(135deg, ${brand}22, ${brand}44)`, position: "relative", display: "flex", alignItems: "flex-end", padding: "12px 16px" }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
              {form.logo_url ? (
                <img src={form.logo_url} alt="logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", border: "2px solid #fff", position: "relative", zIndex: 1 }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: 12, background: brand, border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22, color: "#fff", position: "relative", zIndex: 1 }}>
                  {(form.name || "P")[0].toUpperCase()}
                </div>
              )}
              <span style={{ position: "relative", zIndex: 1, marginLeft: 12, fontWeight: 800, fontSize: 16, color: "#fff", fontFamily: form.theme_font }}>
                {form.name || "Tu negocio"}
              </span>
            </div>
          </div>

          {/* Banner upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#777", fontWeight: 600, marginBottom: 8 }}>BANNER (portada)</label>
            {form.banner_url ? (
              <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                <img src={form.banner_url} alt="banner" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 10, border: "1px solid #2A2A2A" }} />
                <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
                  <label style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                    {uploadingBanner ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "✏️"}
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleBannerUpload(e.target.files[0])} />
                  </label>
                  <button onClick={() => setForm(f => ({ ...f, banner_url: "" }))} style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(239,68,68,0.8)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13 }}>✕</button>
                </div>
              </div>
            ) : (
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, height: 80, borderRadius: 10, border: "2px dashed #2A2A2A", background: "#1E1E1E", cursor: uploadingBanner ? "not-allowed" : "pointer" }}>
                {uploadingBanner ? <Loader2 size={20} color="#555" style={{ animation: "spin 1s linear infinite" }} /> : <span style={{ color: "#555", fontSize: 13 }}>Subir banner · JPG, PNG · máx 5MB</span>}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleBannerUpload(e.target.files[0])} />
              </label>
            )}
          </div>

          {/* Logo upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#777", fontWeight: 600, marginBottom: 8 }}>LOGO</label>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {form.logo_url ? (
                <div style={{ position: "relative" }}>
                  <img src={form.logo_url} alt="logo" style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover", border: "1px solid #2A2A2A" }} />
                  <div style={{ position: "absolute", top: -6, right: -6, display: "flex", gap: 3 }}>
                    <label style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(0,0,0,0.8)", border: "1px solid #333", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10 }}>
                      {uploadingLogo ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : "✏️"}
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
                    </label>
                    <button onClick={() => setForm(f => ({ ...f, logo_url: "" }))} style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(239,68,68,0.8)", border: "none", cursor: "pointer", color: "#fff", fontSize: 10 }}>✕</button>
                  </div>
                </div>
              ) : (
                <label style={{ width: 72, height: 72, borderRadius: 12, border: "2px dashed #2A2A2A", background: "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center", cursor: uploadingLogo ? "not-allowed" : "pointer", flexShrink: 0 }}>
                  {uploadingLogo ? <Loader2 size={20} color="#555" style={{ animation: "spin 1s linear infinite" }} /> : <span style={{ fontSize: 11, color: "#555", textAlign: "center" }}>Subir logo</span>}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
                </label>
              )}
              <p style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>Imagen cuadrada recomendada.<br />JPG, PNG, WEBP · máx 5MB</p>
            </div>
          </div>

          {/* Modo oscuro / claro */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#777", fontWeight: 600, marginBottom: 10 }}>MODO</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ val: "dark", label: "🌙 Oscuro" }, { val: "light", label: "☀️ Claro" }].map(({ val, label }) => (
                <button key={val} onClick={() => setForm(f => ({ ...f, theme_mode: val }))}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${form.theme_mode === val ? brand : "#2A2A2A"}`, background: form.theme_mode === val ? `${brand}18` : "#1A1A1A", color: form.theme_mode === val ? brand : "#777", fontWeight: form.theme_mode === val ? 700 : 400, fontSize: 14, cursor: "pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Color del tema */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#777", fontWeight: 600, marginBottom: 10 }}>COLOR PRINCIPAL</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, theme_color: c }))}
                  style={{ width: 36, height: 36, borderRadius: 10, background: c, border: form.theme_color === c ? "3px solid #fff" : "3px solid transparent", cursor: "pointer", transition: "border 0.15s" }} />
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" value={form.theme_color} onChange={e => setForm(f => ({ ...f, theme_color: e.target.value }))}
                  style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #2A2A2A", background: "none", cursor: "pointer", padding: 2 }} />
                <span style={{ fontSize: 12, color: "#555" }}>Personalizado</span>
              </div>
            </div>
          </div>

          {/* Fuente */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, color: "#777", fontWeight: 600, marginBottom: 8 }}>TIPOGRAFÍA</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FONTS.map(f => (
                <button key={f} onClick={() => setForm(fm => ({ ...fm, theme_font: f }))}
                  style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${form.theme_font === f ? brand : "#2A2A2A"}`, background: form.theme_font === f ? `${brand}18` : "#1A1A1A", color: form.theme_font === f ? brand : "#777", fontFamily: f, fontSize: 13, cursor: "pointer", fontWeight: form.theme_font === f ? 700 : 400 }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ── Perfil ───────────────────────────────────── */}
      {form && (
        <Section title="👤 Perfil del proveedor">
          {[
            { key: "name",     label: "Nombre del negocio *", placeholder: "JP Barber Supply", type: "text" },
            { key: "whatsapp", label: "WhatsApp de contacto",  placeholder: "+56 9 1234 5678",  type: "tel"  },
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
            style={{ padding: "12px 24px", borderRadius: 10, background: brand, color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </Section>
      )}
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
