import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { applyTheme } from "../lib/applyTheme";
import { ArrowRight, Check, Scissors, MapPin, Calendar, BarChart3, Users, Zap, Star, ChevronDown } from "lucide-react";

const O  = "#FF6B2C";
const O2 = "rgba(255,107,44,0.12)";

const FEATURES = [
  { icon: <Calendar size={22} />, title: "Reservas online 24/7",    desc: "Tus clientes reservan solos, sin llamadas. Tú solo atiendes." },
  { icon: <MapPin size={22} />,   title: "Domicilios con mapa",      desc: "El cliente pone su dirección, el barbero va. Tarifa automática." },
  { icon: <Users size={22} />,    title: "Gestión de barberos",      desc: "Horarios, comisiones y agenda individual por barbero." },
  { icon: <BarChart3 size={22} />,title: "Dashboard en tiempo real", desc: "Reservas, ingresos y métricas desde el panel admin." },
  { icon: <Zap size={22} />,      title: "Multi-barbería",           desc: "¿Tienes varias sedes? Gestiónalas desde un solo lugar." },
  { icon: <Scissors size={22} />, title: "Tu página propia",         desc: "Cada barbería con su landing, servicios y barberos reales." },
];

const PLANS = [
  {
    name: "Trial", price: "Gratis", sub: "30 días · sin tarjeta",
    features: ["Hasta 2 barberos", "Reservas ilimitadas", "Domicilios con mapa", "Panel admin completo"],
    cta: "Empezar gratis", href: "/register", highlight: false,
  },
  {
    name: "Mensual", price: "$10.000", sub: "por barbero / mes",
    features: ["Barberos ilimitados", "Reservas ilimitadas", "Domicilios con mapa", "Dashboard + métricas", "Soporte por WhatsApp"],
    cta: "Empezar ahora", href: "/register", highlight: true,
  },
  {
    name: "Cadenas", price: "A medida", sub: "para múltiples sedes",
    features: ["Sedes ilimitadas", "Gestión centralizada", "Reportes por sede", "Soporte dedicado"],
    cta: "Hablar con nosotros", href: "https://wa.me/56900000000", highlight: false,
  },
];

const WORDS = ["barbería.", "negocio.", "agenda.", "equipo."];

// ── CSS global ────────────────────────────────────────────────
const CSS = `
  html { scroll-behavior: smooth; }

  @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes float   { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-14px) rotate(2deg)} }
  @keyframes neonPulse { 0%,100%{opacity:.5;box-shadow:0 0 8px ${O};} 50%{opacity:1;box-shadow:0 0 24px ${O}, 0 0 48px rgba(255,107,44,.3);} }
  @keyframes smokeDrift {
    0%   { transform: translateY(0)   translateX(0)   scale(1);   opacity: 0; }
    15%  { opacity: .18; }
    80%  { opacity: .08; }
    100% { transform: translateY(-220px) translateX(40px)  scale(2.4); opacity: 0; }
  }
  @keyframes smokeDrift2 {
    0%   { transform: translateY(0)   translateX(0)   scale(1);   opacity: 0; }
    15%  { opacity: .14; }
    80%  { opacity: .06; }
    100% { transform: translateY(-200px) translateX(-50px) scale(2.2); opacity: 0; }
  }
  @keyframes lineSlide {
    0%   { transform: translateX(-100%); opacity: 0; }
    20%  { opacity: 1; }
    80%  { opacity: 1; }
    100% { transform: translateX(100%);  opacity: 0; }
  }
  @keyframes revealUp {
    from { opacity:0; transform:translateY(40px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes countUp {
    from { opacity:0; transform:scale(.85); }
    to   { opacity:1; transform:scale(1); }
  }

  .nav-link { color:#555; font-size:14px; text-decoration:none; transition:color .2s; }
  .nav-link:hover { color:#fff; }
  .btn-ghost:hover { border-color:#444 !important; color:#fff !important; }
  .plan-card:hover { transform: translateY(-4px); }

  /* Smoke blobs */
  .smoke { position:absolute; border-radius:50%; filter:blur(60px); pointer-events:none; }
  .s1 { width:320px; height:320px; background:rgba(255,107,44,.07); bottom:-60px; left:10%;  animation: smokeDrift  9s ease-in-out infinite; }
  .s2 { width:260px; height:260px; background:rgba(255,107,44,.05); bottom:-40px; right:15%; animation: smokeDrift2 11s ease-in-out infinite 1.5s; }
  .s3 { width:200px; height:200px; background:rgba(255,107,44,.06); bottom:-20px; left:40%;  animation: smokeDrift  13s ease-in-out infinite 3s; }
  .s4 { width:180px; height:180px; background:rgba(255,107,44,.04); bottom:0;     right:35%; animation: smokeDrift2 10s ease-in-out infinite 5s; }

  /* Neon lines */
  .neon-line {
    position:absolute; height:1px; left:0; right:0;
    background: linear-gradient(90deg, transparent 0%, ${O} 30%, ${O} 70%, transparent 100%);
    animation: neonPulse 3s ease-in-out infinite;
  }
  .nl1 { top:28%; animation-delay:0s; opacity:.4; }
  .nl2 { top:55%; animation-delay:1.2s; opacity:.25; }
  .nl3 { top:78%; animation-delay:2.1s; opacity:.2; }

  /* Scan line moving */
  .scan { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,${O},transparent); animation: lineSlide 6s linear infinite; top:40%; opacity:.3; }
`;

