import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { applyTheme } from "../lib/applyTheme";
import { Player } from "@lottiefiles/react-lottie-player";
import { ArrowRight, Check, Scissors, MapPin, Calendar, BarChart3, Users, Zap, Star } from "lucide-react";

const O = "#FF6B2C";

const FEATURES = [
  { icon: <Calendar size={20} />, title: "Reservas online 24/7", desc: "Tus clientes reservan solos, sin llamadas. Tú solo atiendes." },
  { icon: <MapPin size={20} />,   title: "Domicilios con mapa", desc: "El cliente pone su dirección, el barbero va. Tarifa automática." },
  { icon: <Users size={20} />,    title: "Gestión de barberos", desc: "Horarios, comisiones y agenda individual por barbero." },
  { icon: <BarChart3 size={20} />,title: "Dashboard en tiempo real", desc: "Reservas del día, ingresos y métricas desde el panel admin." },
  { icon: <Zap size={20} />,      title: "Multi-barbería", desc: "¿Tienes varias sedes? Gestiónalas desde un solo lugar." },
  { icon: <Scissors size={20} />, title: "Tu página propia", desc: "Cada barbería tiene su landing con servicios y barberos reales." },
];

const PLANS = [
  {
    name: "Trial",
    price: "Gratis",
    sub: "30 días · sin tarjeta",
    features: ["Hasta 2 barberos", "Reservas ilimitadas", "Domicilios con mapa", "Panel admin completo"],
    cta: "Empezar gratis",
    href: "/register",
    highlight: false,
  },
  {
    name: "Mensual",
    price: "$10.000",
    sub: "por barbero / mes",
    features: ["Barberos ilimitados", "Reservas ilimitadas", "Domicilios con mapa", "Dashboard + métricas", "Soporte por WhatsApp"],
    cta: "Empezar ahora",
    href: "/register",
    highlight: true,
  },
  {
    name: "Cadenas",
    price: "A medida",
    sub: "para múltiples sedes",
    features: ["Sedes ilimitadas", "Gestión centralizada", "Reportes por sede", "Soporte dedicado"],
    cta: "Hablar con nosotros",
    href: "https://wa.me/56900000000",
    highlight: false,
  },
];

