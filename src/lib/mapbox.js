// Coordenadas por defecto: Santiago de Chile
export const DEFAULT_CENTER = { lat: -33.4489, lng: -70.6693 };

/**
 * Geocodifica una dirección de texto usando Nominatim (OpenStreetMap) — gratis, sin API key.
 * Retorna { lat, lng, place_name } o null si no hay resultados.
 */
export async function geocodeAddress(address) {
  const query = encodeURIComponent(address + ", Chile");
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=cl`;

  const res = await fetch(url, {
    headers: { "Accept-Language": "es" },
  });
  const data = await res.json();

  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    place_name: data[0].display_name,
  };
}

/**
 * Distancia en km entre dos coordenadas (Haversine).
 */
export function getDistanceKm(from, to) {
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Costo de domicilio: tarifa base + distancia × tarifa por km.
 */
export function calcDeliveryFee(distanceKm, baseFee, feePerKm) {
  return baseFee + distanceKm * feePerKm;
}
