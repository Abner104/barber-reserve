import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ChevronLeft, ChevronRight, Shuffle, Images, X, Star } from "lucide-react";
import { useBookingStore } from "../../../../store/bookingStore";
import { getBarbers } from "../../services/bookingService";
import { supabase } from "../../../../lib/supabase";

const O = "var(--brand, #FF6B2C)";

async function getBarberPortfolio(barberId) {
  const { data } = await supabase
    .from("barber_portfolio")
    .select("id, image_url, caption")
    .eq("barber_id", barberId)
    .order("created_at", { ascending: false })
    .limit(12);
  return data ?? [];
}

export default function StepBarber() {
  const { type, service, barber: selected, setBarber, step, setStep, prevStep } = useBookingStore();
  const shopId = useBookingStore(s => s.shopId);
  const [portfolioBarber, setPortfolioBarber] = useState(null);

  const { data: barbers = [], isLoading } = useQuery({
    queryKey: ["barbers", service?.id, type, shopId],
    queryFn: () => getBarbers({ serviceId: service?.id, type, shopId }),
    enabled: !!service && !!shopId,
  });

  const { data: portfolio = [], isLoading: loadingPortfolio } = useQuery({
    queryKey: ["barber-portfolio-booking", portfolioBarber?.id],
    queryFn:  () => getBarberPortfolio(portfolioBarber.id),
    enabled:  !!portfolioBarber?.id,
  });

  function choose(b) { setBarber(b); setStep(step + 1); }

  function chooseAny() {
    if (barbers.length > 0) choose(barbers[0]);
  }

  return (
    <div>
      <button onClick={prevStep} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}>
        <ChevronLeft size={14} /> Atrás
      </button>

      <p style={{ color: O, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Paso 3</p>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Elige tu barbero</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: 28, fontSize: 14 }}>
        {type === "delivery" ? "Barberos disponibles para domicilio." : "Elige con quién quieres tu corte."}
      </p>

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2].map(i => <div key={i} style={{ height: 80, borderRadius: 14, background: "var(--surface2)" }} />)}
        </div>
      )}

      {!isLoading && barbers.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--card-bg)", borderRadius: 16, border: "1px solid var(--border)" }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>💈</p>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No hay barberos disponibles</p>
          <p style={{ color: "var(--text-faint)", fontSize: 13, lineHeight: 1.5 }}>
            {type === "delivery"
              ? "Ningún barbero hace domicilios por ahora. Prueba reservando en el local."
              : "No hay barberos disponibles para este servicio. Intenta más tarde."}
          </p>
        </div>
      )}

      {!isLoading && barbers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Cualquier barbero */}
          <button
            onClick={chooseAny}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 18px", borderRadius: 14,
              border: "1px dashed var(--border)", background: "var(--card-bg)",
              cursor: "pointer", width: "100%", marginBottom: 4,
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--brand-alpha)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Shuffle size={18} color={O} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>Cualquier barbero disponible</p>
              <p style={{ fontSize: 12, color: "var(--text-faint)" }}>Te asignamos el primero libre</p>
            </div>
            <ChevronRight size={16} color="var(--text-faint)" />
          </button>

          {barbers.map((b) => {
            const name       = b.full_name ?? "Barbero";
            const avatar     = b.avatar_url;
            const isSelected = selected?.id === b.id;

            return (
              <div key={b.id} style={{ borderRadius: 14, border: `1px solid ${isSelected ? O : "var(--border)"}`, background: isSelected ? "var(--brand-alpha)" : "var(--card-bg)", overflow: "hidden" }}>

                {/* Card principal — click para seleccionar */}
                <button
                  onClick={() => choose(b)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer", width: "100%", textAlign: "left", background: "none", border: "none" }}
                >
                  <div style={{ width: 50, height: 50, borderRadius: 12, background: "var(--surface2)", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {avatar
                      ? <img src={avatar} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontWeight: 800, fontSize: 18, color: O }}>{name[0]}</span>
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 2 }}>{name}</p>
                    {b.specialty && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{b.specialty}</p>}
                    {type === "delivery" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, color: "var(--text-faint)" }}>
                        <MapPin size={11} />
                        <span style={{ fontSize: 11 }}>Hasta {b.delivery_radius} km</span>
                      </div>
                    )}
                  </div>

                  {isSelected
                    ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: O, flexShrink: 0 }} />
                    : <ChevronRight size={16} color="var(--text-faint)" />
                  }
                </button>

                {/* Botón ver trabajos */}
                <button
                  onClick={e => { e.stopPropagation(); setPortfolioBarber(b); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "8px 18px", width: "100%", background: "none",
                    border: "none", borderTop: "1px solid var(--border)",
                    cursor: "pointer", color: "var(--text-faint)", fontSize: 12,
                  }}
                >
                  <Images size={12} color={O} />
                  <span style={{ color: O, fontWeight: 600 }}>Ver trabajos</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal portfolio */}
      {portfolioBarber && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--surface, #141414)", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface2)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {portfolioBarber.avatar_url
                  ? <img src={portfolioBarber.avatar_url} alt={portfolioBarber.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontWeight: 800, color: O }}>{portfolioBarber.full_name[0]}</span>
                }
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", lineHeight: 1 }}>{portfolioBarber.full_name}</p>
                {portfolioBarber.specialty && <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{portfolioBarber.specialty}</p>}
              </div>
            </div>
            <button onClick={() => setPortfolioBarber(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}>
              <X size={22} />
            </button>
          </div>

          {/* Grid de fotos */}
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {loadingPortfolio && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[1,2,3,4,5,6].map(i => <div key={i} style={{ aspectRatio: "1", borderRadius: 8, background: "var(--surface2)" }} />)}
              </div>
            )}

            {!loadingPortfolio && portfolio.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-faint)" }}>
                <Images size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                <p>Este barbero aún no tiene trabajos publicados</p>
              </div>
            )}

            {!loadingPortfolio && portfolio.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {portfolio.map(item => (
                  <div key={item.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "1" }}>
                    <img src={item.image_url} alt={item.caption ?? "trabajo"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {item.caption && (
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 6px", background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                        <p style={{ fontSize: 9, color: "#fff" }}>{item.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botón elegir este barbero */}
          <div style={{ padding: "16px 20px", background: "var(--surface, #141414)", borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => { choose(portfolioBarber); setPortfolioBarber(null); }}
              style={{ width: "100%", padding: "14px", borderRadius: 12, background: O, color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}
            >
              Elegir a {portfolioBarber.full_name}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
