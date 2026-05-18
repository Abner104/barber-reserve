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

// ── Typewriter ────────────────────────────────────────────────
function Typewriter() {
  const [idx, setIdx]     = useState(0);
  const [text, setText]   = useState("");
  const [deleting, setDel] = useState(false);

  useEffect(() => {
    const word    = WORDS[idx % WORDS.length];
    const timeout = deleting
      ? setTimeout(() => {
          setText(t => t.slice(0, -1));
          if (text.length <= 1) { setDel(false); setIdx(i => i + 1); }
        }, 60)
      : setTimeout(() => {
          setText(word.slice(0, text.length + 1));
          if (text === word) setTimeout(() => setDel(true), 1400);
        }, 90);
    return () => clearTimeout(timeout);
  }, [text, deleting, idx]);

  return (
    <span style={{ color: O }}>
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
    el.style.transform = `perspective(600px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.03)`;
  }
  function onLeave() {
    ref.current.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)";
  }
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        background: "#111", border: "1px solid #222", borderRadius: 20, padding: 28,
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        cursor: "default", willChange: "transform",
      }}
      onMouseEnter={() => { ref.current.style.boxShadow = `0 20px 60px rgba(255,107,44,0.15)`; }}
    >
      <div style={{ width: 48, height: 48, background: O2, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: O, marginBottom: 18 }}>
        {icon}
      </div>
      <p style={{ fontWeight: 800, fontSize: 16, color: "#fff", marginBottom: 8 }}>{title}</p>
      <p style={{ color: "#666", fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

// ── Parallax hero bg ─────────────────────────────────────────
function useParallax(factor = 0.4) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const fn = () => setOffset(window.scrollY * factor);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [factor]);
  return offset;
}

// ── Scroll reveal ────────────────────────────────────────────
function useReveal() {
  const ref = useRef();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, delay = 0 }) {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(32px)", transition: `opacity 0.6s ${delay}s ease, transform 0.6s ${delay}s ease` }}>
      {children}
    </div>
  );
}

// ── Noise grain overlay ───────────────────────────────────────
const grainStyle = {
  position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.025,
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
};

