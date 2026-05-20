import { useState, useEffect } from "react";
import { ArrowRight, X, CheckCircle } from "lucide-react";

const O = "var(--brand, #FF6B2C)";

// ── TOUR DEL BARBERO ─────────────────────────────────────────
const BARBER_STEPS = [
  {
    title: "¡Bienvenido a tu panel! ✂️",
    desc:  "En 3 pasos tienes tu agenda lista para recibir reservas.",
    icon:  "💈",
    target: null,
    action: null,
  },
  {
    title: "1. Configura tu horario",
    desc:  "Activa los días que trabajas y selecciona las horas disponibles. Los clientes solo pueden reservar en esos horarios.",
    icon:  "🗓️",
    target: "/barber",
    action: "Ir a Mi Agenda",
  },
  {
    title: "2. Conecta WhatsApp",
    desc:  "Ve a Mi Perfil → Conectar WhatsApp → escanea el QR con tu celular. Así recibirás alertas de cada reserva al instante.",
    icon:  "📱",
    target: "/barber/perfil",
    action: "Ir a Mi Perfil",
  },
  {
    title: "3. Sube tu portafolio",
    desc:  "Ve a Mis Trabajos y sube fotos de tus mejores cortes. Los clientes las verán antes de reservar contigo.",
    icon:  "📸",
    target: "/barber/portfolio",
    action: "Ir a Mis Trabajos",
  },
  {
    title: "¡Todo listo! 🚀",
    desc:  "Ya puedes recibir reservas. Cuando llegue una te va a llegar por WhatsApp y suena una notificación aquí.",
    icon:  "🎉",
    target: null,
    action: null,
  },
];

let _barberTourVisible = false;
let _barberTourListeners = [];

function setBarberTourVisible(val) {
  _barberTourVisible = val;
  _barberTourListeners.forEach(fn => fn(val));
}

