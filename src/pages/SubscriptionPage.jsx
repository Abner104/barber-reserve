import { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { formatCurrency } from "../lib/utils";
import { Zap, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";

const VPS = import.meta.env.VITE_VPS_URL || "http://31.97.218.107:3001";
const O   = "#FF6B2C";

export default function SubscriptionPage() {
  const profile = useAuthStore(s => s.profile);
  const shopId  = profile?.shop_id;

  const [status,   setStatus]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [paying,   setPaying]   = useState(false);
  const [error,    setError]    = useState("");

  const params = new URLSearchParams(window.location.search);
  const paymentResult = params.get("payment");

  useEffect(() => {
    if (!shopId) { setLoading(false); return; }
    fetch(`${VPS}/subscription-status/${shopId}`)
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setError("No se pudo verificar el estado del plan"))
      .finally(() => setLoading(false));
  }, [shopId]);

  async function handlePay() {
    setPaying(true);
    setError("");
    try {
      const res = await fetch(`${VPS}/create-payment`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id:     shopId,
          shop_name:   profile?.shop_name ?? "Barbería",
          owner_email: profile?.email ?? "",
        }),
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        setError(data.error || "Error al crear el pago");
      }
    } catch (e) {
      setError("No se pudo conectar con el servidor de pagos");
    } finally {
      setPaying(false);
    }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={32} color={O} style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 480, width: "100%" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img src="/LogoC.png" alt="Clippr" style={{ width: 72, height: 72, objectFit: "contain", filter: "drop-shadow(0 0 24px rgba(255,107,44,.6))", marginBottom: 12 }} />
          <p style={{ fontWeight: 900, fontSize: 22, color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: -0.5 }}>Clippr</p>
        </div>

        {/* Resultado de pago */}
        {paymentResult === "success" && (
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 16, padding: 24, textAlign: "center", marginBottom: 24 }}>
            <CheckCircle size={40} color="#22c55e" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 18, fontWeight: 800, color: "#22c55e", marginBottom: 6 }}>¡Pago exitoso!</p>
            <p style={{ fontSize: 14, color: "#555" }}>Tu plan Pro está activo por 30 días más.</p>
            <a href="/admin" style={{ display: "inline-block", marginTop: 16, padding: "10px 24px", background: O, color: "#fff", borderRadius: 10, fontWeight: 700, textDecoration: "none" }}>
              Ir al panel
            </a>
          </div>
        )}

        {paymentResult === "failure" && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 16, padding: 20, textAlign: "center", marginBottom: 24 }}>
            <AlertCircle size={32} color="#ef4444" style={{ margin: "0 auto 10px" }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: "#ef4444" }}>El pago no se procesó</p>
            <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>Intenta de nuevo o usa otro método de pago.</p>
          </div>
        )}

        {/* Card principal */}
        <div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 20, padding: 32 }}>

          {status?.trial_active ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <Clock size={20} color="#f59e0b" />
                <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Trial activo</p>
              </div>
              <p style={{ fontSize: 14, color: "#555", marginBottom: 24, lineHeight: 1.6 }}>
                Te quedan <strong style={{ color: "#f59e0b" }}>{status.days_left} días</strong> de prueba gratis. Cuando venza, necesitarás activar el plan Pro para seguir usando Clippr.
              </p>
              <div style={{ background: "#0A0A0A", borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <p style={{ fontSize: 11, color: "#444", marginBottom: 4, fontWeight: 700, letterSpacing: 1 }}>PLAN PRO</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>{formatCurrency(status?.price ?? 11990)}<span style={{ fontSize: 13, color: "#444", fontWeight: 400 }}>/mes</span></p>
              </div>
              <button onClick={handlePay} disabled={paying}
                style={{ width: "100%", padding: "14px", borderRadius: 12, background: O, color: "#fff", fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: paying ? 0.7 : 1, boxShadow: `0 0 30px rgba(255,107,44,.3)` }}>
                {paying ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={18} />}
                {paying ? "Redirigiendo..." : "Activar plan Pro ahora"}
              </button>
              <p style={{ fontSize: 11, color: "#333", textAlign: "center", marginTop: 12 }}>Pago seguro con Mercado Pago · Se renueva cada 30 días</p>
            </>
          ) : status?.pro_active ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <CheckCircle size={20} color="#22c55e" />
                <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Plan Pro activo</p>
              </div>
              <p style={{ fontSize: 14, color: "#555", marginBottom: 24 }}>
                Tu plan vence en <strong style={{ color: "#22c55e" }}>{status.days_left} días</strong>.
              </p>
              <button onClick={handlePay} disabled={paying}
                style={{ width: "100%", padding: "13px", borderRadius: 12, background: "#141414", color: "#666", fontWeight: 700, fontSize: 14, border: "1px solid #222", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {paying ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
                Renovar anticipadamente
              </button>
              <div style={{ marginTop: 16, textAlign: "center" }}>
                <a href="/admin" style={{ color: O, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Volver al panel →</a>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <AlertCircle size={20} color="#ef4444" />
                <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Tu plan venció</p>
              </div>
              <p style={{ fontSize: 14, color: "#555", marginBottom: 24, lineHeight: 1.6 }}>
                Tu acceso a Clippr está suspendido. Activa el plan Pro para volver a recibir reservas.
              </p>
              <div style={{ background: "#0A0A0A", borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <p style={{ fontSize: 11, color: "#444", marginBottom: 4, fontWeight: 700, letterSpacing: 1 }}>PLAN PRO · MENSUAL</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: O }}>{formatCurrency(11990)}<span style={{ fontSize: 13, color: "#444", fontWeight: 400 }}>/mes</span></p>
                <p style={{ fontSize: 11, color: "#444", marginTop: 4 }}>+ $2.990 por cada barbero adicional desde el 3ro</p>
              </div>
              {["Reservas online 24/7", "Portal del barbero", "Domicilios con mapa", "Caja y comisiones", "Soporte por WhatsApp"].map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <CheckCircle size={13} color={O} />
                  <span style={{ fontSize: 13, color: "#666" }}>{f}</span>
                </div>
              ))}
              <button onClick={handlePay} disabled={paying}
                style={{ width: "100%", marginTop: 24, padding: "15px", borderRadius: 12, background: O, color: "#fff", fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: paying ? 0.7 : 1, boxShadow: `0 0 40px rgba(255,107,44,.4)` }}>
                {paying ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={18} />}
                {paying ? "Redirigiendo a Mercado Pago..." : "Activar plan Pro"}
              </button>
              <p style={{ fontSize: 11, color: "#333", textAlign: "center", marginTop: 12 }}>Pago seguro · Se activa en segundos</p>
            </>
          )}

          {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 16, textAlign: "center" }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
