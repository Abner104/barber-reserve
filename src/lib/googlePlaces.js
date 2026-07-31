// Carga única del script de Google Maps + helper de autocompletado con la API
// nueva (Places API New: AutocompleteSuggestion / fetchAutocompleteSuggestions).
// Compartido entre el flujo de reserva del cliente y la config de dirección del local.
//
// Usa el bootstrap loader oficial de Google (no solo <script src=".../maps/api/js">):
// es la única forma que garantiza que google.maps.importLibrary exista — cargar el
// script "clásico" con libraries=places solo expone el namespace viejo (google.maps.places.*),
// no la función importLibrary que necesita la API nueva.

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

let bootstrapped = false;
let bootstrapPromise = null;

function bootstrapGoogleMaps() {
  if (bootstrapped && window.google?.maps?.importLibrary) return Promise.resolve();
  if (bootstrapPromise) return bootstrapPromise;

  // Snippet oficial de Google (https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
  // adaptado: define importLibrary como stub que carga el script real la primera vez que se llama.
  (g => {
    var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__",
      m = document, b = window;
    b = b[c] || (b[c] = {});
    var d = b.maps || (b.maps = {}), r = new Set(), e = new URLSearchParams(),
      // eslint-disable-next-line no-async-promise-executor -- snippet oficial de Google, no reescribir la lógica
      u = () => h || (h = new Promise(async (f, n) => {
        await (a = m.createElement("script"));
        e.set("libraries", [...r] + "");
        for (k in g)
          e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]);
        e.set("callback", c + ".maps." + q);
        a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
        d[q] = f;
        a.onerror = () => (h = n(Error(p + " could not load.")));
        a.nonce = m.querySelector("script[nonce]")?.nonce || "";
        m.head.append(a);
      }));
    d[l] ? console.warn(p + " only loads once. Ignoring:", g) : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
  })({ key: GOOGLE_KEY, v: "weekly" });

  bootstrapPromise = window.google.maps.importLibrary("places")
    .then(() => { bootstrapped = true; });

  return bootstrapPromise;
}

export async function loadPlacesAndGeocoding() {
  await bootstrapGoogleMaps();
  const places    = await window.google.maps.importLibrary("places");
  const geocoding = await window.google.maps.importLibrary("geocoding");
  return {
    AutocompleteSuggestion:    places.AutocompleteSuggestion,
    AutocompleteSessionToken:  places.AutocompleteSessionToken,
    geocoder: new geocoding.Geocoder(),
  };
}

export { GOOGLE_KEY };
