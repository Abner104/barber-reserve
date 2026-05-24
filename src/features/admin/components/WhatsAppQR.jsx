import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle, Wifi, WifiOff, AlertTriangle, Trash2, Phone } from "lucide-react";

const WA_URL    = import.meta.env.VITE_WA_SERVICE_URL ?? "http://localhost:3001";
const WA_SECRET = "barberos2026secret";
const HEADERS   = { "Content-Type": "application/json", "Authorization": `Bearer ${WA_SECRET}` };

export default function WhatsAppQR({ barberId, barberName, barberPhone }) {
  const [status, setStatus]     = useState("idle");
  const [error, setError]       = useState(null);
  const [phone, setPhone]       = useState(barberPhone?.replace(/\D/g, "") || "");
  const [code, setCode]         = useState("");
  const [step, setStep]         = useState("idle"); // idle | entering_phone | waiting_code | verifying | connected
  const [showReset, setShowReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const pollRef = useRef(null);

  async function checkStatus() {
    try {
      const res  = await fetch(`${WA_URL}/status/${barberId}`, { headers: HEADERS });
      const data = await res.json();
      if (data.status === "connected") setStep("connected");
    } catch {}
  }

  useEffect(() => {
    checkStatus();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [barberId]);

  // Paso 1: solicitar código al número
  async function requestCode() {
    if (!phone || phone.length < 8) {
      setError("Ingresa un número válido");
      return;
    }
    setError(null);
    setStep("verifying");
    try {
      const res  = await fetch(`${WA_URL}/pair/request`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ barberId, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al solicitar código");
      // Mostrar el código generado por Baileys para que el barbero lo ingrese en su WhatsApp
      if (data.code) setCode(data.code);
      setStep("waiting_code");
      // Polling para detectar si ya se conectó automáticamente
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`${WA_URL}/status/${barberId}`, { headers: HEADERS });
          const d = await r.json();
          if (d.status === "connected") {
            clearInterval(pollRef.current);
            setStep("connected");
            setCode("");
          }
        } catch {}
      }, 3000);
    } catch (e) {
      setError(e.message);
      setStep("entering_phone");
    }
  }

  // Paso 2: confirmar con el código recibido
  async function confirmCode() {
    if (code.trim().length < 8) {
      setError("El código debe tener 8 caracteres");
      return;
    }
    setError(null);
    setStep("verifying");
    try {
      const res  = await fetch(`${WA_URL}/pair/confirm`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ barberId, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Código incorrecto");
      setStep("connected");
      setCode("");
      if (pollRef.current) clearInterval(pollRef.current);
    } catch (e) {
      setError(e.message);
      setStep("waiting_code");
    }
  }

  async function disconnect() {
    try {
      await fetch(`${WA_URL}/session/${barberId}/logout`, { method: "POST", headers: HEADERS });
    } catch {}
    if (pollRef.current) clearInterval(pollRef.current);
    setStep("idle");
    setCode("");
    setError(null);
  }

  async function resetSession() {
    setResetting(true);
    try {
      await fetch(`${WA_URL}/session/${barberId}`, { method: "DELETE", headers: HEADERS });
    } catch {}
    if (pollRef.current) clearInterval(pollRef.current);
    setResetting(false);
    setShowReset(false);
    setStep("idle");
    setCode("");
    setError(null);
  }

  const isConnected = step === "connected";
  const isLoading   = step === "verifying";

  // Formatear número para display
  const phoneDisplay = phone.startsWith("56") ? `+${phone}` : phone ? `+56${phone}` : "";

  return (
    <div style={{ padding: 16, background: "var(--surface2)", borderRadius: 12, border: "1px solid var(--border)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isConnected ? <CheckCircle size={16} color="#22c55e" /> : <WifiOff size={16} color="var(--text-faint)" />}
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>WhatsApp — {barberName}</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
          background: isConnected ? "rgba(34,197,94,0.1)" : "rgba(113,113,122,0.1)",
          color: isConnected ? "#22c55e" : "var(--text-faint)",
        }}>
          {isConnected ? "Conectado" : step === "waiting_code" ? "Esperando código" : step === "verifying" ? "Verificando..." : "Desconectado"}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(239,68,68,0.08)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <AlertTriangle size={14} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>
        </div>
      )}

      {/* CONECTADO */}
      {isConnected && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            ✅ Recibirá notificaciones automáticas de nuevas reservas.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={disconnect} style={{ fontSize: 12, color: "var(--text-faint)", background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
              Desconectar
            </button>
            <button onClick={() => setShowReset(true)} style={{ fontSize: 12, color: "#ef4444", background: "none", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Trash2 size={11} /> Cambiar celular
            </button>
          </div>
        </div>
      )}

      {/* IDLE — botón inicial */}
      {step === "idle" && (
        <button
          onClick={() => { setStep("entering_phone"); setError(null); }}
          style={{ width: "100%", padding: 11, borderRadius: 9, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Wifi size={14} /> Conectar WhatsApp
        </button>
      )}

      {/* PASO 1 — ingresar número */}
      {step === "entering_phone" && (
        <div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
            Ingresa el número de WhatsApp del barbero. Le llegará un código de 8 dígitos por WhatsApp.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 9, padding: "0 10px", fontSize: 13, color: "var(--text-faint)", flexShrink: 0 }}>
              🇨🇱 +56
            </div>
            <input
              type="tel"
              value={phone.startsWith("56") ? phone.slice(2) : phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="9 1234 5678"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14, outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep("idle")} style={{ flex: 1, padding: 10, borderRadius: 9, background: "none", border: "1px solid var(--border)", color: "var(--text-faint)", fontSize: 13, cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={requestCode} style={{ flex: 2, padding: 10, borderRadius: 9, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Phone size={13} /> Enviar código
            </button>
          </div>
        </div>
      )}

      {/* PASO 2 — ingresar código */}
      {step === "waiting_code" && (
        <div>
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: "#22c55e", margin: 0, fontWeight: 600 }}>
              ✅ Código generado para {phoneDisplay}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              El barbero debe abrir WhatsApp → Dispositivos vinculados → Vincular con número de teléfono → e ingresar este código:
            </p>
          </div>
          {/* Código generado — mostrar en grande para que el barbero lo vea */}
          <div style={{ background: "var(--surface)", border: "2px dashed var(--brand)", borderRadius: 12, padding: "16px", textAlign: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1 }}>Código de vinculación</p>
            <p style={{ fontSize: 32, fontWeight: 900, color: "var(--brand)", letterSpacing: 6, margin: 0, fontFamily: "monospace" }}>{code || "———————"}</p>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "center", marginBottom: 10 }}>
            Esperando que el barbero lo ingrese en WhatsApp…
          </p>
          <button onClick={() => { setStep("entering_phone"); setCode(""); setError(null); if (pollRef.current) clearInterval(pollRef.current); }} style={{ width: "100%", padding: 10, borderRadius: 9, background: "none", border: "1px solid var(--border)", color: "var(--text-faint)", fontSize: 13, cursor: "pointer" }}>
            Cancelar y volver
          </button>
        </div>
      )}

      {/* Cargando */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <Loader2 size={28} color="var(--brand)" style={{ animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
          <p style={{ fontSize: 12, color: "var(--text-faint)" }}>
            {step === "verifying" && code ? "Verificando código..." : "Enviando código a WhatsApp..."}
          </p>
        </div>
      )}

      {/* Modal reset */}
      {showReset && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowReset(false)}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: 24, maxWidth: 340, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <AlertTriangle size={20} color="#f59e0b" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Cambiar celular vinculado</h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
              Se desvinculará WhatsApp de <strong>{barberName}</strong>. Tendrás que volver a conectar con el número nuevo.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowReset(false)} style={{ flex: 1, padding: 10, borderRadius: 9, background: "none", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={resetSession} disabled={resetting} style={{ flex: 1, padding: 10, borderRadius: 9, background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {resetting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                {resetting ? "Reseteando..." : "Sí, desvincular"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