export function useBarberTour() {
  const [show, setShow] = useState(_barberTourVisible);

  useEffect(() => {
    _barberTourListeners.push(setShow);
    return () => { _barberTourListeners = _barberTourListeners.filter(fn => fn !== setShow); };
  }, []);

  useEffect(() => {
    const done = localStorage.getItem("clippr_barber_tour_done");
    if (!done && !_barberTourVisible) {
      const t = setTimeout(() => setBarberTourVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  return { show, close: () => setBarberTourVisible(false) };
}

export function BarberOnboardingTour({ onClose }) {
  const [step, setStep] = useState(0);
  const current = BARBER_STEPS[step];
  const isLast  = step === BARBER_STEPS.length - 1;

  function next() {
    if (isLast) { localStorage.setItem("clippr_barber_tour_done", "1"); onClose(); }
    else setStep(s => s + 1);
  }

  function goTo(url) {
    localStorage.setItem("clippr_barber_tour_done", "1");
    onClose();
    window.location.href = url;
  }

  function skip() { localStorage.setItem("clippr_barber_tour_done", "1"); onClose(); }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--card-bg, #141414)", border: "1px solid var(--border, #2A2A2A)", borderRadius: 24, padding: 32, width: "100%", maxWidth: 400, position: "relative" }}>

        <button onClick={skip} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--text-faint, #555)" }}>
          <X size={18} />
        </button>

        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {BARBER_STEPS.map((_, i) => (
            <div key={i} style={{ flex: i === step ? 2 : 1, height: 4, borderRadius: 2, background: i <= step ? O : "var(--border, #2A2A2A)", transition: "all 0.3s" }} />
          ))}
        </div>

        <div style={{ fontSize: 44, marginBottom: 14, textAlign: "center" }}>{current.icon}</div>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: "var(--text, #fff)", marginBottom: 10, textAlign: "center" }}>{current.title}</h2>
        <p style={{ fontSize: 14, color: "var(--text-faint, #666)", lineHeight: 1.7, textAlign: "center", marginBottom: 24 }}>{current.desc}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {current.action && current.target && (
            <button onClick={() => goTo(current.target)}
              style={{ width: "100%", padding: "13px", borderRadius: 12, background: O, color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {current.action} <ArrowRight size={16} />
            </button>
          )}
          <button onClick={next}
            style={{ width: "100%", padding: "12px", borderRadius: 12, background: "var(--surface2, #1E1E1E)", border: "1px solid var(--border, #2A2A2A)", color: "var(--text-muted, #A0A0A0)", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {isLast ? <><CheckCircle size={15} color="#22c55e" /> ¡Entendido!</> : current.action ? "Saltar →" : <>Siguiente <ArrowRight size={15} /></>}
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-faint, #444)", marginTop: 14 }}>{step + 1} de {BARBER_STEPS.length}</p>
      </div>
    </div>
  );
}

const STEPS = [
  {
    title: "¡Bienvenido a Clippr! 🎉",
    desc:  "Vamos a configurar tu barbería en 5 pasos. Solo toma unos minutos.",
    icon:  "✂️",
    target: null,
    action: null,
  },
  {
    title: "1. Configura tu barbería",
    desc:  "Ve a Config y pon el nombre, logo, color y dirección de tu barbería. Esto es lo que verán tus clientes.",
    icon:  "⚙️",
    target: "/admin/settings",
    action: "Ir a Config",
  },
  {
    title: "2. Crea tus servicios",
    desc:  "Ve a Servicios y agrega lo que ofreces: corte, barba, fade, etc. Con precio y duración.",
    icon:  "✂️",
    target: "/admin/services",
    action: "Ir a Servicios",
  },
  {
    title: "3. Agrega tus barberos",
    desc:  "Ve a Barberos y créate a ti mismo (o a tu equipo). Si eres independiente elige el modelo 'Independiente'.",
    icon:  "👤",
    target: "/admin/barbers",
    action: "Ir a Barberos",
  },
  {
    title: "4. Conecta WhatsApp",
    desc:  "En el perfil del barbero conecta tu WhatsApp con QR. Así recibirás alertas de cada reserva nueva.",
    icon:  "📱",
    target: "/barber/perfil",
    action: "Ir a Mi perfil",
  },
  {
    title: "5. ¡Listo para recibir reservas!",
    desc:  "Comparte tu link con tus clientes y empieza a recibir reservas. Puedes verlo en el botón 'Ver mi página'.",
    icon:  "🚀",
    target: null,
    action: null,
  },
];

export default function OnboardingTour({ onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const isFirst = step === 0;

  function next() {
    if (isLast) {
      localStorage.setItem("clippr_tour_done", "1");
      onClose();
    } else {
      setStep(s => s + 1);
    }
  }

  function goTo(url) {
    localStorage.setItem("clippr_tour_done", "1");
    onClose();
    window.location.href = url;
  }

  function skip() {
    localStorage.setItem("clippr_tour_done", "1");
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--card-bg, #141414)", border: "1px solid var(--border, #2A2A2A)", borderRadius: 24, padding: 32, width: "100%", maxWidth: 440, position: "relative" }}>

        {/* Cerrar */}
        <button onClick={skip} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--text-faint, #555)" }}>
          <X size={18} />
        </button>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: i === step ? 2 : 1, height: 4, borderRadius: 2, background: i <= step ? O : "var(--border, #2A2A2A)", transition: "all 0.3s" }} />
          ))}
        </div>

        {/* Ícono */}
        <div style={{ fontSize: 48, marginBottom: 16, textAlign: "center" }}>{current.icon}</div>

        {/* Contenido */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text, #fff)", marginBottom: 10, textAlign: "center" }}>
          {current.title}
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-faint, #666)", lineHeight: 1.7, textAlign: "center", marginBottom: 28 }}>
          {current.desc}
        </p>

        {/* Botones */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {current.action && current.target && (
            <button
              onClick={() => goTo(current.target)}
              style={{ width: "100%", padding: "13px", borderRadius: 12, background: O, color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {current.action} <ArrowRight size={16} />
            </button>
          )}

          <button
            onClick={next}
            style={{ width: "100%", padding: "12px", borderRadius: 12, background: "var(--surface2, #1E1E1E)", border: "1px solid var(--border, #2A2A2A)", color: "var(--text-muted, #A0A0A0)", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {isLast ? (
              <><CheckCircle size={15} color="#22c55e" /> Entendido, ¡vamos!</>
            ) : current.action ? (
              "Saltar este paso →"
            ) : (
              <>Empezar <ArrowRight size={15} /></>
            )}
          </button>
        </div>

        {/* Contador */}
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-faint, #444)", marginTop: 16 }}>
          {step + 1} de {STEPS.length}
        </p>
      </div>
    </div>
  );
}

// Estado global del tour (fuera de React para persistir entre navegaciones)
let _tourVisible = false;
let _tourListeners = [];

function setTourVisible(val) {
  _tourVisible = val;
  _tourListeners.forEach(fn => fn(val));
}

export function useTour() {
  const [show, setShow] = useState(_tourVisible);

  useEffect(() => {
    _tourListeners.push(setShow);
    return () => { _tourListeners = _tourListeners.filter(fn => fn !== setShow); };
  }, []);

  useEffect(() => {
    const done = localStorage.getItem("clippr_tour_done");
    if (!done && !_tourVisible) {
      const t = setTimeout(() => setTourVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  return {
    show,
    close: () => setTourVisible(false),
  };
}
