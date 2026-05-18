import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { applyTheme } from "../lib/applyTheme";
import { supabase } from "../lib/supabase";

async function fetchPricing() {
  const { data } = await supabase
    .from("saas_config")
    .select("base_price, price_per_barber, trial_days")
    .eq("id", 1)
    .maybeSingle();
  return data ?? { base_price: 11990, price_per_barber: 2990, trial_days: 30 };
}
import { ArrowRight, Check, Scissors, MapPin, Calendar, BarChart3, Users, Zap, Star, ChevronDown } from "lucide-react";

const O  = "#FF6B2C";
const O2 = "rgba(255,107,44,0.1)";

const FEATURES = [
  { icon: <Calendar size={22} />, title: "Reservas 24/7",           desc: "Tus clientes reservan solos. Tú solo atiendes." },
  { icon: <MapPin size={22} />,   title: "Domicilios con mapa",     desc: "El cliente pone su dirección, el barbero va. Tarifa automática." },
  { icon: <Users size={22} />,    title: "Tu equipo bajo control",  desc: "Horarios, comisiones y agenda individual por barbero." },
  { icon: <BarChart3 size={22} />,title: "Caja en tiempo real",     desc: "Cuánto entra, cuánto le toca a cada barbero. Sin Excel." },
  { icon: <Zap size={22} />,      title: "Multi-sede",              desc: "¿Tienes varias sedes? Todo desde un solo panel." },
  { icon: <Scissors size={22} />, title: "Tu página propia",        desc: "Cada barbería con su link, sus servicios y sus barberos." },
];

function buildPlans(cfg) {
  const base    = cfg?.base_price       ?? 11990;
  const perBar  = cfg?.price_per_barber ?? 2990;
  const days    = cfg?.trial_days       ?? 30;
  const fmt     = n => `$${Number(n).toLocaleString("es-CL")}`;
  return [
    {
      name: "Trial", price: "Gratis", sub: `${days} días · sin tarjeta`,
      features: ["Hasta 2 barberos", "Reservas ilimitadas", "Domicilios con mapa", "Panel admin completo"],
      cta: "Empezar gratis", href: "/register", highlight: false,
    },
    {
      name: "Pro", price: fmt(base), sub: `+ ${fmt(perBar)} por barbero adicional / mes`,
      features: ["Reservas online 24/7", "Portal del barbero", "Domicilios con mapa", "Caja y comisiones", "Soporte por WhatsApp"],
      cta: "Empezar ahora", href: "/register", highlight: true,
    },
    {
      name: "Cadenas", price: "A medida", sub: "para múltiples sedes",
      features: ["Sedes ilimitadas", "Gestión centralizada", "Reportes por sede", "Soporte dedicado"],
      cta: "Hablar con nosotros", href: "https://wa.me/56900000000", highlight: false,
    },
  ];
}

