import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Loader2, Eye, EyeOff, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../lib/supabase";
import { isPlatformAuthAvailable, hasPasskeys, authenticatePasskey, registerPasskey } from "../lib/passkey";
import PasskeyPrompt from "../components/shared/PasskeyPrompt";

const O = "#FF6B2C";

function getRoleRoute(role) {
  if (role === "barber")      return "/barber";
  if (role === "super_admin") return "/superadmin";
  if (role === "supplier")    return "/supplier";
  return "/admin";
}

// Guardar email para autocompletar passkey
function getSavedEmail() { return localStorage.getItem("clippr_email") ?? ""; }
function setSavedEmail(e) { localStorage.setItem("clippr_email", e); }

export default function LoginPage() {
  const navigate               = useNavigate();
  const { signIn, user, profile, loading } = useAuthStore();
  const [form, setForm]        = useState({ email: getSavedEmail(), password: "" });
  const [showPwd, setShowPwd]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]      = useState("");
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [passkeyLoading, setPasskeyLoading]     = useState(false);
  const [showPrompt, setShowPrompt]             = useState(false);
  const [loggedUser, setLoggedUser]             = useState(null);

  // Verificar si hay passkey guardada y el dispositivo la soporta
  useEffect(() => {
    const registered = localStorage.getItem("clippr_passkey_registered");
    const userId     = localStorage.getItem("clippr_passkey_user");
    if (!registered || !userId) return;
    isPlatformAuthAvailable().then(avail => {
      setPasskeyAvailable(avail);
    });
  }, []);

  if (!loading && user && profile) {
    return <Navigate to={getRoleRoute(profile.role)} replace />;
  }
  if (!loading && user && !profile) {
    return <Navigate to="/admin" replace />;
  }

  async function handlePasskeyLogin() {
    const userId = localStorage.getItem("clippr_passkey_user");
    if (!userId) return;
    setPasskeyLoading(true);
    setError("");
    try {
      await authenticatePasskey(userId);
      // Autenticación biométrica ok — iniciar sesión con magic link o token guardado
      // Como Supabase no tiene passkey nativo, usamos el email guardado + pedimos OTP silencioso
      // En su lugar, guardamos la sesión en localStorage y la restauramos
      const savedSession = localStorage.getItem("clippr_session");
      if (savedSession) {
        const session = JSON.parse(savedSession);
        const { error } = await supabase.auth.setSession({
          access_token:  session.access_token,
          refresh_token: session.refresh_token,
        });
        if (error) throw new Error("Sesión expirada, ingresa con contraseña");
        const { data: prof } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
        toast.success("¡Bienvenido! 🔐");
        navigate(getRoleRoute(prof?.role), { replace: true });
      } else {
        throw new Error("Sesión expirada, ingresa con contraseña");
      }
    } catch (e) {
      setError(e.message || "No se pudo autenticar con huella");
      toast.error(e.message || "Error de autenticación");
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { user: lu, session } = await signIn(form.email, form.password);
      setSavedEmail(form.email);

      // Guardar sesión para passkey
      if (session) {
        localStorage.setItem("clippr_session", JSON.stringify({
          access_token:  session.access_token,
          refresh_token: session.refresh_token,
          user: { id: lu.id },
        }));
        localStorage.setItem("clippr_passkey_user", lu.id);
      }

      // Fetch role directly — no RLS ambiguity since user just authenticated
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, shop_id")
        .eq("id", lu.id)
        .maybeSingle();

      const role = profileData?.role ?? null;
      console.log("[Login] user id:", lu.id, "role:", role, "profile:", profileData);

      // Load into store for the rest of the app
      const { loadProfile } = useAuthStore.getState();
      loadProfile(lu); // fire-and-forget, store will hydrate

      // Mostrar prompt de passkey si no lo ha visto y el dispositivo lo soporta
      const skipped    = localStorage.getItem("clippr_passkey_skipped");
      const registered = localStorage.getItem("clippr_passkey_registered");
      if (!skipped && !registered) {
        const avail = await isPlatformAuthAvailable();
        if (avail) {
          setLoggedUser({ id: lu.id, email: form.email, role });
          setShowPrompt(true);
          setSubmitting(false);
          return;
        }
      }

      toast.success("¡Bienvenido!");
      navigate(getRoleRoute(role), { replace: true });
    } catch (err) {
      setError("Email o contraseña incorrectos.");
      toast.error("Email o contraseña incorrectos.");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePromptClose() {
    setShowPrompt(false);
    if (loggedUser) navigate(getRoleRoute(loggedUser.role), { replace: true });
  }

  const inp = {
    width: "100%", padding: "13px 14px", borderRadius: 12, fontSize: 14,
    background: "#141414", border: "1px solid #2A2A2A", color: "#fff",
    outline: "none", boxSizing: "border-box",
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: "3px solid #2A2A2A", borderTopColor: O, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 40 }}>
          <img src="/LogoC.png" alt="Clippr" style={{ width: 40, height: 40, objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(255,107,44,.5))" }} />
          <span style={{ fontWeight: 900, fontSize: 22, color: "#fff" }}>Clippr</span>
        </div>

        <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 20, padding: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Bienvenido</h1>
          <p style={{ color: "#555", fontSize: 14, marginBottom: 28 }}>Ingresa a tu panel</p>

          {/* Botón passkey — si tiene huella registrada */}
          {passkeyAvailable && (
            <button
              onClick={handlePasskeyLogin}
              disabled={passkeyLoading}
              style={{ width: "100%", padding: "14px", borderRadius: 12, background: "rgba(255,107,44,0.08)", border: "1px solid rgba(255,107,44,0.3)", color: O, fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}
            >
              {passkeyLoading
                ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                : <Fingerprint size={18} />
              }
              {passkeyLoading ? "Verificando..." : "Entrar con huella / Face ID"}
            </button>
          )}

          {passkeyAvailable && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: "#222" }} />
              <span style={{ fontSize: 12, color: "#444" }}>o con contraseña</span>
              <div style={{ flex: 1, height: 1, background: "#222" }} />
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#A0A0A0", marginBottom: 6, fontWeight: 600 }}>Email</label>
              <input
                style={inp} type="email" placeholder="tu@email.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                onFocus={e => e.target.style.borderColor = O}
                onBlur={e => e.target.style.borderColor = "#2A2A2A"}
                required autoComplete="email"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#A0A0A0", marginBottom: 6, fontWeight: 600 }}>Contraseña</label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inp, paddingRight: 44 }}
                  type={showPwd ? "text" : "password"} placeholder="••••••••"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  onFocus={e => e.target.style.borderColor = O}
                  onBlur={e => e.target.style.borderColor = "#2A2A2A"}
                  required autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#555" }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={submitting}
              style={{ width: "100%", padding: "14px", borderRadius: 12, fontSize: 15, fontWeight: 700, background: O, color: "#fff", border: "none", cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: submitting ? 0.7 : 1, marginTop: 4 }}
            >
              {submitting && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
              {submitting ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>

      {/* Prompt post-login para registrar passkey */}
      {showPrompt && loggedUser && (
        <PasskeyPrompt
          userId={loggedUser.id}
          userEmail={loggedUser.email}
          onClose={handlePromptClose}
        />
      )}
    </div>
  );
}
