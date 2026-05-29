export const DEFAULT_CENTER = { lat: -33.4489, lng: -70.6693 };

/**
 * Distancia real por calles usando Google Distance Matrix API.
 * Fallback a Haversine × 1.35 si no hay key o falla la llamada.
 */
export async function getDistanceKm(from, to) {
  try {
    const url = `/api/distance?olat=${from.lat}&olng=${from.lng}&dlat=${to.lat}&dlng=${to.lng}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.distanceKm != null) return data.distanceKm;
  } catch { /* fallback */ }
  return haversineKm(from, to) * 1.35;
}

function haversineKm(from, to) {
  const R    = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Costo de domicilio: tarifa base + distancia × tarifa por km.
 * distanceKm ya es la distancia real por calles — sin factor adicional.
 */
export function calcDeliveryFee(distanceKm, baseFee, feePerKm) {
  const effectiveKm = Math.max(1, distanceKm);
  return Math.round(baseFee + effectiveKm * feePerKm);
}

export async function geocodeAddress(address) {
  const query = encodeURIComponent(address + ", Chile");
  const url   = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=cl`;
  const res   = await fetch(url, { headers: { "Accept-Language": "es" } });
  const data  = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), place_name: data[0].display_name };
}
