import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";

const WA_URL = import.meta.env.VITE_WA_SERVICE_URL ?? "http://localhost:3001";

export default function WhatsAppQR({ barberId, barberName }) {
  const [state, setState] = useState({ status: "idle", qr: null, error: null });
  const pollRef = useRef(null);

  const WA_HEADERS = { "bypass-tunnel-reminder": "true" };

  async function fetchQR() {
    setState(s => ({ ...s, status: "loading", error: null }));
    try {
      const res  = await fetch(`${WA_URL}/qr/${barberId}`, { headers: WA_HEADERS });
      const data = await res.json();
      setState({ status: data.status, qr: data.qr, error: null });

      // Si hay QR, volver a pedir en 30s (el QR expira)
      if (data.status === "qr_ready") {
        pollRef.current = setTimeout(fetchQR, 30000);
      }
    } catch {
      setState({ status: "error", qr: null, error: "No se puede conectar al servicio de WhatsApp" });
    }
  }

  async function disconnect() {
    try {
      await fetch(`${WA_URL}/session/${barberId}`, { method: "DELETE", headers: WA_HEADERS });
      setState({ status: "idle", qr: null, error: null });
    } catch {}
  }

  useEffect(() => {
    fetch(`${WA_URL}/status/${barberId}`, { headers: WA_HEADERS })
      .then(r => r.json())
      .then(d => setState(s => ({ ...s, status: d.status })))
      .catch(() => {});

    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [barberId]);

  const isConnected    = state.status === "connected";
  const isLoading      = state.status === "loading" || state.status === "connecting" || state.status === "reconnecting";
  const hasQR          = state.status === "qr_ready" && state.qr;

  return (
    <div style={{ padding: "16px", background: "var(--surface2)", borderRadius: 12, border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isConnected
            ? <CheckCircle size={16} color="#22c55e" />
            : <WifiOff size={16} color="var(--text-faint)" />
          }
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
            WhatsApp — {barberName}
          </span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
          background: isConnected ? "rgba(34,197,94,0.1)" : "rgba(113,113,122,0.1)",
          color: isConnected ? "#22c55e" : "var(--text-faint)",
        }}>
          {isConnected ? "Conectado" : state.status === "qr_ready" ? "Escanea el QR" : "Desconectado"}
        </span>
      </div>

      {/* Conectado */}
      {isConnected && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            ✅ Recibirá notificaciones automáticas de nuevas reservas.
          </p>
          <button onClick={disconnect} style={{ fontSize: 12, color: "var(--text-faint)", background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
            Desconectar
          </button>
        </div>
      )}

      {/* QR listo para escanear */}
      {hasQR && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            Abre WhatsApp → Dispositivos vinculados → Escanea este QR
          </p>
          <img src={state.qr} alt="QR WhatsApp" style={{ width: 200, height: 200, borderRadius: 8, border: "1px solid var(--border)" }} />
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
            El QR expira en 30 segundos
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <Loader2 size={24} color="var(--brand)" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>
            {state.status === "reconnecting" ? "Reconectando..." : "Generando QR..."}
          </p>
        </div>
      )}

      {/* Error */}
      {state.status === "error" && (
        <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>{state.error}</p>
      )}

      {/* Botón conectar (cuando está idle o error) */}
      {!isConnected && !isLoading && !hasQR && (
        <button
          onClick={fetchQR}
          style={{ width: "100%", padding: "10px", borderRadius: 9, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Wifi size={14} /> Conectar WhatsApp
        </button>
      )}

      {/* Botón refrescar QR */}
      {hasQR && (
        <button onClick={fetchQR} style={{ width: "100%", marginTop: 8, padding: "8px", borderRadius: 9, background: "none", color: "var(--text-faint)", fontSize: 12, border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <RefreshCw size={12} /> Refrescar QR
        </button>
      )}
    </div>
  );
}