export default function SaasLandingPage() {
  // La landing del SaaS siempre es oscura
  useEffect(() => {
    applyTheme({ theme_mode: "dark", theme_color: "#FF6B2C", theme_font: "Inter" });
  }, []);

  return (
    <div style={{ background: "#0A0A0A", color: "#fff", minHeight: "100vh" }}>

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, borderBottom: "1px solid #1A1A1A", background: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)", padding: "14px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, background: O, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Scissors size={15} color="#fff" />
            </div>
            <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: -0.5 }}>Clippr</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="#features" style={{ color: "#666", fontSize: 14, textDecoration: "none" }}>Funciones</a>
            <a href="#precios" style={{ color: "#666", fontSize: 14, textDecoration: "none" }}>Precios</a>
            <Link to="/admin" style={{ color: "#666", fontSize: 14, textDecoration: "none" }}>Login</Link>
            <Link to="/register" style={{ padding: "8px 18px", background: O, color: "#fff", borderRadius: 9, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop: 140, paddingBottom: 100, padding: "140px 24px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, background: "rgba(255,107,44,0.05)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "rgba(255,107,44,0.1)", border: "1px solid rgba(255,107,44,0.25)", borderRadius: 20, marginBottom: 28 }}>
            <Zap size={12} color={O} />
            <span style={{ color: O, fontSize: 12, fontWeight: 700 }}>El sistema que tu barbería necesita</span>
          </div>

          {/* Animación Lottie del barbero */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <Player
              src="/animations/Barber.json"
              autoplay
              loop
              style={{ width: 180, height: 180 }}
            />
          </div>

          <h1 style={{ fontSize: "clamp(40px, 7vw, 76px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, marginBottom: 24 }}>
            Automatiza tu barbería.<br />
            <span style={{ color: O }}>Crece sin límites.</span>
          </h1>

          <p style={{ color: "#777", fontSize: 20, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 40px" }}>
            Reservas online, domicilios con mapa, gestión de barberos y dashboard de ingresos.
            Todo en un solo lugar.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 60 }}>
            <Link to="/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 32px", background: O, color: "#fff", borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: "none" }}>
              Empezar gratis <ArrowRight size={18} />
            </Link>
            <Link to="/noblecut" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 24px", border: "1px solid #2A2A2A", color: "#A0A0A0", borderRadius: 12, fontWeight: 600, fontSize: 16, textDecoration: "none" }}>
              Ver demo en vivo
            </Link>
          </div>

          {/* Social proof */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 2 }}>
              {[1,2,3,4,5].map(i => <Star key={i} size={14} fill={O} color={O} />)}
            </div>
            <span style={{ color: "#555", fontSize: 14 }}>Usado por barberías en Chile</span>
          </div>
        </div>
      </section>

      {/* ── DEMO VISUAL ── */}
      <section style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: 20, padding: 3, overflow: "hidden" }}>
            {/* barra de browser falsa */}
            <div style={{ background: "#1A1A1A", borderRadius: "17px 17px 0 0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["#ef4444","#f59e0b","#22c55e"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
              </div>
              <div style={{ flex: 1, background: "#111", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "#555", textAlign: "center" }}>
                barberos.com/admin
              </div>
            </div>
            {/* mini dashboard preview */}
            <div style={{ padding: 24, display: "grid", gridTemplateColumns: "180px 1fr", gap: 16, minHeight: 300 }}>
              {/* sidebar mini */}
              <div style={{ background: "#0F0F0F", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <div style={{ width: 24, height: 24, background: O, borderRadius: 6 }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>Clippr</span>
                </div>
                {["Dashboard","Reservas","Barberos","Servicios"].map((item, i) => (
                  <div key={item} style={{ padding: "7px 10px", borderRadius: 8, marginBottom: 4, background: i === 0 ? "rgba(255,107,44,0.12)" : "transparent", color: i === 0 ? O : "#555", fontSize: 12, fontWeight: i === 0 ? 600 : 400 }}>
                    {item}
                  </div>
                ))}
              </div>
              {/* content mini */}
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                  {[["18","Reservas hoy"],["$245k","Ingresos"],["6","Domicilios"],["12","Clientes"]].map(([v,l]) => (
                    <div key={l} style={{ background: "#0F0F0F", borderRadius: 10, padding: "12px 14px" }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{v}</p>
                      <p style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{l}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#0F0F0F", borderRadius: 10, padding: 14 }}>
                  <p style={{ fontSize: 11, color: "#555", marginBottom: 10, fontWeight: 600 }}>RESERVAS DE HOY</p>
                  {[["09:00","Carlos M.","Fade","$35.000"],["10:30","Ana P.","Corte + barba","$45.000"],["11:30","David R.","Domicilio","$60.000"]].map(([h,c,s,p]) => (
                    <div key={h} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #1A1A1A" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", width: 36 }}>{h}</span>
                      <span style={{ fontSize: 12, color: "#A0A0A0", flex: 1 }}>{c} · {s}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: O }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "80px 24px", background: "#0D0D0D" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Funciones</p>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: "#fff" }}>Todo lo que necesitas</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: "#141414", border: "1px solid #1E1E1E", borderRadius: 16, padding: 24 }}>
                <div style={{ width: 44, height: 44, background: "rgba(255,107,44,0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: O, marginBottom: 16 }}>
                  {f.icon}
                </div>
                <p style={{ fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 8 }}>{f.title}</p>
                <p style={{ color: "#666", fontSize: 14, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRECIOS ── */}
      <section id="precios" style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Precios</p>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: "#fff" }}>Simple y transparente</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{ background: plan.highlight ? "rgba(255,107,44,0.06)" : "#141414", border: `1px solid ${plan.highlight ? O : "#1E1E1E"}`, borderRadius: 20, padding: 28, position: "relative" }}>
                {plan.highlight && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: O, color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 14px", borderRadius: 20 }}>
                    MÁS POPULAR
                  </div>
                )}
                <p style={{ fontSize: 14, fontWeight: 700, color: "#A0A0A0", marginBottom: 8 }}>{plan.name}</p>
                <p style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginBottom: 4 }}>{plan.price}</p>
                <p style={{ fontSize: 13, color: "#555", marginBottom: 24 }}>{plan.sub}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,107,44,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Check size={10} color={O} />
                      </div>
                      <span style={{ fontSize: 14, color: "#A0A0A0" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link to={plan.href} style={{ display: "block", width: "100%", padding: "12px", borderRadius: 10, background: plan.highlight ? O : "#1E1E1E", color: plan.highlight ? "#fff" : "#A0A0A0", fontWeight: 700, fontSize: 14, textAlign: "center", textDecoration: "none", border: plan.highlight ? "none" : "1px solid #2A2A2A", boxSizing: "border-box" }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding: "80px 24px 100px", background: "#0D0D0D" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: "#fff", marginBottom: 16 }}>
            Empieza hoy.<br /><span style={{ color: O }}>Gratis por 30 días.</span>
          </h2>
          <p style={{ color: "#555", fontSize: 16, marginBottom: 36 }}>Sin tarjeta de crédito. Sin compromisos.</p>
          <Link to="/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 40px", background: O, color: "#fff", borderRadius: 14, fontWeight: 800, fontSize: 18, textDecoration: "none" }}>
            Quiero mi barbería digital <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #1A1A1A", padding: "24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, background: O, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Scissors size={11} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>Clippr</span>
        </div>
        <p style={{ color: "#555", fontSize: 13 }}>© 2026 Clippr · Todos los derechos reservados</p>
      </footer>

    </div>
  );
}
