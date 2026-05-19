import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Eye, EyeOff, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

const O = "#FF6B2C";

async function fetchPricing() {
  const { data } = await supabase
    .from("saas_config")
    .select("base_price, price_per_barber, trial_days")
    .eq("id", 1)
    .maybeSingle();
  return data ?? { base_price: 11990, price_per_barber: 2990, trial_days: 30 };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: datos cuenta, 2: datos barbería
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [account, setAccount] = useState({ full_name: "", email: "", password: "" });
  const [shop, setShop]       = useState({ name: "", slug: "", city: "", phone: "" });

  const { data: pricing } = useQuery({ queryKey: ["saas-config-public"], queryFn: fetchPricing, staleTime: 5 * 60 * 1000 });
  const basePrice    = pricing?.base_price       ?? 11990;
  const perBarber    = pricing?.price_per_barber ?? 2990;
  const trialDays    = pricing?.trial_days       ?? 30;
  const fmtPrice     = n => `$${Number(n).toLocaleString("es-CL")}`;

  const inp = {
    width: "100%", padding: "13px 14px", borderRadius: 12, fontSize: 14,
    background: "#141414", border: "1px solid #2A2A2A", color: "#fff",
    outline: "none", boxSizing: "border-box",
  };

  function slugify(text) {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleRegister() {
    setError("");
    setLoading(true);
    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("No se pudo crear el usuario");

      // 2. Crear la barbería
      const { data: shopData, error: shopError } = await supabase
        .from("barbershops")
        .insert({
          name:     shop.name,
          slug:     shop.slug,
          city:     shop.city,
          phone:    shop.phone,
          plan:     "trial",
          currency: "CLP",
          timezone: "America/Santiago",
          allows_delivery: true,
          delivery_fee_base: 5000,
          delivery_fee_per_km: 1500,
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id").single();
      if (shopError) throw shopError;

      // 3. Crear perfil del owner
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id:        userId,
          shop_id:   shopData.id,
          role:      "owner",
          full_name: account.full_name,
          phone:     shop.phone,
        });
      if (profileError) throw profileError;

      // 4. Crear categorías por defecto
      await supabase.from("service_categories").insert([
        { shop_id: shopData.id, name: "Cortes",      sort_order: 1 },
        { shop_id: shopData.id, name: "Barba",       sort_order: 2 },
        { shop_id: shopData.id, name: "Combos",      sort_order: 3 },
        { shop_id: shopData.id, name: "Adicionales", sort_order: 4 },
      ]);

      toast.success(`¡Bienvenido! Tu barbería ${shop.name} está lista 🎉`);
      navigate("/admin");
    } catch (err) {
      const msg = err.message || "Error al crear la cuenta. Intenta de nuevo.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleNextStep(e) {
    e.preventDefault();
    if (!account.full_name.trim() || !account.email.trim() || account.password.length < 6) {
      setError("Completa todos los campos. La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setError("");
    setStep(2);
  }

  function handleShopChange(field, value) {
    const updated = { ...shop, [field]: value };
    if (field === "name") updated.slug = slugify(value);
    setShop(updated);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex" }}>
      <style>{`
        .reg-sidebar { display: none; }
        .reg-logo-mobile { display: flex; }
        @media (min-width: 768px) {
          .reg-sidebar { display: flex; }
          .reg-logo-mobile { display: none; }
        }
      `}</style>

      {/* Panel izquierdo — solo desktop */}
      <div className="reg-sidebar" style={{ width: 420, background: "#0F0F0F", borderRight: "1px solid #1E1E1E", padding: "48px 40px", flexShrink: 0, flexDirection: "column" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 48 }}>
          <img src="/LogoC.png" alt="Clippr" style={{ width: 36, height: 36, objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(255,107,44,.45))" }} />
          <span style={{ fontWeight: 900, fontSize: 18, color: "#fff" }}>Clippr</span>
        </Link>

        <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Tu barbería digital en minutos.</h2>
        <p style={{ color: "#555", fontSize: 15, lineHeight: 1.6, marginBottom: 40 }}>Crea tu cuenta, configura tu barbería y empieza a recibir reservas hoy mismo.</p>

        {[`${trialDays} días gratis sin tarjeta`, "Reservas online 24/7", "Domicilios con mapa", "Panel admin completo", `${fmtPrice(basePrice)} CLP / mes`].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,107,44,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Check size={11} color={O} />
            </div>
            <span style={{ color: "#A0A0A0", fontSize: 14 }}>{f}</span>
          </div>
        ))}

        <div style={{ marginTop: "auto", padding: "16px", background: "#141414", borderRadius: 12, border: "1px solid #1E1E1E" }}>
          <p style={{ color: "#555", fontSize: 12, marginBottom: 4 }}>Precio después del trial</p>
          <p style={{ color: "#fff", fontSize: 20, fontWeight: 900 }}>{fmtPrice(basePrice)} <span style={{ fontSize: 13, fontWeight: 400, color: "#555" }}>/ mes · +{fmtPrice(perBarber)} por barbero adicional</span></p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", minWidth: 0 }}>
        <div style={{ width: "100%", maxWidth: 440 }}>

          {/* Logo móvil */}
          <Link to="/" className="reg-logo-mobile" style={{ alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 36, justifyContent: "center" }}>
            <img src="/LogoC.png" alt="Clippr" style={{ width: 34, height: 34, objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(255,107,44,.45))" }} />
            <span style={{ fontWeight: 900, fontSize: 18, color: "#fff" }}>Clippr</span>
          </Link>

          {/* Progress */}
          <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
            {["Tu cuenta", "Tu barbería"].map((label, i) => (
              <div key={label} style={{ flex: 1 }}>
                <div style={{ height: 3, borderRadius: 2, background: step > i ? O : "#1E1E1E", marginBottom: 6 }} />
                <p style={{ fontSize: 11, color: step === i + 1 ? "#fff" : step > i + 1 ? O : "#555", fontWeight: step === i + 1 ? 600 : 400 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <form onSubmit={handleNextStep} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 4 }}>Crea tu cuenta</h1>
                <p style={{ color: "#555", fontSize: 14 }}>30 días gratis. Sin tarjeta.</p>
              </div>

              <Field label="Tu nombre completo">
                <input style={inp} value={account.full_name} onChange={e => setAccount({ ...account, full_name: e.target.value })}
                  placeholder="Carlos Rodríguez" required
                  onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />
              </Field>

              <Field label="Email">
                <input style={inp} type="email" value={account.email} onChange={e => setAccount({ ...account, email: e.target.value })}
                  placeholder="carlos@mibarberia.com" required
                  onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />
              </Field>

              <Field label="Contraseña">
                <div style={{ position: "relative" }}>
                  <input style={{ ...inp, paddingRight: 44 }} type={showPwd ? "text" : "password"} value={account.password}
                    onChange={e => setAccount({ ...account, password: e.target.value })} placeholder="Mínimo 6 caracteres" required
                    onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#555" }}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}

              <button type="submit" style={{ width: "100%", padding: "14px", borderRadius: 12, background: O, color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", marginTop: 4 }}>
                Continuar →
              </button>
            </form>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 4 }}>Tu barbería</h1>
                <p style={{ color: "#555", fontSize: 14 }}>Así aparecerá para tus clientes.</p>
              </div>

              <Field label="Nombre de tu barbería">
                <input style={inp} value={shop.name} onChange={e => handleShopChange("name", e.target.value)}
                  placeholder="NobleCut Barber Shop"
                  onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />
                {shop.slug && <p style={{ color: "#444", fontSize: 11, marginTop: 4 }}>Tu URL: clippr.app/{shop.slug}</p>}
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Ciudad">
                  <input style={inp} value={shop.city} onChange={e => setShop({ ...shop, city: e.target.value })}
                    placeholder="Santiago"
                    onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />
                </Field>
                <Field label="WhatsApp">
                  <input style={inp} value={shop.phone} onChange={e => setShop({ ...shop, phone: e.target.value })}
                    placeholder="+56912345678"
                    onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />
                </Field>
              </div>

              {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                  <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: "14px", borderRadius: 12, background: "#1E1E1E", border: "1px solid #2A2A2A", color: "#A0A0A0", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
                  ← Atrás
                </button>
                <button
                  onClick={handleRegister}
                  disabled={loading || !shop.name.trim()}
                  style={{ flex: 2, padding: "14px", borderRadius: 12, background: O, color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1 }}
                >
                  {loading && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
                  {loading ? "Creando..." : "Crear mi barbería"}
                </button>
              </div>
            </div>
          )}

          <p style={{ textAlign: "center", color: "#555", fontSize: 13, marginTop: 24 }}>
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" style={{ color: O, fontWeight: 600, textDecoration: "none" }}>Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "#A0A0A0", marginBottom: 6, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}
