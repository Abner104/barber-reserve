import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

const WA_URL = import.meta.env.VITE_WA_SERVICE_URL ?? "http://localhost:3001";

export default function WhatsAppStatus({ barberId }) {
  const [status, setStatus] = useState("unknown");

  useEffect(() => {
    fetch(`${WA_URL}/status/${barberId}`, { headers: { "bypass-tunnel-reminder": "true" } })
      .then(r => r.json())
      .then(d => setStatus(d.status))
      .catch(() => setStatus("offline"));
  }, [barberId]);

  const config = {
    connected:    { label: "WS Conectado",     color: "#22c55e", bg: "rgba(34,197,94,0.1)"  },
    qr_ready:     { label: "Esperando QR",     color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    reconnecting: { label: "Reconectando...",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    logged_out:   { label: "Sesión cerrada",   color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
    not_started:  { label: "Sin conectar",     color: "#555",    bg: "var(--surface2)"       },
    offline:      { label: "Servicio offline", color: "#555",    bg: "var(--surface2)"       },
    unknown:      { label: "Verificando...",   color: "#555",    bg: "var(--surface2)"       },
  };

  const c = config[status] ?? config.unknown;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <MessageCircle size={14} color={c.color} />
      <span style={{ fontSize: 12, color: c.color, fontWeight: 600 }}>{c.label}</span>
      {status !== "connected" && (
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
          — El barbero conecta desde su perfil
        </span>
      )}
    </div>
  );
}