// ── Main ──────────────────────────────────────────────────────
export default function SaasLandingPage() {
  const parallax = useParallax(0.35);

  useEffect(() => {
    applyTheme({ theme_mode: "dark", theme_color: "#FF6B2C", theme_font: "Inter" });
  }, []);

  return (
    <div style={{ background: "#080808", color: "#fff", minHeight: "100vh", fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>

      {/* grain */}
      <div style={grainStyle} />

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes glow  { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        .nav-link { color:#555; font-size:14px; text-decoration:none; transition:color .2s; }
        .nav-link:hover { color:#fff; }
        .btn-ghost:hover { border-color:#444 !important; color:#fff !important; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, borderBottom: "1px solid #151515", background: "rgba(8,8,8,0.9)", backdropFilter: "blur(16px)", padding: "12px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/LogoC.png" alt="Clippr" style={{ width: 36, height: 36, objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(255,107,44,0.4))" }} />
            <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: -0.5, color: "#fff" }}>Clippr</span>
          </div>
          {/* Links */}
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <a href="#features" className="nav-link">Funciones</a>
            <a href="#precios"  className="nav-link">Precios</a>
            <Link to="/login"   className="nav-link">Login</Link>
            <Link to="/register" style={{ padding: "9px 20px", background: O, color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", boxShadow: `0 0 20px rgba(255,107,44,0.3)` }}>
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px", overflow: "hidden" }}>

        {/* parallax radial glow */}
        <div style={{ position: "absolute", top: "35%", left: "50%", transform: `translate(-50%, calc(-50% + ${parallax}px))`, width: 700, height: 700, background: "radial-gradient(circle, rgba(255,107,44,0.12) 0%, transparent 70%)", pointerEvents: "none", animation: "glow 4s ease-in-out infinite" }} />

        {/* street grid lines */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,107,44,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,44,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />

        {/* logo flotante */}
        <div style={{ position: "relative", zIndex: 1, marginBottom: 32, animation: "float 4s ease-in-out infinite" }}>
          <img src="/LogoC.png" alt="Clippr" style={{ width: 140, height: 140, objectFit: "contain", filter: "drop-shadow(0 0 40px rgba(255,107,44,0.5)) drop-shadow(0 0 80px rgba(255,107,44,0.2))" }} />
        </div>

        {/* badge */}
        <div style={{ position: "relative", zIndex: 1, display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", background: "rgba(255,107,44,0.08)", border: "1px solid rgba(255,107,44,0.2)", borderRadius: 20, marginBottom: 24 }}>
          <Zap size={11} color={O} />
          <span style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Software para barberías en Chile</span>
        </div>

        {/* headline con typewriter */}
        <h1 style={{ position: "relative", zIndex: 1, fontSize: "clamp(42px, 8vw, 88px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: -3, textAlign: "center", marginBottom: 24, maxWidth: 900 }}>
          Digitaliza tu<br />
          <Typewriter />
        </h1>

        <p style={{ position: "relative", zIndex: 1, color: "#666", fontSize: "clamp(15px,2.5vw,20px)", lineHeight: 1.65, maxWidth: 520, textAlign: "center", marginBottom: 44 }}>
          Reservas online, domicilios con mapa, gestión de barberos y dashboard de ingresos. Todo en un solo lugar.
        </p>

        <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 56 }}>
          <Link to="/register" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 36px", background: O, color: "#fff", borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: "none", boxShadow: `0 0 40px rgba(255,107,44,0.4), 0 4px 20px rgba(0,0,0,0.4)`, letterSpacing: -0.3 }}>
            Empezar gratis <ArrowRight size={18} />
          </Link>
          <Link to="/noblecut" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 28px", border: "1px solid #222", color: "#777", borderRadius: 12, fontWeight: 600, fontSize: 16, textDecoration: "none", transition: "border-color .2s, color .2s" }}>
            Ver demo en vivo
          </Link>
        </div>

        {/* social proof */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {[1,2,3,4,5].map(i => <Star key={i} size={13} fill={O} color={O} />)}
          </div>
          <span style={{ color: "#444", fontSize: 13 }}>Usado por barberías en Chile</span>
        </div>

        {/* scroll indicator */}
        <a href="#features" style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", color: "#333", textDecoration: "none", animation: "float 2s ease-in-out infinite" }}>
          <ChevronDown size={24} />
        </a>
      </section>

      {/* ── DASHBOARD MOCKUP ── */}
      <section style={{ padding: "0 24px 100px" }}>
        <Reveal>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ background: "#0F0F0F", border: "1px solid #1C1C1C", borderRadius: 22, padding: 3, overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px #1C1C1C" }}>
              {/* browser chrome */}
              <div style={{ background: "#161616", borderRadius: "19px 19px 0 0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {["#ef4444","#f59e0b","#22c55e"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
                </div>
                <div style={{ flex: 1, background: "#0F0F0F", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "#444", textAlign: "center" }}>
                  clippr.app/admin
                </div>
              </div>
              {/* content */}
              <div style={{ padding: 20, display: "grid", gridTemplateColumns: "160px 1fr", gap: 14, minHeight: 280 }}>
                <div style={{ background: "#0A0A0A", borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
                    <img src="/LogoC.png" alt="Clippr" style={{ width: 22, height: 22, objectFit: "contain" }} />
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>Clippr</span>
                  </div>
                  {["Dashboard","Reservas","Barberos","Servicios","Caja"].map((item, i) => (
                    <div key={item} style={{ padding: "7px 10px", borderRadius: 8, marginBottom: 3, background: i === 0 ? "rgba(255,107,44,0.1)" : "transparent", color: i === 0 ? O : "#444", fontSize: 11, fontWeight: i === 0 ? 700 : 400 }}>
                      {item}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
                    {[["18","Reservas hoy"],["$245k","Ingresos"],["6","Domicilios"],["12","Clientes"]].map(([v,l]) => (
                      <div key={l} style={{ background: "#0A0A0A", borderRadius: 10, padding: "12px 12px" }}>
                        <p style={{ fontSize: 17, fontWeight: 900, color: "#fff" }}>{v}</p>
                        <p style={{ fontSize: 9, color: "#444", marginTop: 2 }}>{l}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#0A0A0A", borderRadius: 10, padding: 14 }}>
                    <p style={{ fontSize: 10, color: "#444", marginBottom: 10, fontWeight: 700, letterSpacing: 1 }}>RESERVAS DE HOY</p>
                    {[["09:00","Carlos M.","Fade","$35.000"],["10:30","Ana P.","Corte + barba","$45.000"],["11:30","David R.","📍 Domicilio","$60.000"]].map(([h,c,s,p]) => (
                      <div key={h} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #141414" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", width: 34, flexShrink: 0 }}>{h}</span>
                        <span style={{ fontSize: 11, color: "#555", flex: 1 }}>{c} · {s}</span>
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
      <section id="features" style={{ padding: "80px 24px 100px", background: "#050505" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Funciones</p>
              <h2 style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 900, color: "#fff", letterSpacing: -1 }}>Todo lo que necesitas</h2>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.07}>
                <TiltCard {...f} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── STRIP STATS ── */}
      <section style={{ padding: "60px 24px", borderTop: "1px solid #111", borderBottom: "1px solid #111" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32, textAlign: "center" }}>
          {[["2+","Barberías activas"],["100%","Uptime garantizado"],["24/7","Reservas online"],["0","Llamadas necesarias"]].map(([n,l]) => (
            <Reveal key={l}>
              <p style={{ fontSize: "clamp(36px,5vw,52px)", fontWeight: 900, color: O, letterSpacing: -2, marginBottom: 6 }}>{n}</p>
              <p style={{ fontSize: 13, color: "#555" }}>{l}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── PRECIOS ── */}
      <section id="precios" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Precios</p>
              <h2 style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 900, color: "#fff", letterSpacing: -1 }}>Simple y transparente</h2>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 16 }}>
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.1}>
                <div style={{ height: "100%", background: plan.highlight ? "rgba(255,107,44,0.05)" : "#0D0D0D", border: `1px solid ${plan.highlight ? O : "#1C1C1C"}`, borderRadius: 22, padding: 30, position: "relative", boxShadow: plan.highlight ? `0 0 60px rgba(255,107,44,0.12)` : "none" }}>
                  {plan.highlight && (
                    <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: O, color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 16px", borderRadius: 20, letterSpacing: 1 }}>
                      MÁS POPULAR
                    </div>
                  )}
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 8 }}>{plan.name}</p>
                  <p style={{ fontSize: "clamp(28px,4vw,36px)", fontWeight: 900, color: "#fff", marginBottom: 4, letterSpacing: -1 }}>{plan.price}</p>
                  <p style={{ fontSize: 13, color: "#444", marginBottom: 26 }}>{plan.sub}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 28 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: O2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Check size={11} color={O} strokeWidth={3} />
                        </div>
                        <span style={{ fontSize: 14, color: "#888" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link to={plan.href} style={{ display: "block", padding: "13px", borderRadius: 11, background: plan.highlight ? O : "#151515", color: plan.highlight ? "#fff" : "#666", fontWeight: 700, fontSize: 14, textAlign: "center", textDecoration: "none", border: plan.highlight ? "none" : "1px solid #222", boxSizing: "border-box", boxShadow: plan.highlight ? `0 0 30px rgba(255,107,44,0.3)` : "none" }}>
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
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 800, height: 400, background: "radial-gradient(ellipse, rgba(255,107,44,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <Reveal>
          <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
            <img src="/LogoC.png" alt="Clippr" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 28, filter: "drop-shadow(0 0 30px rgba(255,107,44,0.6))" }} />
            <h2 style={{ fontSize: "clamp(32px,6vw,52px)", fontWeight: 900, color: "#fff", marginBottom: 16, letterSpacing: -2, lineHeight: 1.1 }}>
              Empieza hoy.<br /><span style={{ color: O }}>Gratis por 30 días.</span>
            </h2>
            <p style={{ color: "#555", fontSize: 16, marginBottom: 40 }}>Sin tarjeta de crédito. Sin compromisos.</p>
            <Link to="/register" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "18px 48px", background: O, color: "#fff", borderRadius: 14, fontWeight: 900, fontSize: 18, textDecoration: "none", boxShadow: `0 0 60px rgba(255,107,44,0.45), 0 8px 30px rgba(0,0,0,0.4)`, letterSpacing: -0.3 }}>
              Quiero mi barbería digital <ArrowRight size={20} />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #111", padding: "28px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 }}>
          <img src="/LogoC.png" alt="Clippr" style={{ width: 28, height: 28, objectFit: "contain", opacity: 0.8 }} />
          <span style={{ fontWeight: 900, fontSize: 15, color: "#fff" }}>Clippr</span>
        </div>
        <p style={{ color: "#333", fontSize: 13 }}>© 2026 Clippr · Todos los derechos reservados</p>
      </footer>

    </div>
  );
}
