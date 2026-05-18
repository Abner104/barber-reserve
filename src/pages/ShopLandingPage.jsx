import { formatCurrency } from "../lib/utils";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { ArrowRight, MapPin, Clock, Scissors, Star, Users } from "lucide-react";
import ThemeProvider from "../components/shared/ThemeProvider";
import BarberLoader from "../components/shared/BarberLoader";

const O = "#FF6B2C";

function formatCOP(n) {
  return formatCurrency(n);
}

async function getShopBySlug(slug) {
  const { data, error } = await supabase
    .from("barbershops")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Barbería no encontrada");
  return data;
}

async function getShopServices(shopId) {
  const { data, error } = await supabase
    .from("services")
    .select("*, service_categories(name)")
    .eq("shop_id", shopId)
    .eq("is_available", true)
    .order("sort_order");
  if (error) throw error;
  return data;
}

async function getShopBarbers(shopId) {
  const { data, error } = await supabase
    .from("barbers")
    .select("id, full_name, avatar_url, specialty, does_delivery")
    .eq("shop_id", shopId)
    .eq("is_active", true);
  if (error) throw error;
  return data;
}

export default function ShopLandingPage() {
  const { slug } = useParams();

  const { data: shop, isLoading: loadingShop, error: shopError } = useQuery({
    queryKey: ["shop", slug],
    queryFn: () => getShopBySlug(slug),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["shop-services", shop?.id],
    queryFn: () => getShopServices(shop.id),
    enabled: !!shop?.id,
  });

  const { data: barbers = [] } = useQuery({
    queryKey: ["shop-barbers", shop?.id],
    queryFn: () => getShopBarbers(shop.id),
    enabled: !!shop?.id,
  });

  if (loadingShop) return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A" }} />
  );

  // Cambiar título de pestaña
  if (shop?.name) document.title = `${shop.name} — Reserva tu turno`;

  if (shopError || !shop) return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <p style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>Barbería no encontrada</p>
      <Link to="/" style={{ color: O, fontSize: 14 }}>Volver al inicio</Link>
    </div>
  );

  const grouped = services.reduce((acc, s) => {
    const cat = s.service_categories?.name ?? "Servicios";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <ThemeProvider shop={shop}>

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, borderBottom: "1px solid var(--shop-border)", background: "var(--shop-nav-bg)", backdropFilter: "blur(12px)", padding: "14px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {shop.logo_url
              ? <img src={shop.logo_url} alt={shop.name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }} />
              : <div style={{ width: 32, height: 32, background: "var(--shop-brand)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}><Scissors size={15} color="#fff" /></div>
            }
            <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: -0.5, color: "var(--shop-text)" }}>{shop.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="#servicios" style={{ color: "var(--shop-text-faint)", fontSize: 14, textDecoration: "none" }}>Servicios</a>
            <Link to={`/${slug}/booking`} style={{ padding: "9px 20px", background: "var(--shop-brand)", color: "var(--shop-btn-text)", borderRadius: 9, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              Reservar
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: "120px 24px 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {shop.cover_url
          ? <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${shop.cover_url})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.25)", zIndex: 0 }} />
          : <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, background: "var(--shop-brand-alpha)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />
        }
        <div style={{ maxWidth: 700, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {shop.city && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "var(--shop-brand-alpha)", border: "1px solid var(--shop-brand-alpha2)", borderRadius: 20, marginBottom: 24 }}>
              <MapPin size={11} color="var(--shop-brand)" />
              <span style={{ color: "var(--shop-brand)", fontSize: 12, fontWeight: 600 }}>{shop.city}</span>
            </div>
          )}
          <h1 style={{ fontSize: "clamp(36px, 7vw, 68px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: -1.5, marginBottom: 16, color: "var(--shop-text)" }}>
            {shop.name}
          </h1>
          {shop.tagline && (
            <p style={{ fontSize: 20, fontWeight: 500, color: "var(--shop-brand)", marginBottom: 12 }}>{shop.tagline}</p>
          )}
          <p style={{ color: "var(--shop-text-muted)", fontSize: 17, lineHeight: 1.6, marginBottom: 36 }}>
            Reserva tu turno en segundos. Sin llamadas, sin esperas.
            {shop.allows_delivery && " También hacemos domicilios."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to={`/${slug}/booking`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 32px", background: "var(--shop-brand)", color: "var(--shop-btn-text)", borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: "none" }}>
              Reservar ahora <ArrowRight size={18} />
            </Link>
            <a href="#servicios" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 24px", border: "1px solid var(--shop-border)", color: "var(--shop-text-muted)", borderRadius: 12, fontWeight: 600, fontSize: 16, textDecoration: "none" }}>
              Ver servicios
            </a>
          </div>
        </div>
      </section>

      {/* ── SERVICIOS ── */}
      <section id="servicios" style={{ padding: "60px 24px", background: "var(--shop-bg-2)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ color: "var(--shop-brand)", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Catálogo</p>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: "var(--shop-text)" }}>Nuestros servicios</h2>
            </div>
            <Link to={`/${slug}/booking`} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--shop-brand)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              Reservar <ArrowRight size={15} />
            </Link>
          </div>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--shop-text-faint)", fontWeight: 700, marginBottom: 12 }}>{cat}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 10 }}>
                {items.map(s => (
                  <Link key={s.id} to={`/${slug}/booking`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "var(--shop-surface)", border: "1px solid var(--shop-border)", borderRadius: 14, textDecoration: "none", gap: 12 }}>
                    <div>
                      <p style={{ fontWeight: 600, color: "var(--shop-text)", fontSize: 14, marginBottom: 4 }}>{s.name}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--shop-text-faint)" }}>
                        <Clock size={11} /><span style={{ fontSize: 12 }}>{s.duration_min} min</span>
                        {s.allows_delivery && <span style={{ fontSize: 11, color: "var(--shop-brand)", background: "var(--shop-brand-alpha)", padding: "1px 6px", borderRadius: 20 }}>Domicilio</span>}
                      </div>
                    </div>
                    <p style={{ fontWeight: 700, color: "var(--shop-brand)", fontSize: 15, flexShrink: 0 }}>{formatCOP(s.price)}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BARBEROS ── */}
      {barbers.length > 0 && (
        <section style={{ padding: "60px 24px", background: "var(--shop-bg)" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <p style={{ color: "var(--shop-brand)", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>El equipo</p>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: "var(--shop-text)", marginBottom: 32 }}>Nuestros barberos</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
              {barbers.map(b => (
                <div key={b.id} style={{ background: "var(--shop-surface)", border: "1px solid var(--shop-border)", borderRadius: 16, padding: "20px 16px", textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--shop-surface-2)", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {b.avatar_url
                      ? <img src={b.avatar_url} alt={b.full_name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 22, fontWeight: 800, color: "var(--shop-brand)" }}>{b.full_name[0]}</span>
                    }
                  </div>
                  <p style={{ fontWeight: 700, color: "var(--shop-text)", fontSize: 14 }}>{b.full_name}</p>
                  {b.specialty && <p style={{ color: "var(--shop-text-faint)", fontSize: 12, marginTop: 3 }}>{b.specialty}</p>}
                  {b.does_delivery && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, padding: "2px 8px", background: "var(--shop-brand-alpha)", borderRadius: 20 }}>
                      <MapPin size={9} color="var(--shop-brand)" /><span style={{ fontSize: 10, color: "var(--shop-brand)" }}>Domicilio</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section style={{ padding: "60px 24px 80px", background: "var(--shop-bg-2)" }}>
        <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "var(--shop-text)", marginBottom: 12 }}>¿Listo para tu corte?</h2>
          <p style={{ color: "var(--shop-text-muted)", fontSize: 15, marginBottom: 28 }}>Reserva en 2 minutos. Sin llamadas.</p>
          <Link to={`/${slug}/booking`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 36px", background: "var(--shop-brand)", color: "var(--shop-btn-text)", borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: "none" }}>
            Reservar ahora <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--shop-border)", padding: "20px 24px", textAlign: "center", background: "var(--shop-bg)" }}>
        <p style={{ color: "var(--shop-text-faint)", fontSize: 12 }}>
          {shop.name} · Powered by{" "}
          <Link to="/" style={{ color: "var(--shop-brand)", textDecoration: "none", fontWeight: 600 }}>Clippr</Link>
        </p>
      </footer>
    </ThemeProvider>
  );
}
