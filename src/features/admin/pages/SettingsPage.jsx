import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { applyTheme, AVAILABLE_FONTS } from "../../../lib/applyTheme";
import { Loader2, ExternalLink, Palette, Type, Sun, Moon } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { SHOP_ID } from "../../../lib/constants";
import ThemeProvider from "../../../components/shared/ThemeProvider";
import ImageUpload from "../../../components/shared/ImageUpload";

const O = "var(--brand, #FF6B2C)";

const FONTS = AVAILABLE_FONTS;
const COLORS = [
  { label: "Naranja",  value: "#FF6B2C" },
  { label: "Rojo",     value: "#E53E3E" },
  { label: "Morado",   value: "#805AD5" },
  { label: "Azul",     value: "#3182CE" },
  { label: "Verde",    value: "#38A169" },
  { label: "Negro",    value: "#1A1A1A" },
  { label: "Custom",   value: null      },
];

async function getMyShopId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase
    .from("profiles").select("shop_id").eq("id", user.id).maybeSingle();
  return profile?.shop_id ?? SHOP_ID;
}

async function getShopSettings() {
  const shopId = await getMyShopId();
  const { data, error } = await supabase
    .from("barbershops")
    .select("*")
    .eq("id", shopId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Barbería no encontrada");
  return data;
}

async function updateShopSettings(shopId, updates) {
  // Solo enviar campos que existen en la tabla — evita errores si faltan columnas
  const safe = {
    name:              updates.name,
    slug:              updates.slug,
    phone:             updates.phone,
    address:           updates.address,
    city:              updates.city,
    whatsapp_number:   updates.whatsapp_number,
    instagram_url:     updates.instagram_url,
    bank_account:      updates.bank_account,
    bank_name:         updates.bank_name,
    bank_holder:       updates.bank_holder,
    allows_delivery:   updates.allows_delivery,
    delivery_fee_base: updates.delivery_fee_base,
    delivery_fee_per_km: updates.delivery_fee_per_km,
    booking_lead_time_min: updates.booking_lead_time_min,
    booking_window_days:   updates.booking_window_days,
    // theming — pueden no existir en DBs viejas, se agregan con fix_barbershops_columns.sql
    ...(updates.tagline     !== undefined && { tagline:     updates.tagline }),
    ...(updates.theme_mode  !== undefined && { theme_mode:  updates.theme_mode }),
    ...(updates.theme_color !== undefined && { theme_color: updates.theme_color }),
    ...(updates.theme_font  !== undefined && { theme_font:  updates.theme_font }),
    ...(updates.logo_url    !== undefined && { logo_url:    updates.logo_url }),
    ...(updates.cover_url   !== undefined && { cover_url:   updates.cover_url }),
  };

  console.log("🔄 Guardando shop:", shopId, safe);
  const { data, error } = await supabase
    .from("barbershops")
    .update(safe)
    .eq("id", shopId)
    .select();
  console.log("📦 Resultado update:", { data, error });
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("El update no afectó ninguna fila. Verifica el RLS en Supabase.");
  }
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: shop, isLoading } = useQuery({ queryKey: ["shop-settings"], queryFn: getShopSettings });

  const [form, setForm] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (shop && !form) {
      setForm({
        name:        shop.name        ?? "",
        slug:        shop.slug        ?? "",
        phone:       shop.phone       ?? "",
        address:     shop.address     ?? "",
        city:        shop.city        ?? "",
        whatsapp_number: shop.whatsapp_number ?? "",
        instagram_url:   shop.instagram_url   ?? "",
        bank_account:    shop.bank_account    ?? "",
        bank_name:       shop.bank_name       ?? "",
        bank_holder:     shop.bank_holder     ?? "",
        tagline:     shop.tagline     ?? "",
        theme_mode:  shop.theme_mode  ?? "dark",
        theme_color: shop.theme_color ?? "#FF6B2C",
        theme_font:  shop.theme_font  ?? "Inter",
        logo_url:    shop.logo_url    ?? "",
        cover_url:   shop.cover_url   ?? "",
        booking_lead_time_min: shop.booking_lead_time_min ?? 60,
        booking_window_days:   shop.booking_window_days   ?? 30,
        delivery_fee_base:    0,
        delivery_fee_per_km:  shop.delivery_fee_per_km  ?? 650,
        allows_delivery:      shop.allows_delivery      ?? true,
      });
    }
  }, [shop, form]);

  // Preview en tiempo real del tema
  function setTheme(patch) {
    const next = { ...form, ...patch };
    setForm(next);
    applyTheme({ theme_mode: next.theme_mode, theme_color: next.theme_color, theme_font: next.theme_font });
  }

  const mut = useMutation({
    mutationFn: () => {
      if (!shop?.id) throw new Error("No se encontró el ID de la barbería");
      return updateShopSettings(shop.id, form);
    },
    onSuccess: () => {
      qc.invalidateQueries(["shop-settings"]);
      applyTheme({ theme_mode: form.theme_mode, theme_color: form.theme_color, theme_font: form.theme_font });
      // Actualizar nombre y logo en el store sin recargar
      import("../../../store/authStore").then(({ useAuthStore }) => {
        useAuthStore.setState({ shopName: form.name, shopLogo: form.logo_url || null });
      });
      toast.success("Configuración guardada ✅");
    },
    onError: (e) => { console.error("❌ Settings error:", e); toast.error(e?.message ?? "Error al guardar. Revisa la consola (F12)."); },
  });

  if (isLoading || !form) return (
    <div className="admin-page" style={{ color: "var(--text-faint)" }}>Cargando configuración...</div>
  );

  const inp = { width: "100%", padding: "11px 13px", borderRadius: 10, background: "var(--input-bg, #1E1E1E)", border: "1px solid var(--border, #2A2A2A)", color: "var(--text, #fff)", fontSize: 14, boxSizing: "border-box", outline: "none" };

  return (
    <div className="admin-page" style={{ maxWidth: "min(860px, 100%)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>Configuración</h1>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Personaliza tu barbería y su página pública</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a
            href={`/${form.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
          >
            <ExternalLink size={14} /> Ver mi página
          </a>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 20px", borderRadius: 9, background: "var(--brand)", border: "none", color: "var(--text)", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: mut.isPending ? 0.7 : 1 }}
          >
            {mut.isPending && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
            Guardar cambios
          </button>
        </div>
      </div>

      <style>{`@media(max-width:700px){.settings-grid{grid-template-columns:1fr!important;}}`}</style>
      <div className="settings-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

        {/* ── COLUMNA IZQUIERDA ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Info básica */}
          <Section title="Información básica">
            <Field label="Nombre de la barbería">
              <input style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                onFocus={f => f.target.style.borderColor = O} onBlur={f => f.target.style.borderColor = "#2A2A2A"} />
            </Field>
            <Field label="Eslogan / Tagline">
              <input style={inp} value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })}
                placeholder="El corte perfecto, donde tú estés."
                onFocus={f => f.target.style.borderColor = O} onBlur={f => f.target.style.borderColor = "#2A2A2A"} />
            </Field>
            <Field label="Ciudad">
              <input style={inp} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                onFocus={f => f.target.style.borderColor = O} onBlur={f => f.target.style.borderColor = "#2A2A2A"} />
            </Field>
            <Field label="Dirección">
              <input style={inp} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                onFocus={f => f.target.style.borderColor = O} onBlur={f => f.target.style.borderColor = "#2A2A2A"} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="WhatsApp">
                <input style={inp} value={form.whatsapp_number} onChange={e => setForm({ ...form, whatsapp_number: e.target.value })}
                  placeholder="56912345678"
                  onFocus={f => f.target.style.borderColor = O} onBlur={f => f.target.style.borderColor = "#2A2A2A"} />
              </Field>
              <Field label="Instagram">
                <input style={inp} value={form.instagram_url} onChange={e => setForm({ ...form, instagram_url: e.target.value })}
                  placeholder="@noblecut"
                  onFocus={f => f.target.style.borderColor = O} onBlur={f => f.target.style.borderColor = "#2A2A2A"} />
              </Field>
            </div>
          </Section>

          {/* Cuenta para transferencias */}
          <Section title="💸 Cuenta para domicilios">
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12, lineHeight: 1.5 }}>
              Los clientes verán estos datos para pagar el domicilio antes de confirmar la reserva.
            </p>
            <Field label="Banco">
              <input style={inp} value={form.bank_name ?? ""} onChange={e => setForm({ ...form, bank_name: e.target.value })}
                placeholder="Banco Estado, Santander..."
                onFocus={f => f.target.style.borderColor = O} onBlur={f => f.target.style.borderColor = "#2A2A2A"} />
            </Field>
            <Field label="Nombre del titular">
              <input style={inp} value={form.bank_holder ?? ""} onChange={e => setForm({ ...form, bank_holder: e.target.value })}
                placeholder="Juan Pérez"
                onFocus={f => f.target.style.borderColor = O} onBlur={f => f.target.style.borderColor = "#2A2A2A"} />
            </Field>
            <Field label="Número de cuenta / RUT">
              <input style={inp} value={form.bank_account ?? ""} onChange={e => setForm({ ...form, bank_account: e.target.value })}
                placeholder="12.345.678-9"
                onFocus={f => f.target.style.borderColor = O} onBlur={f => f.target.style.borderColor = "#2A2A2A"} />
            </Field>
          </Section>

          {/* Imágenes */}
          <Section title="Logo e imágenes">
            <Field label="Logo de tu barbería">
              <ImageUpload
                value={form.logo_url}
                onChange={url => setForm({ ...form, logo_url: url })}
                folder="logos"
                label="Toca para subir tu logo"
                aspect="square"
                
              />
            </Field>
            <Field label="Imagen de portada (hero)">
              <ImageUpload
                value={form.cover_url}
                onChange={url => setForm({ ...form, cover_url: url })}
                folder="covers"
                label="Toca para subir tu foto de portada"
                aspect="wide"
                
              />
              <p style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 6 }}>
                Recomendado: foto de la barbería o un corte. Se muestra con overlay oscuro en el hero.
              </p>
            </Field>
          </Section>

          {/* Configuración de reservas */}
          <Section title="Configuración de reservas">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Anticipación mínima (min)">
                <input style={inp} type="number" min={0} value={form.booking_lead_time_min}
                  onChange={e => setForm({ ...form, booking_lead_time_min: Number(e.target.value) })}
                  onFocus={f => f.target.style.borderColor = O} onBlur={f => f.target.style.borderColor = "#2A2A2A"} />
              </Field>
              <Field label="Ventana de reserva (días)">
                <input style={inp} type="number" min={1} value={form.booking_window_days}
                  onChange={e => setForm({ ...form, booking_window_days: Number(e.target.value) })}
                  onFocus={f => f.target.style.borderColor = O} onBlur={f => f.target.style.borderColor = "#2A2A2A"} />
              </Field>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={form.allows_delivery} onChange={e => setForm({ ...form, allows_delivery: e.target.checked })} />
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Ofrecer servicio a domicilio</span>
            </label>
            {form.allows_delivery && (
              <div>
                <Field label="💰 Precio por km de domicilio ($)">
                  <input style={inp} type="number" min={0} value={form.delivery_fee_per_km}
                    onChange={e => setForm({ ...form, delivery_fee_per_km: Number(e.target.value) })}
                    onFocus={f => f.target.style.borderColor = O} onBlur={f => f.target.style.borderColor = "#2A2A2A"} />
                </Field>
                <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
                  Ej: a 5 km → {form.delivery_fee_per_km * 5 > 0 ? `$${(form.delivery_fee_per_km * 5).toLocaleString("es-CL")}` : "$0"} de tarifa
                </p>
              </div>
            )}
          </Section>
        </div>

        {/* ── COLUMNA DERECHA: APARIENCIA ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          <Section title={<span style={{ display: "flex", alignItems: "center", gap: 6 }}><Palette size={15} /> Apariencia</span>}>

            {/* Modo claro/oscuro */}
            <Field label="Modo de color">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { value: "dark",  icon: <Moon size={15} />,  label: "Oscuro" },
                  { value: "light", icon: <Sun size={15} />,   label: "Claro"  },
                ].map(m => (
                  <button
                    key={m.value}
                    onClick={() => setTheme({ theme_mode: m.value })}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "12px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13,
                      background: form.theme_mode === m.value ? `${O}18` : "#1E1E1E",
                      border: `1px solid ${form.theme_mode === m.value ? O : "#2A2A2A"}`,
                      color: form.theme_mode === m.value ? O : "#555",
                    }}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* Color principal — picker libre + paleta de sugerencias */}
            <Field label="Color principal">
              {/* Picker libre */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <label style={{ position: "relative", cursor: "pointer" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: form.theme_color, border: "3px solid #2A2A2A", boxShadow: `0 0 0 3px ${form.theme_color}44` }} />
                  <input
                    type="color"
                    value={form.theme_color}
                    onChange={e => setTheme({ theme_color: e.target.value })}
                    style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                  />
                </label>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, marginBottom: 2 }}>Toca para elegir cualquier color</p>
                  <p style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "monospace" }}>{form.theme_color}</p>
                </div>
              </div>
              {/* Colores sugeridos */}
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 6 }}>Sugerencias:</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {COLORS.slice(0, -1).map(c => (
                  <button
                    key={c.value}
                    onClick={() => setTheme({ theme_color: c.value })}
                    title={c.label}
                    style={{
                      width: 32, height: 32, borderRadius: 8, cursor: "pointer",
                      background: c.value, border: `3px solid ${form.theme_color === c.value ? "#fff" : "transparent"}`,
                      outline: form.theme_color === c.value ? `2px solid ${c.value}` : "none",
                    }}
                  />
                ))}
              </div>
            </Field>

            {/* Fuente */}
            <Field label={<span style={{ display: "flex", alignItems: "center", gap: 5 }}><Type size={12} /> Fuente</span>}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {FONTS.map(f => (
                  <button
                    key={f}
                    onClick={() => setTheme({ theme_font: f })}
                    style={{
                      padding: "10px 14px", borderRadius: 9, cursor: "pointer", textAlign: "left",
                      background: form.theme_font === f ? `${O}18` : "#1E1E1E",
                      border: `1px solid ${form.theme_font === f ? O : "#2A2A2A"}`,
                      color: form.theme_font === f ? "#fff" : "#555",
                      fontFamily: `'${f}', sans-serif`,
                      fontSize: 14, fontWeight: 600,
                    }}
                  >
                    {f}
                    <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.5, fontWeight: 400 }}>AaBbCc 123</span>
                  </button>
                ))}
              </div>
            </Field>
          </Section>

          {/* Link a la página pública */}
          <Section title="Tu página pública">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div>
                <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>barberos.com/{form.slug}</p>
                <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>Guarda los cambios y recarga para ver el resultado</p>
              </div>
              <a
                href={`/${form.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "var(--brand)", color: "var(--text)", fontSize: 13, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}
              >
                <ExternalLink size={13} /> Ver página
              </a>
            </div>
          </Section>
        </div>
      </div>

      {/* Guardar bottom */}
      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 10, background: "var(--brand)", border: "none", color: "var(--text)", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: mut.isPending ? 0.7 : 1 }}
        >
          {mut.isPending && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16, padding: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
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
