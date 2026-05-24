import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle, Wifi, WifiOff, AlertTriangle, Trash2, Phone } from "lucide-react";

const WA_URL    = import.meta.env.VITE_WA_SERVICE_URL ?? "http://localhost:3001";
const WA_SECRET = "barberos2026secret";
const HEADERS   = { "Content-Type": "application/json", "Authorization": `Bearer ${WA_SECRET}` };

export default function WhatsAppQR({ barberId, barberName, barberPhone }) {
  const [error, setError]           = useState(null);
  const [phone, setPhone]           = useState(barberPhone?.replace(/\D/g, "") || "");
  const [code, setCode]             = useState("");
  const [pairingCode, setPairingCode] = useState(""); // código que llega del servidor
  const [step, setStep]             = useState("idle"); // idle | entering_phone | verifying | waiting_code | connected
  const [showReset, setShowReset]   = useState(false);
  const [resetting, setResetting]   = useState(false);
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

  // Paso 1: pedir código al servidor → Baileys lo manda al WhatsApp del barbero
  async function requestCode() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) { setError("Ingresa un número válido"); return; }
    setError(null);
    setStep("verifying");
    try {
      const res  = await fetch(`${WA_URL}/pair/request`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ barberId, phone: digits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al solicitar código");

      // El código llega al WhatsApp del barbero — también lo mostramos aquí por si acaso
      setPairingCode(data.code || "");
      setStep("waiting_code");

      // Polling: detectar cuando el barbero ingresa el código y conecta
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`${WA_URL}/status/${barberId}`, { headers: HEADERS });
          const d = await r.json();
          if (d.status === "connected") {
            clearInterval(pollRef.current);
            setStep("connected");
            setPairingCode("");
            setCode("");
          }
        } catch {}
      }, 3000);
    } catch (e) {
      setError(e.message);
      setStep("entering_phone");
    }
  }

  // Paso 2 (opcional): el barbero también puede ingresar el código manualmente aquí
  async function confirmCode() {
    const trimmed = code.trim().replace("-", "");
    if (trimmed.length < 8) { setError("El código debe tener 8 caracteres"); return; }
    setError(null);
    setStep("verifying");
    try {
      const res  = await fetch(`${WA_URL}/pair/confirm`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ barberId, code: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Código incorrecto");
      clearInterval(pollRef.current);
      setStep("connected");
      setCode(""); setPairingCode("");
    } catch (e) {
      setError(e.message);
      setStep("waiting_code");
    }
  }

  async function disconnect() {
    try { await fetch(`${WA_URL}/session/${barberId}/logout`, { method: "POST", headers: HEADERS }); } catch {}
    clearInterval(pollRef.current);
    setStep("idle"); setCode(""); setPairingCode(""); setError(null);
  }

  async function resetSession() {
    setResetting(true);
    try { await fetch(`${WA_URL}/session/${barberId}`, { method: "DELETE", headers: HEADERS }); } catch {}
    clearInterval(pollRef.current);
    setResetting(false); setShowReset(false);
    setStep("idle"); setCode(""); setPairingCode(""); setError(null);
  }

  const isConnected = step === "connected";
  const isLoading   = step === "verifying";
  const phoneDisplay = phone.startsWith("56") ? `+${phone}` : phone ? `+56${phone}` : "";

  return (
    <div style={{ padding: 16, background: "var(--surface2)", borderRadius: 12, border: "1px solid var(--border)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isConnected ? <CheckCircle size={16} color="#22c55e" /> : <WifiOff size={16} color="var(--text-faint)" />}
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>WhatsApp</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
          background: isConnected ? "rgba(34,197,94,0.1)" : step === "waiting_code" ? "rgba(234,179,8,0.1)" : "rgba(113,113,122,0.1)",
          color: isConnected ? "#22c55e" : step === "waiting_code" ? "#eab308" : "var(--text-faint)",
        }}>
          {isConnected ? "Conectado" : step === "waiting_code" ? "Esperando código" : isLoading ? "Conectando..." : "Desconectado"}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(239,68,68,0.08)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <AlertTriangle size={14} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>
        </div>
      )}

      {/* ── CONECTADO ── */}
      {isConnected && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            ✅ Recibirás notificaciones automáticas de nuevas reservas por WhatsApp.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={disconnect} style={{ fontSize: 12, color: "var(--text-faint)", background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
              Desconectar
            </button>
            <button onClick={() => setShowReset(true)} style={{ fontSize: 12, color: "#ef4444", background: "none", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Trash2 size={11} /> Cambiar número
            </button>
          </div>
        </div>
      )}

      {/* ── IDLE ── */}
      {step === "idle" && (
        <button
          onClick={() => { setStep("entering_phone"); setError(null); }}
          style={{ width: "100%", padding: 11, borderRadius: 9, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Wifi size={14} /> Conectar WhatsApp
        </button>
      )}

      {/* ── PASO 1: ingresar número ── */}
      {step === "entering_phone" && (
        <div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
            Ingresa tu número de WhatsApp. Te llegará un código de verificación.
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
              autoFocus
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

      {/* ── PASO 2: ingresar código que llegó al WhatsApp ── */}
      {step === "waiting_code" && (
        <div>
          <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#eab308", margin: "0 0 4px" }}>
              📱 Código enviado a {phoneDisplay}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
              Abre WhatsApp — te llegó un mensaje con un código de 8 dígitos. Ingrésalo aquí:
            </p>
          </div>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
            placeholder="XXXX-XXXX"
            maxLength={9}
            autoFocus
            style={{ width: "100%", padding: "14px", borderRadius: 9, border: "2px solid var(--brand)", background: "var(--surface)", color: "var(--text)", fontSize: 24, fontWeight: 700, letterSpacing: 6, textAlign: "center", outline: "none", marginBottom: 10, boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { clearInterval(pollRef.current); setStep("entering_phone"); setCode(""); setPairingCode(""); setError(null); }}
              style={{ flex: 1, padding: 10, borderRadius: 9, background: "none", border: "1px solid var(--border)", color: "var(--text-faint)", fontSize: 13, cursor: "pointer" }}
            >
              Atrás
            </button>
            <button
              onClick={confirmCode}
              style={{ flex: 2, padding: 10, borderRadius: 9, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}
            >
              Confirmar
            </button>
          </div>
          {pairingCode && (
            <p style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "center", marginTop: 10 }}>
              ¿No te llegó? El código es: <strong style={{ color: "var(--text)" }}>{pairingCode}</strong>
            </p>
          )}
        </div>
      )}

      {/* ── CARGANDO ── */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <Loader2 size={28} color="var(--brand)" style={{ animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
          <p style={{ fontSize: 12, color: "var(--text-faint)" }}>Enviando código a tu WhatsApp…</p>
        </div>
      )}

      {/* ── MODAL RESET ── */}
      {showReset && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowReset(false)}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: 24, maxWidth: 340, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <AlertTriangle size={20} color="#f59e0b" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Cambiar número de WhatsApp</h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
              Se desconectará tu WhatsApp actual. Tendrás que volver a conectar con el número nuevo.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowReset(false)} style={{ flex: 1, padding: 10, borderRadius: 9, background: "none", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={resetSession} disabled={resetting} style={{ flex: 1, padding: 10, borderRadius: 9, background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {resetting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                {resetting ? "Desconectando..." : "Sí, cambiar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
