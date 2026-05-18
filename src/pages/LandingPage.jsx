import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Scissors, Clock, Star, ArrowRight, Check } from "lucide-react";
import { getServices } from "../features/booking/services/bookingService";
import { getBarbers } from "../features/booking/services/bookingService";

const O = "#FF6B2C";

function formatCOP(n) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

export default function LandingPage() {
  const { data: services = [] } = useQuery({ queryKey: ["services"], queryFn: getServices });
  const { data: barbers  = [] } = useQuery({ queryKey: ["barbers-public"], queryFn: () => getBarbers({}) });

  // agrupar servicios por categoría
  const grouped = services.reduce((acc, s) => {
    const cat = s.service_categories?.name ?? "Servicios";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div>

      {/* ── HERO ── */}
      <section style={{ minHeight: "92vh", display: "flex", alignItems: "center", padding: "60px 24px", position: "relative", overflow: "hidden" }}>
        {/* glow de fondo */}
        <div style={{ position: "absolute", top: "30%", right: "-10%", width: 500, height: 500, background: "rgba(255,107,44,0.06)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "20%", width: 300, height: 300, background: "rgba(255,107,44,0.04)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr auto", gap: 48, alignItems: "center" }}>
          <div>
            {/* badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,107,44,0.1)", border: "1px solid rgba(255,107,44,0.2)", borderRadius: 20, marginBottom: 24 }}>
              <div style={{ width: 6, height: 6, background: O, borderRadius: "50%" }} />
              <span style={{ color: O, fontSize: 12, fontWeight: 600 }}>Disponible hoy</span>
            </div>

            <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: -1, color: "#fff", marginBottom: 20 }}>
              Tu mejor corte,<br />
              <span style={{ color: O }}>donde tú estés.</span>
            </h1>

            <p style={{ color: "#A0A0A0", fontSize: 18, lineHeight: 1.6, maxWidth: 480, marginBottom: 36 }}>
              Reserva en 2 minutos. Ven al local o pide el barbero a tu puerta.
              Sin llamadas, sin filas, sin complicaciones.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to="/booking" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", background: O, color: "#fff",
                borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: "none",
              }}>
                Reservar ahora <ArrowRight size={18} />
              </Link>
              <a href="#servicios" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 24px", border: "1px solid #2A2A2A", color: "#A0A0A0",
                borderRadius: 12, fontWeight: 600, fontSize: 16, textDecoration: "none",
              }}>
                Ver servicios
              </a>
            </div>

            {/* stats */}
            <div style={{ display: "flex", gap: 32, marginTop: 48, paddingTop: 32, borderTop: "1px solid #1E1E1E" }}>
              {[["500+","Clientes"], ["4.9★","Calificación"], [barbers.length || "—","Barberos"]].map(([val, label]) => (
                <div key={label}>
                  <p style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>{val}</p>
                  <p style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card flotante derecha — solo desktop */}
          <div style={{ width: 260, flexShrink: 0 }} className="hidden lg:block">
            <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 20, padding: 20, position: "relative" }}>
              <div style={{ width: "100%", aspectRatio: "4/3", background: "#1E1E1E", borderRadius: 12, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Scissors size={40} color="#2A2A2A" />
              </div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>
                {services[0]?.name ?? "Fade premium"}
              </p>
              <p style={{ color: "#555", fontSize: 12, marginTop: 2, marginBottom: 10 }}>
                {barbers[0]?.full_name ?? "Tu barbero"} · {services[0]?.duration_min ?? 45} min
              </p>
              <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={12} fill={O} color={O} />)}
              </div>
              <Link to="/booking" style={{ display: "block", width: "100%", padding: "11px", background: O, color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 13, textAlign: "center", textDecoration: "none" }}>
                Reservar
              </Link>

              {/* badge domicilio flotante */}
              <div style={{ position: "absolute", bottom: -16, left: -16, background: "#141414", border: "1px solid #2A2A2A", borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, background: "rgba(255,107,44,0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={13} color={O} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>Domicilio</p>
                  <p style={{ fontSize: 10, color: "#555" }}>El barbero va donde estés</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICIOS ── */}
      <section id="servicios" style={{ padding: "80px 24px", background: "#0D0D0D" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 40, flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Catálogo</p>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: "#fff" }}>Nuestros servicios</h2>
            </div>
            <Link to="/booking" style={{ display: "flex", alignItems: "center", gap: 6, color: O, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              Reservar <ArrowRight size={15} />
            </Link>
          </div>

          {services.length === 0 && (
            <p style={{ color: "#555", textAlign: "center", padding: "40px 0" }}>Cargando servicios...</p>
          )}

          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 36 }}>
              <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#555", fontWeight: 700, marginBottom: 14 }}>{cat}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {items.map(s => (
                  <Link
                    key={s.id}
                    to="/booking"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "#141414", border: "1px solid #1E1E1E", borderRadius: 14, textDecoration: "none", gap: 12 }}
                  >
                    <div>
                      <p style={{ fontWeight: 600, color: "#fff", fontSize: 14, marginBottom: 4 }}>{s.name}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#555" }}>
                        <Clock size={11} />
                        <span style={{ fontSize: 12 }}>{s.duration_min} min</span>
                        {s.allows_delivery && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: O, background: "rgba(255,107,44,0.1)", padding: "1px 6px", borderRadius: 20 }}>Domicilio</span>
                        )}
                      </div>
                    </div>
                    <p style={{ fontWeight: 700, color: O, fontSize: 15, flexShrink: 0 }}>{formatCOP(s.price)}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BARBEROS ── */}
      {barbers.length > 0 && (
        <section style={{ padding: "80px 24px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <p style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>El equipo</p>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginBottom: 36 }}>Nuestros barberos</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {barbers.map(b => (
                <div key={b.id} style={{ background: "#141414", border: "1px solid #1E1E1E", borderRadius: 16, padding: 20, textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#1E1E1E", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {b.avatar_url
                      ? <img src={b.avatar_url} alt={b.full_name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 24, fontWeight: 800, color: O }}>{b.full_name[0]}</span>
                    }
                  </div>
                  <p style={{ fontWeight: 700, color: "#fff", fontSize: 15, marginBottom: 4 }}>{b.full_name}</p>
                  {b.specialty && <p style={{ color: "#555", fontSize: 12 }}>{b.specialty}</p>}
                  {b.does_delivery && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, padding: "3px 8px", background: "rgba(255,107,44,0.1)", borderRadius: 20 }}>
                      <MapPin size={10} color={O} />
                      <span style={{ fontSize: 11, color: O }}>Hace domicilios</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── DOMICILIO ── */}
      <section style={{ padding: "80px 24px", background: "#0D0D0D" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 24, padding: "48px 40px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 300, height: 300, background: "rgba(255,107,44,0.04)", borderRadius: "50%", filter: "blur(60px)" }} />
            <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr auto", gap: 40, alignItems: "center" }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "rgba(255,107,44,0.1)", border: "1px solid rgba(255,107,44,0.2)", borderRadius: 20, marginBottom: 16 }}>
                  <MapPin size={12} color={O} />
                  <span style={{ color: O, fontSize: 12, fontWeight: 600 }}>Servicio a domicilio</span>
                </div>
                <h2 style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginBottom: 14 }}>
                  El barbero va<br />donde tú estés
                </h2>
                <p style={{ color: "#A0A0A0", lineHeight: 1.6, marginBottom: 24, maxWidth: 420 }}>
                  Ingresa tu dirección, elige el barbero y listo. Calculamos la tarifa al instante.
                  Perfecto para casa, oficina o donde quieras.
                </p>
                {["Sin costo de desplazamiento oculto", "Puntualidad garantizada", "Misma calidad que en el local"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,107,44,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={11} color={O} />
                    </div>
                    <span style={{ color: "#A0A0A0", fontSize: 14 }}>{f}</span>
                  </div>
                ))}
                <Link to="/booking" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 24, padding: "13px 24px", background: O, color: "#fff", borderRadius: 12, fontWeight: 700, textDecoration: "none" }}>
                  Pedir a domicilio <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding: "80px 24px 100px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: "#fff", marginBottom: 12 }}>¿Listo para tu corte?</h2>
          <p style={{ color: "#555", fontSize: 16, marginBottom: 32 }}>Reserva ahora y recibe confirmación al instante.</p>
          <Link to="/booking" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 36px", background: O, color: "#fff", borderRadius: 14, fontWeight: 800, fontSize: 17, textDecoration: "none" }}>
            Reservar ahora <ArrowRight size={18} />
          </Link>
        </div>
      </section>

    </div>
  );
}
