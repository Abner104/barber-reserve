import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scissors, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../lib/supabase";

const O = "#FF6B2C";

export default function LoginPage() {
  const navigate  = useNavigate();
  const signIn    = useAuthStore(s => s.signIn);
  const [form, setForm]       = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await signIn(form.email, form.password);
      // Cargar perfil para saber el rol
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      toast.success("¡Bienvenido!");
      if (profile?.role === "barber") {
        navigate("/barber");
      } else if (profile?.role === "super_admin") {
        navigate("/superadmin");
      } else {
        navigate("/admin");
      }
    } catch (err) {
      setError("Email o contraseña incorrectos.");
      toast.error("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  const inp = {
    width: "100%", padding: "13px 14px", borderRadius: 12, fontSize: 14,
    background: "#141414", border: "1px solid #2A2A2A", color: "#fff",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 40 }}>
          <div style={{ width: 40, height: 40, background: O, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Scissors size={20} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 22, color: "#fff" }}>NobleCut</span>
        </div>

        {/* Card */}
        <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 20, padding: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Bienvenido</h1>
          <p style={{ color: "#555", fontSize: 14, marginBottom: 28 }}>Ingresa a tu panel de administración</p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#A0A0A0", marginBottom: 6, fontWeight: 600 }}>Email</label>
              <input
                style={inp}
                type="email"
                placeholder="admin@noblecut.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                onFocus={e => e.target.style.borderColor = O}
                onBlur={e => e.target.style.borderColor = "#2A2A2A"}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#A0A0A0", marginBottom: 6, fontWeight: 600 }}>Contraseña</label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inp, paddingRight: 44 }}
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  onFocus={e => e.target.style.borderColor = O}
                  onBlur={e => e.target.style.borderColor = "#2A2A2A"}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#555" }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, fontSize: 15, fontWeight: 700,
                background: O, color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: loading ? 0.7 : 1, marginTop: 4,
              }}
            >
              {loading && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "#555", fontSize: 12, marginTop: 20 }}>
          ¿Olvidaste tu contraseña?{" "}
          <span style={{ color: O, cursor: "pointer" }}>Contacta al soporte</span>
        </p>
      </div>
    </div>
  );
}
