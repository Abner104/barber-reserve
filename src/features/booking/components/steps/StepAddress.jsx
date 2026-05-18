import { formatCurrency } from "../../../../lib/utils";
import { useState, useEffect, useRef } from "react";
import { MapPin, ChevronLeft, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useBookingStore } from "../../../../store/bookingStore";
import { getDistanceKm, calcDeliveryFee } from "../../../../lib/mapbox";

const SHOP_LOCATION = { lat: -33.4489, lng: -70.6693 };
const BASE_FEE      = 5000;
const FEE_PER_KM    = 1500;

// Autocompletado con Nominatim (OSM) — sin API key
async function searchAddress(query) {
  if (!query || query.length < 4) return [];
  const q   = encodeURIComponent(query + ", Chile");
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=cl&addressdetails=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "es" } });
  const data = await res.json();
  return data.map(r => ({
    display: r.display_name.split(",").slice(0, 3).join(",").trim(),
    full:    r.display_name,
    lat:     parseFloat(r.lat),
    lng:     parseFloat(r.lon),
  }));
}

export default function StepAddress() {
  const { address, setAddress, step, setStep, prevStep } = useBookingStore();

  const [input, setInput]           = useState(address.line || "");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  const distanceKm  = address.lat ? getDistanceKm(SHOP_LOCATION, { lat: address.lat, lng: address.lng }) : null;
  const deliveryFee = distanceKm != null ? calcDeliveryFee(distanceKm, BASE_FEE, FEE_PER_KM) : null;
  const isConfirmed = !!address.lat;

  // Debounce la búsqueda mientras escribe
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input.trim() || input === address.line) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchAddress(input);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [input]);

  function selectSuggestion(s) {
    setAddress({ line: s.display, lat: s.lat, lng: s.lng, place_name: s.full });
    setInput(s.display);
    setSuggestions([]);
    setShowSuggestions(false);
    toast.success("Dirección confirmada");
  }

  function clearAddress() {
    setAddress({ line: "", lat: null, lng: null, place_name: "" });
    setInput("");
    setSuggestions([]);
  }

  const brand = "var(--brand, #FF6B2C)";

  return (
    <div>
      <button onClick={prevStep} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}>
        <ChevronLeft size={14} /> Atrás
      </button>

      <p style={{ color: brand, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Paso 5</p>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>¿A dónde va el barbero?</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: 28, fontSize: 14 }}>
        Escribe tu dirección y selecciona la correcta.
      </p>

      {/* Input con autocompletado */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <div style={{
          display: "flex", alignItems: "center",
          background: "var(--card-bg)", border: `1px solid ${isConfirmed ? "var(--brand, #FF6B2C)" : "var(--border)"}`,
          borderRadius: 14, overflow: "hidden", transition: "border-color 0.2s",
        }}>
          <div style={{ padding: "0 14px", color: isConfirmed ? brand : "var(--text-faint)" }}>
            <MapPin size={18} />
          </div>
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); if (isConfirmed) clearAddress(); }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Av. Providencia 1234, Santiago"
            style={{
              flex: 1, padding: "16px 0", background: "transparent",
              border: "none", outline: "none", fontSize: 15,
              color: "var(--text)", fontFamily: "inherit",
            }}
          />
          {loading && <div style={{ padding: "0 14px" }}><Loader2 size={16} color="var(--text-faint)" style={{ animation: "spin 1s linear infinite" }} /></div>}
          {isConfirmed && (
            <button onClick={clearAddress} style={{ padding: "0 14px", background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Sugerencias dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
            background: "var(--card-bg)", border: "1px solid var(--border)",
            borderRadius: 12, marginTop: 4, overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => selectSuggestion(s)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "12px 16px", width: "100%", background: "none",
                  border: "none", borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                  cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <MapPin size={14} color="var(--text-faint)" style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4 }}>{s.display}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Estado confirmado */}
      {isConfirmed && (
        <div style={{ marginBottom: 20 }}>
          {/* Dirección confirmada */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--brand-alpha)", border: "1px solid var(--brand, #FF6B2C)", borderRadius: 12, marginBottom: 12 }}>
            <Check size={16} color="var(--brand, #FF6B2C)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, marginBottom: 2 }}>Dirección confirmada</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{address.line}</p>
            </div>
          </div>

          {/* Tarifa */}
          {distanceKm != null && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12 }}>
              <div>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Distancia</p>
                <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>{distanceKm.toFixed(1)} km</p>
              </div>
              <div style={{ width: 1, height: 32, background: "var(--border)" }} />
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Costo de domicilio</p>
                <p style={{ fontWeight: 700, color: brand, fontSize: 15 }}>{formatCurrency(deliveryFee)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tip cuando no hay dirección */}
      {!isConfirmed && !loading && (
        <div style={{ padding: "16px", background: "var(--surface2)", borderRadius: 12, marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
            💡 Escribe tu calle y número. Ej: <em>"Av. Providencia 1234"</em> o <em>"Las Condes, Apoquindo 5000"</em>
          </p>
        </div>
      )}

      <button
        onClick={() => setStep(step + 1)}
        disabled={!isConfirmed}
        style={{
          width: "100%", padding: "16px", borderRadius: 14, fontSize: 15, fontWeight: 700,
          background: isConfirmed ? brand : "var(--surface2)",
          color: isConfirmed ? "#fff" : "var(--text-faint)",
          border: "none", cursor: isConfirmed ? "pointer" : "not-allowed",
          transition: "all 0.2s",
        }}
      >
        {isConfirmed ? "Continuar →" : "Selecciona tu dirección primero"}
      </button>
    </div>
  );
}