// ── Typewriter ────────────────────────────────────────────────
function Typewriter() {
  const [idx, setIdx]      = useState(0);
  const [text, setText]    = useState("");
  const [deleting, setDel] = useState(false);

  useEffect(() => {
    const word = WORDS[idx % WORDS.length];
    const t = deleting
      ? setTimeout(() => {
          setText(s => s.slice(0, -1));
          if (text.length <= 1) { setDel(false); setIdx(i => i + 1); }
        }, 55)
      : setTimeout(() => {
          setText(word.slice(0, text.length + 1));
          if (text === word) setTimeout(() => setDel(true), 1600);
        }, 85);
    return () => clearTimeout(t);
  }, [text, deleting, idx]);

  return (
    <span style={{ color: O, whiteSpace: "nowrap" }}>
      {text}
      <span style={{ borderRight: `3px solid ${O}`, marginLeft: 2, animation: "blink .7s step-end infinite" }} />
    </span>
  );
}

// ── 3D tilt card ─────────────────────────────────────────────
function TiltCard({ icon, title, desc }) {
  const ref = useRef();
  function onMove(e) {
    const el   = ref.current;
    const rect = el.getBoundingClientRect();
    const x    = (e.clientX - rect.left) / rect.width  - 0.5;
    const y    = (e.clientY - rect.top)  / rect.height - 0.5;
    el.style.transform   = `perspective(700px) rotateY(${x * 16}deg) rotateX(${-y * 16}deg) scale(1.04)`;
    el.style.boxShadow   = `${-x * 20}px ${y * 20}px 40px rgba(255,107,44,0.15)`;
  }
  function onLeave() {
    ref.current.style.transform = "perspective(700px) rotateY(0) rotateX(0) scale(1)";
    ref.current.style.boxShadow = "none";
  }
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ background: "#0E0E0E", border: "1px solid #1E1E1E", borderRadius: 20, padding: 28, transition: "transform .15s ease, box-shadow .15s ease", willChange: "transform", cursor: "default" }}>
      <div style={{ width: 50, height: 50, background: O2, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: O, marginBottom: 18 }}>
        {icon}
      </div>
      <p style={{ fontWeight: 800, fontSize: 16, color: "#fff", marginBottom: 8 }}>{title}</p>
      <p style={{ color: "#666", fontSize: 14, lineHeight: 1.65 }}>{desc}</p>
    </div>
  );
}

// ── Scroll reveal ────────────────────────────────────────────
function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef();
  const [v, setV] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.12 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(36px)", transition: `opacity .7s ${delay}s cubic-bezier(.22,1,.36,1), transform .7s ${delay}s cubic-bezier(.22,1,.36,1)`, ...style }}>
      {children}
    </div>
  );
}

