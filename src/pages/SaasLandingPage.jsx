import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { applyTheme } from "../lib/applyTheme";
import { supabase } from "../lib/supabase";
import { ArrowRight, Check, Scissors, Smartphone, Calendar, BarChart3, Users, Zap, Star, ChevronDown, Menu, X, ChevronRight } from "lucide-react";

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
  @keyframes float1 { 0%,100%{transform:translateY(0px)   rotate(-3deg)} 50%{transform:translateY(-18px)  rotate(-2deg)} }
  @keyframes float2 { 0%,100%{transform:translateY(-8px)  rotate(0deg)}  50%{transform:translateY(10px)   rotate(1deg)}  }
  @keyframes float3 { 0%,100%{transform:translateY(-4px)  rotate(3deg)}  50%{transform:translateY(-20px)  rotate(2deg)}  }

  @media(max-width:640px) {
    .desk-links { display:none !important; }
    .mob-nav-actions { display:flex !important; }
    .hero-logo { width:90px !important; height:90px !important; }
    .phones-section { padding: 40px 12px 60px !important; }
    .phones-row { gap: 8px !important; transform: scale(0.78); transform-origin: center bottom; }
  }
  @media(min-width:641px) {
    .mob-nav-actions { display:none !important; }
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

// ── Phone Showcase ────────────────────────────────────────────
const PHONES = [
  {
    label: "Cliente reserva",
    anim: "float1 6s ease-in-out infinite",
    rotate: "-3deg",
    glow: "rgba(255,107,44,0.35)",
    offset: "20px",
    screen: [
      { type: "header", text: "NobleCut ✂️" },
      { type: "step",   text: "Fade + Barba" , price: "$45.000" },
      { type: "slot",   text: "Hoy · 14:30" },
      { type: "btn",    text: "Confirmar reserva" },
    ],
  },
  {
    label: "Panel admin",
    anim: "float2 7s ease-in-out infinite 0.8s",
    rotate: "0deg",
    glow: "rgba(255,107,44,0.5)",
    offset: "0px",
    scale: 1.08,
    screen: [
      { type: "header", text: "Dashboard" },
      { type: "stat",   vals: [["18","Reservas"],["$245k","Ingresos"]] },
      { type: "row",    time:"09:00", name:"Carlos M.", tag:"Fade" },
      { type: "row",    time:"10:30", name:"Ana P.",    tag:"Corte" },
      { type: "row",    time:"11:30", name:"David R.",  tag:"📍 Dom." },
    ],
  },
  {
    label: "Portal barbero",
    anim: "float3 5.5s ease-in-out infinite 1.4s",
    rotate: "3deg",
    glow: "rgba(255,107,44,0.3)",
    offset: "20px",
    screen: [
      { type: "header", text: "Mi agenda" },
      { type: "earns",  text: "Hoy ganaste", val: "$62.500" },
      { type: "row",    time:"14:00", name:"Luis T.",  tag:"Fade" },
      { type: "row",    time:"15:30", name:"Pedro R.", tag:"Barba" },
      { type: "btn2",   text: "Abrir caja →" },
    ],
  },
];

function PhoneScreen({ items }) {
  return (
    <div style={{ background:"#0A0A0A", borderRadius:20, padding:"10px 8px", display:"flex", flexDirection:"column", gap:6, height:"100%", boxSizing:"border-box" }}>
      {items.map((item, i) => {
        if (item.type === "header") return (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 4px 8px", borderBottom:"1px solid #1A1A1A" }}>
            <img src="/LogoC.png" alt="" style={{ width:16, height:16, objectFit:"contain" }} />
            <span style={{ fontWeight:800, fontSize:11, color:"#fff" }}>{item.text}</span>
          </div>
        );
        if (item.type === "step") return (
          <div key={i} style={{ background:"#141414", borderRadius:10, padding:"8px 10px" }}>
            <p style={{ fontSize:11, fontWeight:700, color:"#fff", marginBottom:2 }}>{item.text}</p>
            <p style={{ fontSize:13, fontWeight:900, color:O }}>{item.price}</p>
          </div>
        );
        if (item.type === "slot") return (
          <div key={i} style={{ background:"rgba(255,107,44,0.08)", border:"1px solid rgba(255,107,44,0.25)", borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
            <p style={{ fontSize:11, fontWeight:700, color:O }}>{item.text}</p>
          </div>
        );
        if (item.type === "btn") return (
          <div key={i} style={{ background:O, borderRadius:10, padding:"9px", textAlign:"center", marginTop:"auto" }}>
            <p style={{ fontSize:10, fontWeight:800, color:"#fff" }}>{item.text}</p>
          </div>
        );
        if (item.type === "btn2") return (
          <div key={i} style={{ background:"#141414", border:"1px solid #2A2A2A", borderRadius:10, padding:"8px", textAlign:"center", marginTop:"auto" }}>
            <p style={{ fontSize:10, fontWeight:700, color:O }}>{item.text}</p>
          </div>
        );
        if (item.type === "stat") return (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
            {item.vals.map(([v,l]) => (
              <div key={l} style={{ background:"#141414", borderRadius:9, padding:"7px 8px" }}>
                <p style={{ fontSize:13, fontWeight:900, color:"#fff" }}>{v}</p>
                <p style={{ fontSize:8, color:"#444", marginTop:1 }}>{l}</p>
              </div>
            ))}
          </div>
        );
        if (item.type === "earns") return (
          <div key={i} style={{ background:"rgba(34,197,94,0.07)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
            <p style={{ fontSize:9, color:"#888", marginBottom:2 }}>{item.text}</p>
            <p style={{ fontSize:16, fontWeight:900, color:"#22c55e" }}>{item.val}</p>
          </div>
        );
        if (item.type === "row") return (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 6px", background:"#141414", borderRadius:8 }}>
            <span style={{ fontSize:9, fontWeight:800, color:O, width:28, flexShrink:0 }}>{item.time}</span>
            <span style={{ fontSize:9, color:"#888", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</span>
            <span style={{ fontSize:8, color:"#555", flexShrink:0 }}>{item.tag}</span>
          </div>
        );
        return null;
      })}
    </div>
  );
}

function PhoneShowcase() {
  return (
    <section className="phones-section" style={{ padding:"20px 20px 100px", overflow:"hidden" }}>
      <Reveal>
        <p style={{ textAlign:"center", color:"#333", fontSize:12, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:60 }}>
          Una app. Tres portales.
        </p>
      </Reveal>
      <div className="phones-row" style={{ display:"flex", justifyContent:"center", alignItems:"flex-end", gap:24, maxWidth:700, margin:"0 auto" }}>
        {PHONES.map((ph, i) => (
          <div key={i}
            style={{
              animation: ph.anim,
              transform: `rotate(${ph.rotate}) translateY(${ph.offset})`,
              flexShrink: 0,
              position:"relative",
              zIndex: i === 1 ? 2 : 1,
              scale: ph.scale ? String(ph.scale) : "1",
            }}>
            {/* Glow */}
            <div style={{ position:"absolute", inset:-20, borderRadius:50, background:`radial-gradient(circle, ${ph.glow} 0%, transparent 70%)`, filter:"blur(20px)", pointerEvents:"none" }} />
            {/* Phone frame */}
            <div style={{
              width: i === 1 ? 155 : 130,
              height: i === 1 ? 310 : 260,
              background:"#0E0E0E",
              borderRadius:28,
              border:"2px solid #2A2A2A",
              padding:8,
              boxShadow:`0 30px 80px rgba(0,0,0,0.8), 0 0 0 1px #111`,
              position:"relative",
            }}>
              {/* Notch */}
              <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:40, height:6, background:"#0E0E0E", borderRadius:"0 0 6px 6px", zIndex:10, borderBottom:"2px solid #2A2A2A" }} />
              <PhoneScreen items={ph.screen} />
            </div>
            {/* Label */}
            <p style={{ textAlign:"center", fontSize:11, color:"#444", fontWeight:600, marginTop:14, letterSpacing:0.5 }}>{ph.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Supplier Banner ───────────────────────────────────────────
function SupplierBanner() {
  const { data: supplier } = useQuery({
    queryKey: ["landing-supplier"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("id,name,description,logo_url,slug,theme_color").eq("is_active", true).limit(1).maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!supplier) return null;

  const brand = supplier.theme_color || O;
  const slug  = supplier.slug || supplier.id;

  return (
    <section style={{ padding:"72px 20px", background:"#050505", borderTop:"1px solid #111" }}>
      <div style={{ maxWidth:900, margin:"0 auto" }}>
        <Reveal>
          <div style={{ background:"#0C0C0C", border:`1px solid #1A1A1A`, borderRadius:24, padding:"40px 36px", display:"flex", alignItems:"center", gap:32, flexWrap:"wrap" }}>
            {/* Logo */}
            <div style={{ flexShrink:0 }}>
              {supplier.logo_url ? (
                <img src={supplier.logo_url} alt={supplier.name} style={{ width:80, height:80, borderRadius:18, objectFit:"cover", border:"1px solid #222" }} />
              ) : (
                <div style={{ width:80, height:80, borderRadius:18, background:`rgba(255,107,44,0.1)`, border:`2px solid ${brand}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:32, fontWeight:900, color:brand }}>{supplier.name[0]}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex:1, minWidth:200 }}>
              <p style={{ color:brand, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Proveedor oficial</p>
              <h3 className="display" style={{ fontSize:"clamp(22px,4vw,34px)", color:"#fff", marginBottom:8, letterSpacing:-0.5 }}>{supplier.name}</h3>
              {supplier.description && (
                <p style={{ color:"#555", fontSize:14, lineHeight:1.6, maxWidth:480 }}>{supplier.description}</p>
              )}
            </div>

            {/* CTA */}
            <div style={{ flexShrink:0 }}>
              <Link to={`/catalogo/${slug}`}
                style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"14px 28px", background:brand, color:"#fff", borderRadius:12, fontWeight:800, fontSize:15, textDecoration:"none", boxShadow:`0 0 30px ${brand}44` }}>
                Ver catálogo <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
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
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(false);

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

  // Capturar evento de instalación PWA (Android/Chrome)
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isInstalled = window.matchMedia("(display-mode: standalone)").matches;
  const showInstallBanner = !isInstalled && !installDismissed && (installPrompt || isIOS);

  async function handleInstall() {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setInstallDismissed(true);
      setInstallPrompt(null);
    }
  }

  return (
    <div className="body-font" style={{ background:"#080808", color:"#fff", minHeight:"100vh", overflowX:"hidden" }}>
      <style>{CSS}</style>

      {/* Banner de instalación PWA */}
      {showInstallBanner && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:999, background:"#141414", borderTop:"1px solid #2A2A2A", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <img src="/LogoC.png" alt="Clippr" style={{ width:36, height:36, borderRadius:10, objectFit:"contain" }} />
            <div>
              <p style={{ fontWeight:700, fontSize:14, color:"#fff", margin:0 }}>Instalá Clippr</p>
              <p style={{ fontSize:12, color:"#555", margin:0 }}>
                {isIOS ? "Tocá compartir → \"Agregar a pantalla de inicio\"" : "Agregala a tu pantalla de inicio"}
              </p>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            {!isIOS && (
              <button onClick={handleInstall}
                style={{ padding:"8px 16px", borderRadius:8, background:"#FF6B2C", border:"none", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                Instalar
              </button>
            )}
            <button onClick={() => setInstallDismissed(true)}
              style={{ padding:"8px 12px", borderRadius:8, background:"transparent", border:"1px solid #2A2A2A", color:"#555", fontSize:13, cursor:"pointer" }}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── MOBILE NAV DRAWER ── */}
      <div className={`mob-nav${menuOpen ? " open" : ""}`}>
        <button onClick={() => setMenuOpen(false)} style={{ position:"absolute", top:20, right:20, background:"none", border:"none", color:"#fff", cursor:"pointer" }}>
          <X size={28} />
        </button>
        <a href="#features" onClick={() => setMenuOpen(false)}>Funciones</a>
        <a href="#precios"  onClick={() => setMenuOpen(false)}>Precios</a>
        <Link to="/login"   onClick={() => setMenuOpen(false)} style={{ color:"#fff", fontSize:22, fontWeight:700, textDecoration:"none", fontFamily:"'Barlow Condensed',sans-serif" }}>Iniciar sesión</Link>
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
            <Link to="/login"   className="nav-link">Iniciar sesión</Link>
            <Link to="/register" style={{ padding:"9px 18px", background:O, color:"#fff", borderRadius:10, fontWeight:700, fontSize:14, textDecoration:"none", boxShadow:`0 0 18px rgba(255,107,44,.35)` }}>
              Empezar gratis
            </Link>
          </div>

          {/* Mobile: Login visible + hamburger */}
          <div className="mob-nav-actions" style={{ display:"none", alignItems:"center", gap:8 }}>
            <Link to="/login" style={{ padding:"7px 14px", background:"#141414", border:"1px solid #222", borderRadius:9, color:"#fff", fontSize:13, fontWeight:700, textDecoration:"none" }}>
              Iniciar sesión
            </Link>
            <button className="mob-menu-btn" onClick={() => setMenuOpen(true)}
              style={{ background:"#141414", border:"1px solid #222", borderRadius:9, padding:"7px 9px", cursor:"pointer", color:"#fff", alignItems:"center", justifyContent:"center" }}>
              <Menu size={20} />
            </button>
          </div>
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

      {/* ── 3 PHONES ── */}
      <PhoneShowcase />

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

      {/* ── PROVEEDOR OFICIAL ── */}
      <SupplierBanner />

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
