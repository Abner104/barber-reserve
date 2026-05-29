import { formatCurrency } from "../../../../lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, ChevronLeft, Loader2, Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useBookingStore } from "../../../../store/bookingStore";
import { getDistanceKm, calcDeliveryFee } from "../../../../lib/mapbox";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

// ── Carga el script de Google Places una sola vez ─────────────
let googleLoaded = false;
let googleLoading = false;
const loadCallbacks = [];

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (googleLoaded && window.google?.maps?.places) { resolve(); return; }
    loadCallbacks.push({ resolve, reject });
    if (googleLoading) return;
    googleLoading = true;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places&language=es&region=CL`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleLoaded = true;
      loadCallbacks.forEach(cb => cb.resolve());
      loadCallbacks.length = 0;
    };
    script.onerror = () => {
      loadCallbacks.forEach(cb => cb.reject(new Error("Google Maps no cargó")));
      loadCallbacks.length = 0;
      googleLoading = false;
    };
    document.head.appendChild(script);
  });
}

// ── Fallback: Nominatim solo si no hay Google key ─────────────
async function searchNominatim(query) {
  if (!query || query.length < 4) return [];
  const hasChile = /chile|santiago|valparaíso|concepción|antofagasta|rm/i.test(query);
  const q = encodeURIComponent(query + (hasChile ? "" : ", Región Metropolitana, Chile"));
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=6&countrycodes=cl&addressdetails=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "es", "User-Agent": "ClipprApp/1.0" } });
  const data = await res.json();
  return data.slice(0, 5).map(r => {
    const road   = r.address?.road || r.address?.pedestrian || "";
    const number = r.address?.house_number ? ` ${r.address.house_number}` : "";
    const city   = r.address?.city || r.address?.town || r.address?.municipality || "";
    const display = [road + number, city].filter(Boolean).join(", ") || r.display_name.split(",").slice(0, 3).join(",").trim();
    return { display, full: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
  });
}

export default function StepAddress() {
  const { address, setAddress, step, setStep, prevStep, shopConfig, barber } = useBookingStore();

  const [input, setInput]               = useState(address.line || "");
  const [suggestions, setSuggestions]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [googleReady, setGoogleReady]   = useState(false);
  const [googleError, setGoogleError]   = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const autocompleteService = useRef(null);
  const geocoderRef         = useRef(null);
  const debounceRef         = useRef(null);
  const sessionToken        = useRef(null);

  const brand = "var(--brand)";
  const isConfirmed = !!address.lat;

  const origin = barber?.lat && barber?.lng
    ? { lat: barber.lat, lng: barber.lng }
    : shopConfig?.lat && shopConfig?.lng
    ? { lat: shopConfig.lat, lng: shopConfig.lng }
    : { lat: -33.4489, lng: -70.6693 };

  const feePerKm    = shopConfig?.delivery_fee_per_km ?? 650;
  const distanceKm  = address.lat ? getDistanceKm(origin, { lat: address.lat, lng: address.lng }) : null;
  const deliveryFee = distanceKm != null ? calcDeliveryFee(distanceKm, 0, feePerKm) : null;

  // Cargar Google Places al montar
  useEffect(() => {
    if (!GOOGLE_KEY) return;
    loadGoogleScript()
      .then(() => {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        geocoderRef.current         = new window.google.maps.Geocoder();
        sessionToken.current        = new window.google.maps.places.AutocompleteSessionToken();
        setGoogleReady(true);
      })
      .catch(() => setGoogleError(true));
  }, []);

  // Búsqueda con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input.trim() || input === address.line) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (googleReady && autocompleteService.current) {
          // Google Places Autocomplete — prioriza Chile
          autocompleteService.current.getPlacePredictions(
            {
              input,
              sessionToken: sessionToken.current,
              componentRestrictions: { country: "cl" },
              types: ["address"],
            },
            (predictions, status) => {
              setLoading(false);
              if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
                setSuggestions([]);
                return;
              }
              setSuggestions(predictions.map(p => ({
                display:  p.structured_formatting.main_text,
                full:     p.description,
                placeId:  p.place_id,
              })));
              setShowSuggestions(true);
            }
          );
        } else {
          // Fallback Nominatim
          const results = await searchNominatim(input);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
          setLoading(false);
        }
      } catch {
        setSuggestions([]);
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [input, googleReady]);

  // Cuando se selecciona una sugerencia de Google → geocodificar para obtener lat/lng exacto
  const selectSuggestion = useCallback((s) => {
    setSuggestions([]);
    setShowSuggestions(false);
    setInput(s.full || s.display);

    if (s.placeId && geocoderRef.current) {
      setLoading(true);
      // Nuevo session token después de completar la sesión
      sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
      geocoderRef.current.geocode({ placeId: s.placeId, language: "es" }, (results, status) => {
        setLoading(false);
        if (status === "OK" && results[0]) {
          const loc = results[0].geometry.location;
          const formatted = results[0].formatted_address;
          setAddress({ line: s.full, lat: loc.lat(), lng: loc.lng(), place_name: formatted });
          setInput(s.full);
          toast.success("Dirección confirmada ✓");
        } else {
          toast.error("No se pudo obtener la ubicación exacta");
        }
      });
    } else if (s.lat != null) {
      // Nominatim fallback ya trae lat/lng
      setAddress({ line: s.display, lat: s.lat, lng: s.lng, place_name: s.full });
      toast.success("Dirección confirmada ✓");
    }
  }, [setAddress]);

  function clearAddress() {
    setAddress({ line: "", lat: null, lng: null, place_name: "" });
    setInput("");
    setSuggestions([]);
    setShowSuggestions(false);
  }

  return (
    <div>
      <button onClick={prevStep} style={{ display:"flex", alignItems:"center", gap:4, color:"var(--text-muted)", background:"none", border:"none", cursor:"pointer", fontSize:13, marginBottom:24, padding:0 }}>
        <ChevronLeft size={14} /> Atrás
      </button>

      <p style={{ color:brand, fontSize:12, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Paso 5</p>
      <h2 style={{ fontSize:28, fontWeight:800, color:"var(--text)", marginBottom:8 }}>¿A dónde va el barbero?</h2>
      <p style={{ color:"var(--text-muted)", marginBottom:28, fontSize:14 }}>
        Escribe tu dirección y seleccioná la sugerencia correcta.
      </p>

      {/* Aviso si no hay Google key */}
      {!GOOGLE_KEY && (
        <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"12px 14px", background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:12, marginBottom:16 }}>
          <AlertCircle size={15} color="#fbbf24" style={{ flexShrink:0, marginTop:1 }} />
          <p style={{ fontSize:12, color:"#888", lineHeight:1.5 }}>
            Usando búsqueda básica. Para resultados exactos configurá tu Google Maps API key.
          </p>
        </div>
      )}

      {/* Input */}
      <div style={{ position:"relative", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", background:"var(--card-bg)", border:`1px solid ${isConfirmed ? "var(--brand)" : "var(--border)"}`, borderRadius:14, overflow:"hidden", transition:"border-color 0.2s" }}>
          <div style={{ padding:"0 14px", color:isConfirmed ? brand : "var(--text-faint)" }}>
            <MapPin size={18} />
          </div>
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); if (isConfirmed) clearAddress(); }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
            placeholder="Av. Providencia 1234, Santiago"
            autoComplete="off"
            style={{ flex:1, padding:"16px 0", background:"transparent", border:"none", outline:"none", fontSize:15, color:"var(--text)", fontFamily:"inherit" }}
          />
          {loading && (
            <div style={{ padding:"0 14px" }}>
              <Loader2 size={16} color="var(--text-faint)" style={{ animation:"spin 1s linear infinite" }} />
            </div>
          )}
          {isConfirmed && !loading && (
            <button onClick={clearAddress} style={{ padding:"0 14px", background:"none", border:"none", cursor:"pointer", color:"var(--text-faint)" }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Dropdown sugerencias */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:100, background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:12, marginTop:4, overflow:"hidden", boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onMouseDown={() => selectSuggestion(s)}
                style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 16px", width:"100%", background:"none", border:"none", borderBottom:i < suggestions.length - 1 ? "1px solid var(--border)" : "none", cursor:"pointer", textAlign:"left" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <MapPin size={14} color={brand} style={{ marginTop:2, flexShrink:0 }} />
                <div>
                  <p style={{ fontSize:13, color:"var(--text)", lineHeight:1.4, fontWeight:600 }}>{s.display}</p>
                  {s.full && s.full !== s.display && (
                    <p style={{ fontSize:11, color:"var(--text-faint)", marginTop:2, lineHeight:1.3 }}>{s.full}</p>
                  )}
                </div>
              </button>
            ))}
            {googleReady && (
              <div style={{ padding:"6px 16px", borderTop:"1px solid var(--border)", display:"flex", justifyContent:"flex-end" }}>
                <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-non-white3.png" alt="Powered by Google" style={{ height:14, opacity:0.5 }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dirección confirmada */}
      {isConfirmed && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 16px", background:"var(--brand-alpha)", border:"1px solid var(--brand)", borderRadius:12, marginBottom:12 }}>
            <Check size={16} color="var(--brand)" style={{ flexShrink:0, marginTop:2 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:13, color:"var(--text)", fontWeight:600, marginBottom:2 }}>Dirección confirmada</p>
              <p style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.4 }}>{address.line}</p>
            </div>
          </div>

          {distanceKm != null && (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:12 }}>
              <div>
                <p style={{ fontSize:12, color:"var(--text-muted)" }}>Distancia</p>
                <p style={{ fontWeight:700, color:"var(--text)", fontSize:15 }}>{distanceKm.toFixed(1)} km</p>
              </div>
              <div style={{ width:1, height:32, background:"var(--border)" }} />
              <div style={{ textAlign:"right" }}>
                <p style={{ fontSize:12, color:"var(--text-muted)" }}>Costo de domicilio</p>
                <p style={{ fontWeight:700, color:brand, fontSize:15 }}>{formatCurrency(deliveryFee)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tip */}
      {!isConfirmed && !loading && (
        <div style={{ padding:"14px 16px", background:"var(--surface2)", borderRadius:12, marginBottom:20 }}>
          <p style={{ fontSize:13, color:"var(--text-muted)", lineHeight:1.5 }}>
            💡 Escribe la calle y número exacto, luego elegí la dirección del listado.
            Ej: <em>"Apoquindo 5000"</em> o <em>"Av. Grecia 1800, Ñuñoa"</em>
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <button
        onClick={() => setStep(step + 1)}
        disabled={!isConfirmed}
        style={{ width:"100%", padding:"16px", borderRadius:14, fontSize:15, fontWeight:700, background:isConfirmed ? brand : "var(--surface2)", color:isConfirmed ? "#fff" : "var(--text-faint)", border:"none", cursor:isConfirmed ? "pointer" : "not-allowed", transition:"all 0.2s" }}
      >
        {isConfirmed ? "Continuar →" : "Seleccioná tu dirección primero"}
      </button>
    </div>
  );
}