// ── Parallax ─────────────────────────────────────────────────
function useParallax(f = 0.3) {
  const [y, setY] = useState(0);
  useEffect(() => {
    const fn = () => setY(window.scrollY * f);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [f]);
  return y;
}

// ── Main ──────────────────────────────────────────────────────
export default function SaasLandingPage() {
  const py = useParallax(0.28);

  useEffect(() => {
    applyTheme({ theme_mode: "dark", theme_color: "#FF6B2C", theme_font: "Inter" });
  }, []);

  return (
    <div style={{ background: "#080808", color: "#fff", minHeight: "100vh", fontFamily: "'Inter',sans-serif", overflowX: "hidden" }}>
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, borderBottom: "1px solid #141414", background: "rgba(8,8,8,0.92)", backdropFilter: "blur(18px)", padding: "12px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/LogoC.png" alt="Clippr" style={{ width: 34, height: 34, objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(255,107,44,.45))" }} />
            <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: -.5 }}>Clippr</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <a href="#features" className="nav-link">Funciones</a>
            <a href="#precios"  className="nav-link">Precios</a>
            <Link to="/login"   className="nav-link">Login</Link>
            <Link to="/register" style={{ padding: "9px 20px", background: O, color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", boxShadow: `0 0 18px rgba(255,107,44,.35)` }}>
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px", overflow: "hidden" }}>

        {/* Smoke blobs */}
        <div className="smoke s1" />
        <div className="smoke s2" />
        <div className="smoke s3" />
        <div className="smoke s4" />

        {/* Neon horizontal lines */}
        <div className="neon-line nl1" />
        <div className="neon-line nl2" />
        <div className="neon-line nl3" />

        {/* Scan line */}
        <div className="scan" />

        {/* Grid de fondo */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,107,44,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,107,44,.025) 1px,transparent 1px)", backgroundSize: "55px 55px", pointerEvents: "none" }} />

        {/* Radial glow parallax */}
        <div style={{ position: "absolute", top: `calc(40% + ${py}px)`, left: "50%", transform: "translate(-50%,-50%)", width: 750, height: 750, background: "radial-gradient(circle,rgba(255,107,44,.1) 0%,transparent 68%)", pointerEvents: "none" }} />

        {/* Contenido */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 860 }}>

          {/* Logo flotante */}
          <div style={{ marginBottom: 28, animation: "float 5s ease-in-out infinite" }}>
            <img src="/LogoC.png" alt="Clippr" style={{ width: 130, height: 130, objectFit: "contain", filter: "drop-shadow(0 0 32px rgba(255,107,44,.55)) drop-shadow(0 0 80px rgba(255,107,44,.2))" }} />
          </div>

          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", background: "rgba(255,107,44,.08)", border: "1px solid rgba(255,107,44,.22)", borderRadius: 20, marginBottom: 24 }}>
            <Zap size={11} color={O} />
            <span style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>Software para barberías en Chile</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(40px,8vw,90px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: -3, marginBottom: 24 }}>
            Digitaliza tu<br /><Typewriter />
          </h1>

          <p style={{ color: "#666", fontSize: "clamp(15px,2.2vw,19px)", lineHeight: 1.7, maxWidth: 500, margin: "0 auto 44px" }}>
            Reservas online, domicilios con mapa, gestión de barberos y dashboard de ingresos. Todo en un solo lugar.
          </p>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 52 }}>
            <Link to="/register" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 36px", background: O, color: "#fff", borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: "none", boxShadow: `0 0 40px rgba(255,107,44,.45),0 4px 20px rgba(0,0,0,.5)` }}>
              Empezar gratis <ArrowRight size={18} />
            </Link>
            <Link to="/noblecut" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 28px", border: "1px solid #222", color: "#777", borderRadius: 12, fontWeight: 600, fontSize: 16, textDecoration: "none", transition: "border-color .2s,color .2s" }}>
              Ver demo en vivo
            </Link>
          </div>

          {/* Stars */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 3 }}>{[1,2,3,4,5].map(i => <Star key={i} size={13} fill={O} color={O} />)}</div>
            <span style={{ color: "#444", fontSize: 13 }}>Usado por barberías en Chile</span>
          </div>
        </div>

        {/* Scroll caret */}
        <a href="#mockup" style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", color: "#2A2A2A", textDecoration: "none", animation: "float 2.2s ease-in-out infinite", zIndex: 2 }}>
          <ChevronDown size={26} />
        </a>
      </section>

      {/* ── DASHBOARD MOCKUP ── */}
      <section id="mockup" style={{ padding: "0 24px 100px" }}>
        <Reveal>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            {/* Neon border superior */}
            <div style={{ height: 2, background: `linear-gradient(90deg,transparent,${O},transparent)`, marginBottom: -1, animation: "neonPulse 3s ease-in-out infinite", borderRadius: 2 }} />
            <div style={{ background: "#0C0C0C", border: "1px solid #1C1C1C", borderRadius: 22, padding: 3, overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,.7),0 0 60px rgba(255,107,44,.06)" }}>
              <div style={{ background: "#141414", borderRadius: "19px 19px 0 0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {["#ef4444","#f59e0b","#22c55e"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
                </div>
                <div style={{ flex: 1, background: "#0C0C0C", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "#333", textAlign: "center" }}>clippr.app/admin</div>
              </div>
              <div style={{ padding: 18, display: "grid", gridTemplateColumns: "155px 1fr", gap: 14, minHeight: 280 }}>
                <div style={{ background: "#080808", borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 18 }}>
                    <img src="/LogoC.png" alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>Clippr</span>
                  </div>
                  {["Dashboard","Reservas","Barberos","Servicios","Caja"].map((item, i) => (
                    <div key={item} style={{ padding: "7px 10px", borderRadius: 8, marginBottom: 3, background: i === 0 ? "rgba(255,107,44,.1)" : "transparent", color: i === 0 ? O : "#333", fontSize: 11, fontWeight: i === 0 ? 700 : 400 }}>{item}</div>
                  ))}
                </div>
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
                    {[["18","Reservas hoy"],["$245k","Ingresos"],["6","Domicilios"],["12","Clientes"]].map(([v,l]) => (
                      <div key={l} style={{ background: "#080808", borderRadius: 10, padding: "12px" }}>
                        <p style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{v}</p>
                        <p style={{ fontSize: 9, color: "#333", marginTop: 2 }}>{l}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#080808", borderRadius: 10, padding: 14 }}>
                    <p style={{ fontSize: 10, color: "#333", marginBottom: 10, fontWeight: 700, letterSpacing: 1 }}>RESERVAS DE HOY</p>
                    {[["09:00","Carlos M.","Fade","$35.000"],["10:30","Ana P.","Corte + barba","$45.000"],["11:30","David R.","📍 Domicilio","$60.000"]].map(([h,c,s,p]) => (
                      <div key={h} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #111" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", width: 34, flexShrink: 0 }}>{h}</span>
                        <span style={{ fontSize: 11, color: "#444", flex: 1 }}>{c} · {s}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: O }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "80px 24px 100px", background: "#050505", position: "relative", overflow: "hidden" }}>
        {/* smoke decorativo sección */}
        <div style={{ position: "absolute", bottom: -80, left: "50%", transform: "translateX(-50%)", width: 600, height: 300, background: "radial-gradient(ellipse,rgba(255,107,44,.05) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Funciones</p>
              <h2 style={{ fontSize: "clamp(28px,5vw,46px)", fontWeight: 900, letterSpacing: -1.5 }}>Todo lo que necesitas</h2>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <TiltCard {...f} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section style={{ padding: "64px 24px", borderTop: "1px solid #111", borderBottom: "1px solid #111", position: "relative" }}>
        <div className="neon-line" style={{ top: 0, animation: "neonPulse 4s ease-in-out infinite" }} />
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 32, textAlign: "center" }}>
          {[["2+","Barberías activas"],["100%","Uptime garantizado"],["24/7","Reservas online"],["0","Llamadas necesarias"]].map(([n,l], i) => (
            <Reveal key={l} delay={i * 0.1}>
              <p style={{ fontSize: "clamp(38px,5vw,56px)", fontWeight: 900, color: O, letterSpacing: -2, marginBottom: 6, lineHeight: 1 }}>{n}</p>
              <p style={{ fontSize: 13, color: "#555" }}>{l}</p>
            </Reveal>
          ))}
        </div>
        <div className="neon-line" style={{ bottom: 0, top: "auto", animation: "neonPulse 4s ease-in-out infinite 2s" }} />
      </section>

      {/* ── PRECIOS ── */}
      <section id="precios" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Precios</p>
              <h2 style={{ fontSize: "clamp(28px,5vw,46px)", fontWeight: 900, letterSpacing: -1.5 }}>Simple y transparente</h2>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 16 }}>
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.12}>
                <div className="plan-card" style={{ height: "100%", background: plan.highlight ? "rgba(255,107,44,.04)" : "#0A0A0A", border: `1px solid ${plan.highlight ? O : "#1A1A1A"}`, borderRadius: 22, padding: 30, position: "relative", transition: "transform .25s cubic-bezier(.22,1,.36,1)", boxShadow: plan.highlight ? `0 0 60px rgba(255,107,44,.1)` : "none" }}>
                  {plan.highlight && (
                    <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: O, color: "#fff", fontSize: 10, fontWeight: 800, padding: "5px 16px", borderRadius: 20, letterSpacing: 1.2 }}>MÁS POPULAR</div>
                  )}
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#444", marginBottom: 8 }}>{plan.name}</p>
                  <p style={{ fontSize: "clamp(28px,4vw,36px)", fontWeight: 900, color: "#fff", marginBottom: 4, letterSpacing: -1 }}>{plan.price}</p>
                  <p style={{ fontSize: 13, color: "#333", marginBottom: 26 }}>{plan.sub}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 28 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: O2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Check size={11} color={O} strokeWidth={3} />
                        </div>
                        <span style={{ fontSize: 14, color: "#777" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link to={plan.href} style={{ display: "block", padding: "13px", borderRadius: 11, background: plan.highlight ? O : "#111", color: plan.highlight ? "#fff" : "#555", fontWeight: 700, fontSize: 14, textAlign: "center", textDecoration: "none", border: plan.highlight ? "none" : "1px solid #1E1E1E", boxSizing: "border-box", boxShadow: plan.highlight ? `0 0 30px rgba(255,107,44,.3)` : "none" }}>
                    {plan.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding: "100px 24px 120px", background: "#050505", position: "relative", overflow: "hidden" }}>
        {/* Smoke fondo */}
        <div className="smoke" style={{ width: 500, height: 500, background: "rgba(255,107,44,.07)", bottom: -100, left: "50%", transform: "translateX(-50%)", animation: "smokeDrift 12s ease-in-out infinite" }} />
        <div className="neon-line nl1" />
        <div className="neon-line nl3" />
        <Reveal>
          <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
            <div style={{ marginBottom: 28, animation: "float 4s ease-in-out infinite" }}>
              <img src="/LogoC.png" alt="Clippr" style={{ width: 90, height: 90, objectFit: "contain", filter: "drop-shadow(0 0 40px rgba(255,107,44,.7))" }} />
            </div>
            <h2 style={{ fontSize: "clamp(32px,6vw,54px)", fontWeight: 900, color: "#fff", marginBottom: 16, letterSpacing: -2, lineHeight: 1.05 }}>
              Empieza hoy.<br /><span style={{ color: O }}>Gratis por 30 días.</span>
            </h2>
            <p style={{ color: "#555", fontSize: 16, marginBottom: 40 }}>Sin tarjeta de crédito. Sin compromisos.</p>
            <Link to="/register" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "18px 50px", background: O, color: "#fff", borderRadius: 14, fontWeight: 900, fontSize: 18, textDecoration: "none", boxShadow: `0 0 70px rgba(255,107,44,.5),0 8px 30px rgba(0,0,0,.4)` }}>
              Quiero mi barbería digital <ArrowRight size={20} />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #111", padding: "28px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 }}>
          <img src="/LogoC.png" alt="Clippr" style={{ width: 26, height: 26, objectFit: "contain", opacity: .7 }} />
          <span style={{ fontWeight: 900, fontSize: 15, color: "#fff" }}>Clippr</span>
        </div>
        <p style={{ color: "#2A2A2A", fontSize: 13 }}>© 2026 Clippr · Todos los derechos reservados</p>
      </footer>
    </div>
  );
}
