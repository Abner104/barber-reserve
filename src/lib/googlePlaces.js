// Carga única del script de Google Maps + helper de autocompletado con la API
// nueva (Places API New: AutocompleteSuggestion / fetchAutocompleteSuggestions).
// Compartido entre el flujo de reserva del cliente y la config de dirección del local.

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

let googleLoaded = false;
let googleLoading = false;
const loadCallbacks = [];

export function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (googleLoaded && window.google?.maps?.importLibrary) { resolve(); return; }
    loadCallbacks.push({ resolve, reject });
    if (googleLoading) return;
    googleLoading = true;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places&language=es&region=CL&loading=async`;
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

export async function loadPlacesAndGeocoding() {
  await loadGoogleScript();
  const places    = await window.google.maps.importLibrary("places");
  const geocoding = await window.google.maps.importLibrary("geocoding");
  return {
    AutocompleteSuggestion:    places.AutocompleteSuggestion,
    AutocompleteSessionToken:  places.AutocompleteSessionToken,
    geocoder: new geocoding.Geocoder(),
  };
}

export { GOOGLE_KEY };
