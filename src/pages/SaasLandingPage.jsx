import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { applyTheme } from "../lib/applyTheme";
import { supabase } from "../lib/supabase";
import { ArrowRight, Check, Scissors, Smartphone, Calendar, BarChart3, Users, Zap, Star, ChevronDown, Menu, X, ChevronRight } from "lucide-react";
import SupplierCatalog from "../features/supplier/components/SupplierCatalog";

const O  = "#FF6B2C";
const O2 = "rgba(255,107,44,0.1)";

async function fetchPricing() {
  const { data } = await supabase
    .from("saas_config")
    .select("base_price, price_per_barber, trial_days")
    .eq("id", 1)
    .maybeSingle();
  return data ?? { base_price: 11990, price_per_barber: 2990, trial_days: 30 };
}

const FEATURES = [
  { icon: <Calendar size={20} />,    title: "Reservas 24/7",          desc: "Tus clientes reservan solos, en cualquier momento. Tú solo atiendes." },
  { icon: <Smartphone size={20} />,  title: "Portal del barbero",      desc: "Cada barbero tiene su propia app: agenda, cobros y comisiones en el celular." },
  { icon: <Users size={20} />,       title: "Tu equipo bajo control",  desc: "Horarios, comisiones y agenda por barbero. Todo en un solo panel." },
  { icon: <BarChart3 size={20} />,   title: "Caja en tiempo real",     desc: "Ves cuánto entra y cuánto le toca a cada barbero, al instante." },
  { icon: <Zap size={20} />,         title: "Multi-sede",              desc: "Varias sedes, un solo panel. Escala sin límites." },
  { icon: <Scissors size={20} />,    title: "Tu página propia",        desc: "Con tu link, tus servicios, tus precios y tus barberos. Sin comisiones." },
];

const FAQS = [
  { q: "¿Necesito saber de tecnología para configurarlo?", a: "No. El setup dura menos de 15 minutos: creás tu cuenta, agregás tus barberos y servicios, y ya tenés tu página lista para recibir reservas." },
  { q: "¿Qué pasa cuando termina el período de prueba?", a: "Te avisamos con anticipación. Si querés continuar, elegís tu plan y seguís sin perder nada. Si no, tu cuenta se suspende y nada se cobra automáticamente." },
  { q: "¿Puedo tener varios barberos en mi equipo?", a: "Sí. El plan Pro incluye hasta el número de barberos que necesites, pagando una tarifa adicional por cada uno. Cada barbero tiene su propio portal con su agenda y cobros." },
  { q: "¿Funciona bien en el celular?", a: "100%. Tanto el panel admin como el portal del barbero están optimizados para móvil. Tus clientes también reservan desde el teléfono sin descargar nada." },
  { q: "¿Cobran comisión por cada reserva?", a: "No. Pagás solo el plan mensual. No hay comisiones por reserva, por venta ni por nada más. Lo que entra en tu caja es tuyo." },
  { q: "¿Puedo cancelar cuando quiera?", a: "Sí, sin contratos ni permanencia. Cancelás desde tu panel y no se vuelve a cobrar. Sin preguntas, sin burocracia." },
];

function buildPlans(cfg) {
  const base   = cfg?.base_price       ?? 11990;
  const perBar = cfg?.price_per_barber ?? 2990;
  const days   = cfg?.trial_days       ?? 30;
  const fmt    = n => `$${Number(n).toLocaleString("es-CL")}`;
  return [
    {
      name: "Trial", price: "Gratis", sub: `${days} días · sin tarjeta`,
      features: ["Hasta 2 barberos", "Reservas ilimitadas", "Portal del barbero", "Panel admin completo"],
      cta: "Empezar gratis", href: "/register", highlight: false,
    },
    {
      name: "Pro", price: fmt(base), sub: `+ ${fmt(perBar)} por barbero adicional`,
      features: ["Reservas online 24/7", "Portal del barbero", "Caja y comisiones", "Inventario con scanner", "Soporte por WhatsApp"],
      cta: "Empezar ahora", href: "/register", highlight: true,
    },
    {
      name: "Cadenas", price: "A medida", sub: "para múltiples sedes",
      features: ["Sedes ilimitadas", "Gestión centralizada", "Reportes por sede", "Soporte dedicado"],
      cta: "Hablar con nosotros", href: "https://wa.me/56948487391", highlight: false,
    },
  ];
}

