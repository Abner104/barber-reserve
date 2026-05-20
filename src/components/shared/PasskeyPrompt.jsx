/**
 * Modal que aparece después del primer login preguntando si quiere activar passkey
 */
import { useState } from "react";
import { Fingerprint, X, Loader2 } from "lucide-react";
import { registerPasskey, isSupported } from "../../lib/passkey";
import { toast } from "sonner";

const O = "#FF6B2C";

export default function PasskeyPrompt({ userId, userEmail, onClose }) {
  const [loading, setLoading] = useState(false);

  if (!isSupported()) return null;

  async function handleRegister() {
    setLoading(true);
    try {
      await registerPasskey(userId, userEmail);
      localStorage.setItem("clippr_passkey_registered", "1");
      toast.success("¡Huella registrada! La próxima vez entra en 1 segundo 🔐");
      onClose();
    } catch (e) {
      toast.error(e.message || "No se pudo registrar la huella");
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    localStorage.setItem("clippr_passkey_skipped", "1");
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#141414", border: "1px solid #222", borderRadius: "20px 20px 20px 20px", padding: 28, width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(255,107,44,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Fingerprint size={28} color={O} />
          </div>
          <button onClick={handleSkip} style={{ background: "none", border: "none", cursor: "pointer", color: "#555" }}>
            <X size={20} />
          </button>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
          Entra más rápido
        </h2>
        <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 24 }}>
          Activa huella o Face ID para entrar al panel con un toque, sin escribir tu contraseña.
        </p>

        <button
          onClick={handleRegister}
          disabled={loading}
          style={{ width: "100%", padding: "14px", borderRadius: 12, background: O, color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10, opacity: loading ? 0.7 : 1, boxShadow: "0 0 30px rgba(255,107,44,0.3)" }}
        >
          {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Fingerprint size={18} />}
          {loading ? "Registrando..." : "Activar huella / Face ID"}
        </button>

        <button
          onClick={handleSkip}
          style={{ width: "100%", padding: "12px", borderRadius: 12, background: "none", border: "1px solid #222", color: "#555", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
