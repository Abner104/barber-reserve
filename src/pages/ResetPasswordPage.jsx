import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

const O = "#FF6B2C";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");
  const [ready, setReady]         = useState(false);

  useEffect(() => {
    // Supabase pone el token en el hash de la URL al llegar desde el email
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Contraseña actualizada");
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (e) {
      setError(e.message || "Error al actualizar la contraseña");
    } finally {
      setSaving(false);
    }
  }

  const inp = {
    width: "100%", padding: "13px 14px", borderRadius: 12, fontSize: 14,
    background: "#141414", border: "1px solid #2A2A2A", color: "#fff",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 40 }}>
          <img src="/LogoC.png" alt="Clippr" style={{ width: 40, height: 40, objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(255,107,44,.5))" }} />
          <span style={{ fontWeight: 900, fontSize: 22, color: "#fff" }}>Clippr</span>
        </div>

        <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 20, padding: 32 }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <CheckCircle size={48} color="#22c55e" style={{ marginBottom: 16 }} />
              <p style={{ fontWeight: 800, fontSize: 18, color: "#fff", marginBottom: 8 }}>¡Contraseña actualizada!</p>
              <p style={{ color: "#555", fontSize: 13 }}>Redirigiendo al login...</p>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ color: "#555", fontSize: 14 }}>Verificando el link...</p>
              <div style={{ width: 24, height: 24, border: "3px solid #2A2A2A", borderTopColor: O, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "16px auto 0" }} />
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Nueva contraseña</h1>
              <p style={{ color: "#555", fontSize: 14, marginBottom: 24 }}>Elegí una contraseña segura para tu cuenta.</p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#A0A0A0", marginBottom: 6, fontWeight: 600 }}>Nueva contraseña</label>
                  <div style={{ position: "relative" }}>
                    <input style={{ ...inp, paddingRight: 44 }} type={showPwd ? "text" : "password"}
                      placeholder="mínimo 6 caracteres" value={password}
                      onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#555" }}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#A0A0A0", marginBottom: 6, fontWeight: 600 }}>Confirmar contraseña</label>
                  <input style={inp} type="password" placeholder="repetí la contraseña"
                    value={confirm} onChange={e => setConfirm(e.target.value)} required />
                </div>

                {error && (
                  <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                    <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>
                  </div>
                )}

                <button type="submit" disabled={saving}
                  style={{ width: "100%", padding: "14px", borderRadius: 12, fontSize: 15, fontWeight: 700, background: O, color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.7 : 1 }}>
                  {saving && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
                  {saving ? "Guardando..." : "Guardar contraseña"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