const WORDS = ["barbería.", "negocio.", "equipo.", "caja."];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Inter:wght@400;500;600;700;800;900&display=swap');
  html { scroll-behavior: smooth; }

  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes float { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-12px) rotate(1deg)} }
  @keyframes rise  {
    0%  { transform:translateY(0) scale(1); opacity:0; }
    10% { opacity:.18; }
    85% { opacity:.07; }
    100%{ transform:translateY(-260px) scale(2.4); opacity:0; }
  }
  @keyframes rise2 {
    0%  { transform:translateY(0) scale(1); opacity:0; }
    10% { opacity:.13; }
    85% { opacity:.05; }
    100%{ transform:translateY(-220px) translateX(28px) scale(2); opacity:0; }
  }

  .display    { font-family:'Barlow Condensed',sans-serif; font-weight:900; }
  .body-font  { font-family:'Inter',sans-serif; }
  .nav-link   { color:#4A4A4A; font-size:14px; text-decoration:none; transition:color .2s; }
  .nav-link:hover { color:#fff; }
  .plan-card  { transition:transform .28s cubic-bezier(.22,1,.36,1); }
  .plan-card:hover { transform:translateY(-5px); }
  .btn-ghost  { transition:border-color .2s,color .2s !important; }
  .btn-ghost:hover { border-color:#444 !important; color:#fff !important; }

  /* Mobile nav drawer */
  .mob-nav { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:200; flex-direction:column; align-items:center; justify-content:center; gap:32px; }
  .mob-nav.open { display:flex; }
  .mob-nav a { color:#fff; font-size:22px; font-weight:700; text-decoration:none; font-family:'Barlow Condensed',sans-serif; letter-spacing:-0.5px; }

  /* Hide desktop links on mobile */
  @media(max-width:640px) {
    .desk-links { display:none !important; }
    .mob-menu-btn { display:flex !important; }
    .mockup-section { display:none !important; }
    .hero-logo { width:90px !important; height:90px !important; }
  }
  @media(min-width:641px) {
    .mob-menu-btn { display:none !important; }
  }
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
          if (text === word) setTimeout(() => setDel(true), 1800);
        }, 90);
    return () => clearTimeout(t);
  }, [text, deleting, idx]);

  return (
    <span style={{ color: O }}>
      {text}
      <span style={{ borderRight: `3px solid ${O}`, marginLeft: 2, animation: "blink .7s step-end infinite" }} />
    </span>
  );
}