const WORDS = ["barbería.", "negocio.", "equipo.", "caja."];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Inter:wght@400;500;600;700;800;900&display=swap');

  html { scroll-behavior: smooth; }

  @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes float  { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-14px) rotate(1deg)} }
  @keyframes rise   {
    0%   { transform:translateY(0) scale(1);   opacity:0; }
    10%  { opacity:.2; }
    85%  { opacity:.08; }
    100% { transform:translateY(-280px) scale(2.6); opacity:0; }
  }
  @keyframes rise2  {
    0%   { transform:translateY(0) scale(1);   opacity:0; }
    10%  { opacity:.15; }
    85%  { opacity:.05; }
    100% { transform:translateY(-240px) translateX(30px) scale(2.2); opacity:0; }
  }

  .nav-link { color:#4A4A4A; font-size:14px; text-decoration:none; transition:color .2s; font-family:'Inter',sans-serif; }
  .nav-link:hover { color:#fff; }
  .btn-ghost { transition: border-color .2s, color .2s !important; }
  .btn-ghost:hover { border-color:#444 !important; color:#fff !important; }
  .plan-card { transition: transform .28s cubic-bezier(.22,1,.36,1); }
  .plan-card:hover { transform: translateY(-6px); }

  .display { font-family:'Barlow Condensed',sans-serif; font-weight:900; letter-spacing:-1px; }
  .body-font { font-family:'Inter',sans-serif; }
`;

// ── Typewriter ─────────────────────────────────────────────────
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
          if (text === word) setTimeout(() => setDel(true), 1800);
        }, 90);
    return () => clearTimeout(t);
  }, [text, deleting, idx]);

  return (
    <span style={{ color: O }}>
      {text}
      <span style={{ borderRight: `4px solid ${O}`, marginLeft: 3, animation: "blink .7s step-end infinite" }} />
    </span>
  );
}

// ── 3D tilt card ──────────────────────────────────────────────
function TiltCard({ icon, title, desc }) {
  const ref = useRef();
  function onMove(e) {
    const el   = ref.current;
    const rect = el.getBoundingClientRect();
    const x    = (e.clientX - rect.left) / rect.width  - 0.5;
    const y    = (e.clientY - rect.top)  / rect.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.03)`;
    el.style.boxShadow = `${-x * 18}px ${y * 18}px 36px rgba(255,107,44,0.12)`;
  }
  function onLeave() {
    ref.current.style.transform = "perspective(700px) rotateY(0) rotateX(0) scale(1)";
    ref.current.style.boxShadow = "none";
  }
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ background: "#0E0E0E", border: "1px solid #1C1C1C", borderRadius: 20, padding: 28, transition: "transform .15s ease, box-shadow .15s ease", willChange: "transform", cursor: "default" }}>
      <div style={{ width: 48, height: 48, background: O2, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: O, marginBottom: 18 }}>
        {icon}
      </div>
      <p className="body-font" style={{ fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 8 }}>{title}</p>
      <p className="body-font" style={{ color: "#555", fontSize: 14, lineHeight: 1.65 }}>{desc}</p>
    </div>
  );
}

// ── Scroll reveal ─────────────────────────────────────────────
function Reveal({ children, delay = 0 }) {
  const ref = useRef();
  const [v, setV] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(32px)", transition: `opacity .7s ${delay}s cubic-bezier(.22,1,.36,1), transform .7s ${delay}s cubic-bezier(.22,1,.36,1)` }}>
      {children}
    </div>
  );
}

