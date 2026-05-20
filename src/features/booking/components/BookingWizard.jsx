import { Link } from "react-router-dom";
import { Scissors, ArrowLeft, Check, X } from "lucide-react";
import { useState } from "react";
import { useBookingStore } from "../../../store/bookingStore";
import StepType from "./steps/StepType";
import StepService from "./steps/StepService";
import StepBarber from "./steps/StepBarber";
import StepDateTime from "./steps/StepDateTime";
import StepAddress from "./steps/StepAddress";
import StepConfirm from "./steps/StepConfirm";
import StepSuccess from "./steps/StepSuccess";
import BookingSummaryPanel from "./BookingSummaryPanel";

const O = "var(--brand)";
const STEPS = ["Tipo", "Servicio", "Barbero", "Fecha", "Dirección", "Confirmar"];

export default function BookingWizard({ slug, shopName, shopLogo }) {
  const { step, type } = useBookingStore();
  const backUrl = slug ? `/${slug}` : "/";
  const [summaryOpen, setSummaryOpen] = useState(false);

  if (step === 7) return <StepSuccess slug={slug} />;

  const visibleSteps = type === "delivery" ? STEPS : STEPS.filter((_, i) => i !== 4);
  const totalSteps   = visibleSteps.length;
  const progress     = Math.round(((step - 1) / (totalSteps - 1)) * 100);
  const confirmStep  = type === "delivery" ? 6 : 5;

  return (
    <>
      <style>{`
        .wizard-layout { display: flex; min-height: 100vh; background: var(--bg, #0A0A0A); }
        .wizard-sidebar { width: 280px; background: var(--surface, #141414); border-right: 1px solid var(--border, #2A2A2A); padding: 32px 24px; display: flex; flex-direction: column; flex-shrink: 0; }
        .wizard-main { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--bg, #0A0A0A); }
        .wizard-mobile-header { display: none; }
        .wizard-content { flex: 1; overflow-y: auto; }
        .wizard-inner { max-width: 540px; margin: 0 auto; padding: 40px 24px; }
        .summary-drawer { display: none; }

        @media (max-width: 768px) {
          .wizard-sidebar { display: none; }
          .wizard-mobile-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border, #2A2A2A); background: var(--surface, #141414); position: sticky; top: 0; z-index: 10; }
          .wizard-inner { padding: 28px 20px; }
          .summary-drawer {
            display: block;
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
            background: var(--surface, #141414); border-top: 1px solid var(--border, #2A2A2A);
            padding: 16px 20px;
            transform: translateY(100%);
            transition: transform 0.3s ease;
          }
          .summary-drawer.open { transform: translateY(0); }
          .summary-toggle {
            display: flex; align-items: center; justify-content: center; gap: 8px;
            width: 100%; padding: 12px; border-radius: 12px;
            background: var(--brand-alpha, rgba(255,107,44,0.1)); border: 1px solid var(--brand-alpha, rgba(255,107,44,0.3));
            color: var(--brand); font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 20px;
          }
          .wizard-content { padding-bottom: 80px; }
        }
      `}</style>

      <div className="wizard-layout">

        {/* ── SIDEBAR desktop ── */}
        <div className="wizard-sidebar">
          <Link to={backUrl} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, textDecoration: "none" }}>
            {shopLogo
              ? <img src={shopLogo} alt={shopName} style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover" }} />
              : <div style={{ width: 34, height: 34, background: O, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}><Scissors size={16} color="#fff" /></div>
            }
            <span style={{ fontWeight: 800, fontSize: 18, color: "var(--text)", letterSpacing: -0.5 }}>{shopName ?? "Reservar"}</span>
          </Link>

          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 28 }}>
            {visibleSteps.map((label, i) => {
              const realStep = type === "delivery" ? i + 1 : i >= 4 ? i + 2 : i + 1;
              const done = step > realStep;
              const active = step === realStep;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 10, background: active ? "var(--brand-alpha, rgba(255,107,44,0.1))" : "transparent" }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                    background: done ? O : active ? "transparent" : "var(--surface2, #1E1E1E)",
                    border: active ? `2px solid ${O}` : done ? "none" : "1px solid var(--border, #2A2A2A)",
                    color: done ? "#fff" : active ? O : "var(--text-faint, #555)",
                  }}>
                    {done ? <Check size={12} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: active ? "var(--text)" : done ? O : "var(--text-faint, #555)" }}>{label}</span>
                </div>
              );
            })}
          </div>

          <BookingSummaryPanel />

          <Link to={backUrl} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-faint)", fontSize: 12, textDecoration: "none", marginTop: "auto" }}>
            <ArrowLeft size={13} /> Volver al inicio
          </Link>
        </div>

        {/* ── MAIN ── */}
        <div className="wizard-main">

          {/* Header móvil */}
          <div className="wizard-mobile-header">
            <Link to={backUrl} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              {shopLogo
                ? <img src={shopLogo} alt={shopName} style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
                : <div style={{ width: 28, height: 28, background: O, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><Scissors size={13} color="#fff" /></div>
              }
              <span style={{ fontWeight: 800, color: "var(--text)", fontSize: 15 }}>{shopName ?? "Reservar"}</span>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
                <span style={{ color: O, fontWeight: 700 }}>{step}</span>/{totalSteps}
              </span>
            </div>
          </div>

          {/* Barra de progreso */}
          <div style={{ height: 3, background: "var(--surface2)" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: O, transition: "width 0.4s ease" }} />
          </div>

          {/* Contenido */}
          <div className="wizard-content">
            <div className="wizard-inner">
              {/* Botón resumen (solo móvil) */}
              {type && (
                <button className="summary-toggle" onClick={() => setSummaryOpen(true)}>
                  Ver mi reserva ↑
                </button>
              )}

              {step === 1 && <StepType />}
              {step === 2 && <StepService />}
              {step === 3 && <StepBarber />}
              {step === 4 && <StepDateTime />}
              {step === 5 && type === "delivery" && <StepAddress />}
              {step === confirmStep && <StepConfirm />}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer resumen móvil */}
      <div className={`summary-drawer ${summaryOpen ? "open" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>Tu reserva</span>
          <button onClick={() => setSummaryOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}>
            <X size={20} />
          </button>
        </div>
        <BookingSummaryPanel />
      </div>

      {/* Overlay */}
      {summaryOpen && (
        <div
          onClick={() => setSummaryOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 49 }}
        />
      )}
    </>
  );
}