// ── 3D tilt card (solo desktop) ───────────────────────────────
function TiltCard({ icon, title, desc }) {
  const ref = useRef();
  function onMove(e) {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x*14}deg) rotateX(${-y*14}deg) scale(1.03)`;
    el.style.boxShadow = `${-x*16}px ${y*16}px 32px rgba(255,107,44,.12)`;
  }
  function onLeave() {
    const el = ref.current; if (!el) return;
    el.style.transform = "none";
    el.style.boxShadow = "none";
  }
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ background:"#0E0E0E", border:"1px solid #1C1C1C", borderRadius:18, padding:24, transition:"transform .15s ease,box-shadow .15s ease", willChange:"transform" }}>
      <div style={{ width:44, height:44, background:O2, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", color:O, marginBottom:14 }}>
        {icon}
      </div>
      <p style={{ fontWeight:700, fontSize:15, color:"#fff", marginBottom:6 }}>{title}</p>
      <p style={{ color:"#555", fontSize:13, lineHeight:1.6 }}>{desc}</p>
    </div>
  );
}

// ── Scroll reveal ─────────────────────────────────────────────
function Reveal({ children, delay = 0 }) {
  const ref = useRef();
  const [v, setV] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity:v?1:0, transform:v?"translateY(0)":"translateY(28px)", transition:`opacity .7s ${delay}s cubic-bezier(.22,1,.36,1),transform .7s ${delay}s cubic-bezier(.22,1,.36,1)` }}>
      {children}
    </div>
  );
}

// ── Parallax (solo desktop) ───────────────────────────────────
function useParallax(f = 0.22) {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (window.innerWidth < 641) return;
    const fn = () => setY(window.scrollY * f);
    window.addEventListener("scroll", fn, { passive:true });
    return () => window.removeEventListener("scroll", fn);
  }, [f]);
  return y;
}

// ── FAQ Accordion ─────────────────────────────────────────────
function FaqList() {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i} style={{ background:"#0C0C0C", border:`1px solid ${isOpen ? "#2A2A2A" : "#161616"}`, borderRadius:14, overflow:"hidden", transition:"border-color .2s" }}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 20px", background:"none", border:"none", cursor:"pointer", gap:16, textAlign:"left" }}
            >
              <span style={{ fontWeight:600, fontSize:15, color:"#ddd", lineHeight:1.4 }}>{item.q}</span>
              <ChevronRight size={16} color="#444" style={{ flexShrink:0, transform: isOpen ? "rotate(90deg)" : "none", transition:"transform .25s" }} />
            </button>
            {isOpen && (
              <div style={{ padding:"0 20px 18px" }}>
                <p style={{ color:"#555", fontSize:14, lineHeight:1.7 }}>{item.a}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function SaasLandingPage() {
  const py = useParallax(0.22);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: pricingCfg } = useQuery({
    queryKey: ["saas-config-public"],
    queryFn:  fetchPricing,
    staleTime: 5 * 60 * 1000,
  });
  const PLANS = buildPlans(pricingCfg);

  useEffect(() => {
    applyTheme({ theme_mode:"dark", theme_color:"#FF6B2C", theme_font:"Inter" });
  }, []);

  // Bloquear scroll cuando menú abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <div className="body-font" style={{ background:"#080808", color:"#fff", minHeight:"100vh", overflowX:"hidden" }}>
      <style>{CSS}</style>

      {/* ── MOBILE NAV DRAWER ── */}
      <div className={`mob-nav${menuOpen ? " open" : ""}`}>
        <button onClick={() => setMenuOpen(false)} style={{ position:"absolute", top:20, right:20, background:"none", border:"none", color:"#fff", cursor:"pointer" }}>
          <X size={28} />
        </button>
        <a href="#features" onClick={() => setMenuOpen(false)}>Funciones</a>
        <a href="#precios"  onClick={() => setMenuOpen(false)}>Precios</a>
        <Link to="/login"   onClick={() => setMenuOpen(false)} style={{ color:"#fff", fontSize:22, fontWeight:700, textDecoration:"none", fontFamily:"'Barlow Condensed',sans-serif" }}>Login</Link>
        <Link to="/register" onClick={() => setMenuOpen(false)} style={{ padding:"14px 36px", background:O, color:"#fff", borderRadius:12, fontWeight:700, fontSize:18, textDecoration:"none" }}>
          Empezar gratis
        </Link>
      </div>

      {/* ── NAV ── */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, borderBottom:"1px solid #111", background:"rgba(8,8,8,0.95)", backdropFilter:"blur(20px)", padding:"12px 20px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          {/* Logo */}
          <Link to="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none" }}>
            <img src="/LogoC.png" alt="Clippr" style={{ width:32, height:32, objectFit:"contain", filter:"drop-shadow(0 0 8px rgba(255,107,44,.5))" }} />
            <span className="display" style={{ fontSize:20, color:"#fff" }}>Clippr</span>
          </Link>

          {/* Desktop links */}
          <div className="desk-links" style={{ display:"flex", alignItems:"center", gap:24 }}>
            <a href="#features" className="nav-link">Funciones</a>
            <a href="#precios"  className="nav-link">Precios</a>
            <Link to="/login"   className="nav-link">Login</Link>
            <Link to="/register" style={{ padding:"9px 18px", background:O, color:"#fff", borderRadius:10, fontWeight:700, fontSize:14, textDecoration:"none", boxShadow:`0 0 18px rgba(255,107,44,.35)` }}>
              Empezar gratis
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button className="mob-menu-btn" onClick={() => setMenuOpen(true)}
            style={{ background:"#141414", border:"1px solid #222", borderRadius:9, padding:"7px 9px", cursor:"pointer", color:"#fff", alignItems:"center", justifyContent:"center" }}>
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position:"relative", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"100px 20px 70px", overflow:"hidden" }}>

        {/* Smoke */}
        {[
          { w:300, h:300, l:"5%",  b:-60, a:"rise  10s ease-in-out infinite" },
          { w:240, h:240, r:"8%",  b:-40, a:"rise2 13s ease-in-out infinite 2s" },
          { w:180, h:180, l:"44%", b:-30, a:"rise  15s ease-in-out infinite 5s" },
        ].map((s,i) => (
          <div key={i} style={{ position:"absolute", bottom:s.b, left:s.l, right:s.r, width:s.w, height:s.h, borderRadius:"50%", background:"rgba(255,107,44,.06)", filter:"blur(52px)", pointerEvents:"none", animation:s.a }} />
        ))}

        {/* Radial glow */}
        <div style={{ position:"absolute", top:"40%", left:"50%", transform:`translate(-50%, calc(-50% + ${py}px))`, width:"min(700px,90vw)", height:"min(700px,90vw)", background:"radial-gradient(circle,rgba(255,107,44,.09) 0%,transparent 65%)", pointerEvents:"none" }} />

        <div style={{ position:"relative", zIndex:2, textAlign:"center", maxWidth:820, width:"100%" }}>

          {/* Logo flotante */}
          <div style={{ marginBottom:24, animation:"float 5s ease-in-out infinite" }}>
            <img src="/LogoC.png" alt="Clippr" className="hero-logo" style={{ width:120, height:120, objectFit:"contain", filter:"drop-shadow(0 0 32px rgba(255,107,44,.6)) drop-shadow(0 0 80px rgba(255,107,44,.18))" }} />
          </div>

          {/* Badge */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 14px", background:"rgba(255,107,44,.07)", border:"1px solid rgba(255,107,44,.2)", borderRadius:20, marginBottom:22 }}>
            <Zap size={10} color={O} />
            <span style={{ color:O, fontSize:10, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase" }}>Software para barberías · Chile</span>
          </div>

          {/* Headline */}
          <h1 className="display" style={{ fontSize:"clamp(52px,10vw,110px)", lineHeight:0.95, letterSpacing:-2, marginBottom:20, textTransform:"uppercase" }}>
            DIGITALIZA<br />TU <Typewriter />
          </h1>

          <p style={{ color:"#555", fontSize:"clamp(14px,2vw,17px)", lineHeight:1.7, maxWidth:440, margin:"0 auto 36px" }}>
            Reservas online, portal del barbero, caja y comisiones en tiempo real. Todo en un solo lugar.
          </p>

          {/* CTAs — apilados en móvil */}
          <div style={{ display:"flex", flexDirection:"column", gap:12, alignItems:"center", marginBottom:44 }}>
            <Link to="/register" style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"15px 36px", background:O, color:"#fff", borderRadius:12, fontWeight:800, fontSize:16, textDecoration:"none", boxShadow:`0 0 40px rgba(255,107,44,.45),0 4px 20px rgba(0,0,0,.5)`, width:"100%", maxWidth:320, justifyContent:"center" }}>
              Empezar gratis <ArrowRight size={18} />
            </Link>
            <Link to="/noblecut" className="btn-ghost" style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"14px 28px", border:"1px solid #222", color:"#666", borderRadius:12, fontWeight:600, fontSize:15, textDecoration:"none", width:"100%", maxWidth:320, justifyContent:"center" }}>
              Ver demo en vivo
            </Link>
          </div>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <div style={{ display:"flex", gap:3 }}>{[1,2,3,4,5].map(i => <Star key={i} size={12} fill={O} color={O} />)}</div>
            <span style={{ color:"#3A3A3A", fontSize:12 }}>Usado por barberías en Chile</span>
          </div>
        </div>

        <a href="#features" style={{ position:"absolute", bottom:28, left:"50%", transform:"translateX(-50%)", color:"#222", textDecoration:"none", animation:"float 2.5s ease-in-out infinite", zIndex:2 }}>
          <ChevronDown size={24} />
        </a>
      </section>

      {/* ── MOCKUP — solo desktop ── */}
      <section className="mockup-section" style={{ padding:"0 24px 100px" }}>
        <Reveal>
          <div style={{ maxWidth:1000, margin:"0 auto" }}>
            <div style={{ background:"#0C0C0C", border:"1px solid #1A1A1A", borderRadius:22, padding:3, overflow:"hidden", boxShadow:"0 50px 130px rgba(0,0,0,.7)" }}>
              <div style={{ background:"#141414", borderRadius:"19px 19px 0 0", padding:"10px 16px", display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ display:"flex", gap:6 }}>
                  {["#ef4444","#f59e0b","#22c55e"].map(c => <div key={c} style={{ width:10, height:10, borderRadius:"50%", background:c }} />)}
                </div>
                <div style={{ flex:1, background:"#0C0C0C", borderRadius:6, padding:"4px 12px", fontSize:11, color:"#333", textAlign:"center" }}>clippr.app/admin</div>
              </div>
              <div style={{ padding:18, display:"grid", gridTemplateColumns:"155px 1fr", gap:14, minHeight:260 }}>
                <div style={{ background:"#080808", borderRadius:12, padding:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:16 }}>
                    <img src="/LogoC.png" alt="" style={{ width:20, height:20, objectFit:"contain" }} />
                    <span className="display" style={{ fontSize:15, color:"#fff" }}>Clippr</span>
                  </div>
                  {["Dashboard","Reservas","Barberos","Servicios","Caja"].map((item,i) => (
                    <div key={item} style={{ padding:"7px 10px", borderRadius:8, marginBottom:3, background:i===0?"rgba(255,107,44,.1)":"transparent", color:i===0?O:"#2E2E2E", fontSize:11, fontWeight:i===0?700:400 }}>{item}</div>
                  ))}
                </div>
                <div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
                    {[["18","Reservas"],["$245k","Ingresos"],["6","Domicilios"],["12","Clientes"]].map(([v,l]) => (
                      <div key={l} style={{ background:"#080808", borderRadius:10, padding:10 }}>
                        <p style={{ fontSize:16, fontWeight:900, color:"#fff" }}>{v}</p>
                        <p style={{ fontSize:9, color:"#2E2E2E", marginTop:2 }}>{l}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:"#080808", borderRadius:10, padding:12 }}>
                    <p style={{ fontSize:10, color:"#2E2E2E", marginBottom:8, fontWeight:700, letterSpacing:1 }}>RESERVAS DE HOY</p>
                    {[["09:00","Carlos M.","Fade","$35.000"],["10:30","Ana P.","Corte + barba","$45.000"],["11:30","David R.","📍 Domicilio","$60.000"]].map(([h,c,s,p]) => (
                      <div key={h} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:"1px solid #0F0F0F" }}>
                        <span style={{ fontSize:11, fontWeight:800, color:"#fff", width:34, flexShrink:0 }}>{h}</span>
                        <span style={{ fontSize:11, color:"#3A3A3A", flex:1 }}>{c} · {s}</span>
                        <span style={{ fontSize:11, fontWeight:800, color:O }}>{p}</span>
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
      <section id="features" style={{ padding:"72px 20px 88px", background:"#050505" }}>
        <div style={{ maxWidth:1080, margin:"0 auto" }}>
          <Reveal>
            <div style={{ textAlign:"center", marginBottom:48 }}>
              <p style={{ color:O, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>Funciones</p>
              <h2 className="display" style={{ fontSize:"clamp(38px,6vw,60px)", textTransform:"uppercase", letterSpacing:-1 }}>
                Tu barbería en<br />el siglo XXI
              </h2>
            </div>
          </Reveal>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:12 }}>
            {FEATURES.map((f,i) => (
              <Reveal key={f.title} delay={i*0.07}>
                <TiltCard {...f} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding:"80px 20px 90px", background:"#080808" }}>
        <div style={{ maxWidth:720, margin:"0 auto" }}>
          <Reveal>
            <div style={{ textAlign:"center", marginBottom:48 }}>
              <p style={{ color:O, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>FAQ</p>
              <h2 className="display" style={{ fontSize:"clamp(38px,6vw,60px)", textTransform:"uppercase", letterSpacing:-1 }}>
                Preguntas<br />frecuentes
              </h2>
            </div>
          </Reveal>
          <FaqList />
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding:"60px 20px", borderTop:"1px solid #111", borderBottom:"1px solid #111" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"32px 24px", textAlign:"center" }}>
          {[["100%","Uptime garantizado"],["24/7","Reservas online"],["$0","Sin comisión por reserva"],["∞","Clientes sin límite"]].map(([n,l],i) => (
            <Reveal key={l} delay={i*0.08}>
              <p className="display" style={{ fontSize:"clamp(40px,8vw,64px)", color:O, marginBottom:4, lineHeight:1 }}>{n}</p>
              <p style={{ fontSize:12, color:"#444" }}>{l}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── PRECIOS ── */}
      <section id="precios" style={{ padding:"80px 20px 100px" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <Reveal>
            <div style={{ textAlign:"center", marginBottom:48 }}>
              <p style={{ color:O, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>Precios</p>
              <h2 className="display" style={{ fontSize:"clamp(38px,6vw,60px)", textTransform:"uppercase", letterSpacing:-1 }}>Sin letra chica</h2>
            </div>
          </Reveal>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:14 }}>
            {PLANS.map((plan,i) => (
              <Reveal key={plan.name} delay={i*0.1}>
                <div className="plan-card" style={{ height:"100%", background:plan.highlight?"rgba(255,107,44,.04)":"#0A0A0A", border:`1px solid ${plan.highlight?O:"#181818"}`, borderRadius:20, padding:26, position:"relative", boxShadow:plan.highlight?`0 0 60px rgba(255,107,44,.1)`:"none" }}>
                  {plan.highlight && (
                    <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:O, color:"#fff", fontSize:10, fontWeight:800, padding:"4px 14px", borderRadius:20, letterSpacing:1.5, whiteSpace:"nowrap" }}>MÁS POPULAR</div>
                  )}
                  <p style={{ fontSize:11, fontWeight:700, color:"#3A3A3A", marginBottom:8, letterSpacing:1, textTransform:"uppercase" }}>{plan.name}</p>
                  <p className="display" style={{ fontSize:"clamp(28px,5vw,38px)", color:"#fff", marginBottom:4 }}>{plan.price}</p>
                  <p style={{ fontSize:12, color:"#333", marginBottom:22, lineHeight:1.4 }}>{plan.sub}</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display:"flex", alignItems:"center", gap:9 }}>
                        <div style={{ width:18, height:18, borderRadius:"50%", background:O2, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <Check size={10} color={O} strokeWidth={3} />
                        </div>
                        <span style={{ fontSize:13, color:"#666" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link to={plan.href} style={{ display:"block", padding:"12px", borderRadius:10, background:plan.highlight?O:"#111", color:plan.highlight?"#fff":"#4A4A4A", fontWeight:700, fontSize:14, textAlign:"center", textDecoration:"none", border:plan.highlight?"none":"1px solid #1C1C1C", boxSizing:"border-box", boxShadow:plan.highlight?`0 0 24px rgba(255,107,44,.28)`:"none" }}>
                    {plan.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATÁLOGO PROVEEDOR ── */}
      <SupplierCatalog />

      {/* ── CTA ── */}
      <section style={{ padding:"80px 20px 100px", background:"#050505", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", bottom:-80, left:"50%", transform:"translateX(-50%)", width:"min(600px,90vw)", height:300, background:"radial-gradient(ellipse,rgba(255,107,44,.08) 0%,transparent 70%)", pointerEvents:"none" }} />
        <Reveal>
          <div style={{ maxWidth:560, margin:"0 auto", textAlign:"center", position:"relative", zIndex:1 }}>
            <div style={{ marginBottom:24, animation:"float 4.5s ease-in-out infinite" }}>
              <img src="/LogoC.png" alt="Clippr" style={{ width:76, height:76, objectFit:"contain", filter:"drop-shadow(0 0 40px rgba(255,107,44,.7))" }} />
            </div>
            <h2 className="display" style={{ fontSize:"clamp(42px,8vw,76px)", textTransform:"uppercase", lineHeight:0.95, letterSpacing:-2, marginBottom:18 }}>
              EMPIEZA HOY.<br /><span style={{ color:O }}>30 DÍAS GRATIS.</span>
            </h2>
            <p style={{ color:"#444", fontSize:15, marginBottom:36 }}>Sin tarjeta de crédito. Sin compromisos.</p>
            <Link to="/register" style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"16px 40px", background:O, color:"#fff", borderRadius:14, fontWeight:900, fontSize:17, textDecoration:"none", boxShadow:`0 0 60px rgba(255,107,44,.5),0 8px 30px rgba(0,0,0,.4)` }}>
              Quiero mi barbería digital <ArrowRight size={18} />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:"1px solid #0F0F0F", padding:"24px 20px", textAlign:"center" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:8 }}>
          <img src="/LogoC.png" alt="Clippr" style={{ width:24, height:24, objectFit:"contain", opacity:.6 }} />
          <span className="display" style={{ fontSize:16, color:"#fff" }}>Clippr</span>
        </div>
        <p style={{ color:"#222", fontSize:12 }}>© 2026 Clippr · Todos los derechos reservados</p>
      </footer>
    </div>
  );
}