// ── Parallax ──────────────────────────────────────────────────
function useParallax(f = 0.25) {
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
  const py = useParallax(0.25);

  const { data: pricingCfg } = useQuery({
    queryKey: ["saas-config-public"],
    queryFn:  fetchPricing,
    staleTime: 5 * 60 * 1000,
  });

  const PLANS = buildPlans(pricingCfg);

  useEffect(() => {
    applyTheme({ theme_mode: "dark", theme_color: "#FF6B2C", theme_font: "Inter" });
  }, []);

  return (
    <div className="body-font" style={{ background: "#080808", color: "#fff", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, borderBottom: "1px solid #111", background: "rgba(8,8,8,0.94)", backdropFilter: "blur(20px)", padding: "12px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/LogoC.png" alt="Clippr" style={{ width: 34, height: 34, objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(255,107,44,.5))" }} />
            <span className="display" style={{ fontSize: 22, color: "#fff", letterSpacing: 0 }}>Clippr</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <a href="#features" className="nav-link">Funciones</a>
            <a href="#precios"  className="nav-link">Precios</a>
            <Link to="/login"   className="nav-link">Login</Link>
            <Link to="/register" style={{ padding: "9px 20px", background: O, color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", boxShadow: `0 0 20px rgba(255,107,44,.35)` }}>
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px", overflow: "hidden" }}>

        {/* Smoke — solo 3, bien separados */}
        {[
          { w: 340, h: 340, l: "8%",  b: -80, anim: "rise  10s ease-in-out infinite" },
          { w: 280, h: 280, r: "12%", b: -60, anim: "rise2 13s ease-in-out infinite 2s" },
          { w: 220, h: 220, l: "42%", b: -40, anim: "rise  15s ease-in-out infinite 5s" },
        ].map((s, i) => (
          <div key={i} style={{ position: "absolute", bottom: s.b, left: s.l, right: s.r, width: s.w, height: s.h, borderRadius: "50%", background: "rgba(255,107,44,.06)", filter: "blur(55px)", pointerEvents: "none", animation: s.anim }} />
        ))}

        {/* Radial glow — parallax suave */}
        <div style={{ position: "absolute", top: "40%", left: "50%", transform: `translate(-50%, calc(-50% + ${py}px))`, width: 700, height: 700, background: "radial-gradient(circle, rgba(255,107,44,.09) 0%, transparent 65%)", pointerEvents: "none" }} />

        {/* Contenido */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 880 }}>

          {/* Logo */}
          <div style={{ marginBottom: 32, animation: "float 5s ease-in-out infinite" }}>
            <img src="/LogoC.png" alt="Clippr" style={{ width: 140, height: 140, objectFit: "contain", filter: "drop-shadow(0 0 36px rgba(255,107,44,.6)) drop-shadow(0 0 90px rgba(255,107,44,.18))" }} />
          </div>

          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", background: "rgba(255,107,44,.07)", border: "1px solid rgba(255,107,44,.2)", borderRadius: 20, marginBottom: 28 }}>
            <Zap size={11} color={O} />
            <span style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Software para barberías · Chile</span>
          </div>

          {/* Headline display */}
          <h1 className="display" style={{ fontSize: "clamp(60px,11vw,120px)", lineHeight: 0.95, letterSpacing: -2, marginBottom: 24, textTransform: "uppercase" }}>
            DIGITALIZA<br />TU <Typewriter />
          </h1>

          <p style={{ color: "#5A5A5A", fontSize: "clamp(15px,2vw,18px)", lineHeight: 1.7, maxWidth: 480, margin: "0 auto 44px" }}>
            Reservas online, domicilios con mapa, gestión de barberos y caja en tiempo real. Sin Excel, sin llamadas.
          </p>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 52 }}>
            <Link to="/register" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 36px", background: O, color: "#fff", borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: "none", boxShadow: `0 0 44px rgba(255,107,44,.45), 0 4px 20px rgba(0,0,0,.5)` }}>
              Empezar gratis <ArrowRight size={18} />
            </Link>
            <Link to="/noblecut" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 28px", border: "1px solid #222", color: "#666", borderRadius: 12, fontWeight: 600, fontSize: 16, textDecoration: "none" }}>
              Ver demo en vivo
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 3 }}>{[1,2,3,4,5].map(i => <Star key={i} size={13} fill={O} color={O} />)}</div>
            <span style={{ color: "#3A3A3A", fontSize: 13 }}>Usado por barberías en Chile</span>
          </div>
        </div>

        <a href="#mockup" style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", color: "#252525", textDecoration: "none", animation: "float 2.5s ease-in-out infinite", zIndex: 2 }}>
          <ChevronDown size={26} />
        </a>
      </section>

      {/* ── MOCKUP ── */}
      <section id="mockup" style={{ padding: "0 24px 100px" }}>
        <Reveal>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ background: "#0C0C0C", border: "1px solid #1A1A1A", borderRadius: 22, padding: 3, overflow: "hidden", boxShadow: "0 50px 130px rgba(0,0,0,.7)" }}>
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
                    <span className="display" style={{ fontSize: 16, color: "#fff" }}>Clippr</span>
                  </div>
                  {["Dashboard","Reservas","Barberos","Servicios","Caja"].map((item, i) => (
                    <div key={item} style={{ padding: "7px 10px", borderRadius: 8, marginBottom: 3, background: i === 0 ? "rgba(255,107,44,.1)" : "transparent", color: i === 0 ? O : "#2E2E2E", fontSize: 11, fontWeight: i === 0 ? 700 : 400 }}>{item}</div>
                  ))}
                </div>
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
                    {[["18","Reservas hoy"],["$245k","Ingresos"],["6","Domicilios"],["12","Clientes"]].map(([v,l]) => (
                      <div key={l} style={{ background: "#080808", borderRadius: 10, padding: 12 }}>
                        <p style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{v}</p>
                        <p style={{ fontSize: 9, color: "#2E2E2E", marginTop: 2 }}>{l}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#080808", borderRadius: 10, padding: 14 }}>
                    <p style={{ fontSize: 10, color: "#2E2E2E", marginBottom: 10, fontWeight: 700, letterSpacing: 1 }}>RESERVAS DE HOY</p>
                    {[["09:00","Carlos M.","Fade","$35.000"],["10:30","Ana P.","Corte + barba","$45.000"],["11:30","David R.","📍 Domicilio","$60.000"]].map(([h,c,s,p]) => (
                      <div key={h} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #0F0F0F" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", width: 34, flexShrink: 0 }}>{h}</span>
                        <span style={{ fontSize: 11, color: "#3A3A3A", flex: 1 }}>{c} · {s}</span>
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
              <p style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Funciones</p>
              <h2 className="display" style={{ fontSize: "clamp(42px,6vw,64px)", textTransform: "uppercase", letterSpacing: -1 }}>
                Tu barbería en<br />el siglo XXI
              </h2>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.07}>
                <TiltCard {...f} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: "72px 24px", borderTop: "1px solid #111", borderBottom: "1px solid #111" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 40, textAlign: "center" }}>
          {[["2+","Barberías activas"],["100%","Uptime"],["24/7","Reservas online"],["$0","Sin comisión por reserva"]].map(([n,l], i) => (
            <Reveal key={l} delay={i * 0.1}>
              <p className="display" style={{ fontSize: "clamp(48px,6vw,68px)", color: O, marginBottom: 6, lineHeight: 1 }}>{n}</p>
              <p style={{ fontSize: 13, color: "#444" }}>{l}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── PRECIOS ── */}
      <section id="precios" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Precios</p>
              <h2 className="display" style={{ fontSize: "clamp(42px,6vw,64px)", textTransform: "uppercase", letterSpacing: -1 }}>
                Sin letra chica
              </h2>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 16 }}>
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.1}>
                <div className="plan-card" style={{ height: "100%", background: plan.highlight ? "rgba(255,107,44,.04)" : "#0A0A0A", border: `1px solid ${plan.highlight ? O : "#181818"}`, borderRadius: 22, padding: 30, position: "relative", boxShadow: plan.highlight ? `0 0 60px rgba(255,107,44,.1)` : "none" }}>
                  {plan.highlight && (
                    <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: O, color: "#fff", fontSize: 10, fontWeight: 800, padding: "5px 16px", borderRadius: 20, letterSpacing: 1.5, whiteSpace: "nowrap" }}>MÁS POPULAR</div>
                  )}
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#3A3A3A", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>{plan.name}</p>
                  <p className="display" style={{ fontSize: "clamp(30px,4vw,40px)", color: "#fff", marginBottom: 4 }}>{plan.price}</p>
                  <p style={{ fontSize: 13, color: "#333", marginBottom: 26 }}>{plan.sub}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 28 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: O2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Check size={11} color={O} strokeWidth={3} />
                        </div>
                        <span style={{ fontSize: 14, color: "#666" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link to={plan.href} style={{ display: "block", padding: "13px", borderRadius: 11, background: plan.highlight ? O : "#111", color: plan.highlight ? "#fff" : "#4A4A4A", fontWeight: 700, fontSize: 14, textAlign: "center", textDecoration: "none", border: plan.highlight ? "none" : "1px solid #1C1C1C", boxSizing: "border-box", boxShadow: plan.highlight ? `0 0 28px rgba(255,107,44,.28)` : "none" }}>
                    {plan.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "100px 24px 120px", background: "#050505", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", bottom: -100, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(255,107,44,.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <Reveal>
          <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
            <div style={{ marginBottom: 28, animation: "float 4.5s ease-in-out infinite" }}>
              <img src="/LogoC.png" alt="Clippr" style={{ width: 88, height: 88, objectFit: "contain", filter: "drop-shadow(0 0 44px rgba(255,107,44,.7))" }} />
            </div>
            <h2 className="display" style={{ fontSize: "clamp(48px,8vw,80px)", textTransform: "uppercase", lineHeight: 0.95, letterSpacing: -2, marginBottom: 20 }}>
              EMPIEZA HOY.<br /><span style={{ color: O }}>30 DÍAS GRATIS.</span>
            </h2>
            <p style={{ color: "#444", fontSize: 16, marginBottom: 40 }}>Sin tarjeta de crédito. Sin compromisos.</p>
            <Link to="/register" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "18px 50px", background: O, color: "#fff", borderRadius: 14, fontWeight: 900, fontSize: 18, textDecoration: "none", boxShadow: `0 0 70px rgba(255,107,44,.5), 0 8px 30px rgba(0,0,0,.4)` }}>
              Quiero mi barbería digital <ArrowRight size={20} />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #0F0F0F", padding: "28px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 }}>
          <img src="/LogoC.png" alt="Clippr" style={{ width: 26, height: 26, objectFit: "contain", opacity: .6 }} />
          <span className="display" style={{ fontSize: 17, color: "#fff" }}>Clippr</span>
        </div>
        <p style={{ color: "#222", fontSize: 13 }}>© 2026 Clippr · Todos los derechos reservados</p>
      </footer>
    </div>
  );
}
