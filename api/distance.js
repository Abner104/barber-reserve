export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { olat, olng, dlat, dlng } = req.query;
  if (!olat || !olng || !dlat || !dlng) {
    res.status(400).json({ error: "Missing coordinates" });
    return;
  }

  const key = process.env.VITE_GOOGLE_MAPS_KEY;
  if (!key) { res.status(500).json({ error: "No API key" }); return; }

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${olat},${olng}&destinations=${dlat},${dlng}&mode=driving&language=es&key=${key}`;

  try {
    const r    = await fetch(url);
    const data = await r.json();
    const el   = data?.rows?.[0]?.elements?.[0];

    if (el?.status === "OK") {
      res.status(200).json({ distanceKm: el.distance.value / 1000, text: el.distance.text });
    } else {
      res.status(200).json({ distanceKm: null, status: el?.status });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
