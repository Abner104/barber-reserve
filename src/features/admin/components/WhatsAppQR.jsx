import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle, Wifi, WifiOff, AlertTriangle, Trash2, Monitor } from "lucide-react";

const WA_URL    = import.meta.env.VITE_WA_SERVICE_URL ?? "http://localhost:3001";
const WA_SECRET = "barberos2026secret";
const HEADERS   = { "Content-Type": "application/json", "Authorization": `Bearer ${WA_SECRET}` };

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export default function WhatsAppQR({ barberId, barberName, barberPhone }) {
  const [step, setStep]           = useState("idle"); // idle | loading | qr_ready | connected
  const [qr, setQr]               = useState(null);
  const [error, setError]         = useState(null);
  const [showReset, setShowReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const pollRef  = useRef(null);
  const retryRef = useRef(null);

  function clearTimers() {
    if (pollRef.current)  clearTimeout(pollRef.current);
    if (retryRef.current) clearTimeout(retryRef.current);
  }

  async function checkStatus() {
    try {
      const res  = await fetch(`${WA_URL}/status/${barberId}`, { headers: HEADERS });
      const data = await res.json();
      if (data.status === "connected") setStep("connected");
    } catch {}
  }

  useEffect(() => {
    checkStatus();
    return clearTimers;
  }, [barberId]);

  // Polling cuando está conectado para detectar desconexiones
  useEffect(() => {
    if (step !== "connected") return;
    const id = setInterval(async () => {
      try {
        const res  = await fetch(`${WA_URL}/status/${barberId}`, { headers: HEADERS });
        const data = await res.json();
        if (data.status !== "connected") { setStep("idle"); setQr(null); }
      } catch {}
    }, 30000);
    return () => clearInterval(id);
  }, [step, barberId]);

  async function startSession() {
    clearTimers();
    setStep("loading");
    setError(null);
    setQr(null);
    let attempt = 0;

    async function tryFetch() {
      attempt++;
      try {
        const res  = await fetch(`${WA_URL}/qr/${barberId}`, { headers: HEADERS });
        const data = await res.json();
        if (data.status === "connected") { setStep("connected"); setQr(null); return; }
        if (data.status === "qr_ready" && data.qr) {
          setStep("qr_ready");
          setQr(data.qr);
          // Refrescar QR antes de que expire (25s)
          pollRef.current = setTimeout(startSession, 25000);
          return;
        }
        if (attempt < 10) retryRef.current = setTimeout(tryFetch, Math.min(attempt * 2000, 8000));
        else { setStep("error"); setError("No se pudo generar el QR. Intenta nuevamente."); }
      } catch {
        if (attempt < 10) retryRef.current = setTimeout(tryFetch, Math.min(attempt * 2000, 8000));
        else { setStep("error"); setError("No se puede conectar al servicio de WhatsApp."); }
      }
    }
    tryFetch();
  }

  async function disconnect() {
    clearTimers();
    try { await fetch(`${WA_URL}/session/${barberId}/logout`, { method: "POST", headers: HEADERS }); } catch {}
    setStep("idle"); setQr(null); setError(null);
  }

  async function resetSession() {
    clearTimers();
    setResetting(true);
    try { await fetch(`${WA_URL}/session/${barberId}`, { method: "DELETE", headers: HEADERS }); } catch {}
    setResetting(false); setShowReset(false);
    setStep("idle"); setQr(null); setError(null);
    setTimeout(startSession, 500);
  }

  const isConnected = step === "connected";
  const isLoading   = step === "loading";
  const hasQR       = step === "qr_ready" && qr;

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
          background: isConnected ? "rgba(34,197,94,0.1)" : hasQR ? "rgba(234,179,8,0.1)" : "rgba(113,113,122,0.1)",
          color: isConnected ? "#22c55e" : hasQR ? "#eab308" : "var(--text-faint)",
        }}>
          {isConnected ? "Conectado" : hasQR ? "Escanea el QR" : isLoading ? "Generando..." : "Desconectado"}
        </span>
      </div>

      {/* Error */}
      {step === "error" && error && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(239,68,68,0.08)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <AlertTriangle size={14} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>
        </div>
      )}

      {/* ── AVISO MÓVIL — solo si no está conectado ── */}
      {isMobile && !isConnected && (
        <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Monitor size={18} color="#eab308" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#eab308", margin: "0 0 3px" }}>
              Necesitas un computador
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
              Para conectar WhatsApp debes abrir este panel en una PC o laptop, y escanear el QR con tu celular.
            </p>
          </div>
        </div>
      )}

      {/* ── CONECTADO ── */}
      {isConnected && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            ✅ Recibirás notificaciones automáticas de nuevas reservas.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={disconnect} style={{ fontSize: 12, color: "var(--text-faint)", background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
              Desconectar
            </button>
            <button onClick={() => setShowReset(true)} style={{ fontSize: 12, color: "#ef4444", background: "none", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Trash2 size={11} /> Perdí mi celular
            </button>
          </div>
        </div>
      )}

      {/* ── QR LISTO ── */}
      {hasQR && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            Abre WhatsApp en tu celular → <strong>Dispositivos vinculados</strong> → Escanea este QR
          </p>
          <img src={qr} alt="QR WhatsApp" style={{ width: 200, height: 200, borderRadius: 8, border: "1px solid var(--border)", display: "block", margin: "0 auto" }} />
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>El QR se actualiza automáticamente cada 25 segundos</p>
          <button
            onClick={() => setShowReset(true)}
            style={{ marginTop: 10, fontSize: 12, padding: "6px 14px", borderRadius: 8, background: "none", color: "var(--text-faint)", border: "1px solid var(--border)", cursor: "pointer" }}
          >
            Resetear sesión
          </button>
        </div>
      )}

      {/* ── CARGANDO ── */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <Loader2 size={28} color="var(--brand)" style={{ animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
          <p style={{ fontSize: 12, color: "var(--text-faint)" }}>Generando QR… puede tardar unos segundos</p>
        </div>
      )}

      {/* ── BOTÓN CONECTAR (idle / error) ── */}
      {!isConnected && !isLoading && !hasQR && (
        <button
          onClick={startSession}
          disabled={isMobile}
          style={{
            width: "100%", padding: 11, borderRadius: 9,
            background: isMobile ? "var(--surface)" : "var(--brand)",
            color: isMobile ? "var(--text-faint)" : "#fff",
            fontWeight: 700, fontSize: 13, border: isMobile ? "1px solid var(--border)" : "none",
            cursor: isMobile ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            opacity: isMobile ? 0.6 : 1,
          }}
        >
          <Wifi size={14} /> {isMobile ? "Solo disponible en PC" : "Conectar WhatsApp"}
        </button>
      )}

      {/* ── MODAL RESET ── */}
      {showReset && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowReset(false)}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: 24, maxWidth: 340, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <AlertTriangle size={20} color="#f59e0b" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Resetear sesión</h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
              Se borrará la sesión de WhatsApp. Tendrás que volver a escanear el QR desde un computador.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowReset(false)} style={{ flex: 1, padding: 10, borderRadius: 9, background: "none", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={resetSession} disabled={resetting} style={{ flex: 1, padding: 10, borderRadius: 9, background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {resetting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                {resetting ? "Reseteando..." : "Sí, resetear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
