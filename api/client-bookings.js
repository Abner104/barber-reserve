const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fromBase64(str) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  const clean = str.replace(/[^A-Za-z0-9+/]/g, "");
  for (let i = 0; i < clean.length; i += 4) {
    const e1 = chars.indexOf(clean[i]), e2 = chars.indexOf(clean[i+1]);
    const e3 = chars.indexOf(clean[i+2]), e4 = chars.indexOf(clean[i+3]);
    const c1 = (e1 << 2) | (e2 >> 4);
    const c2 = ((e2 & 15) << 4) | (e3 >> 2);
    const c3 = ((e3 & 3) << 6) | e4;
    result += String.fromCharCode(c1);
    if (e3 !== -1) result += String.fromCharCode(c2);
    if (e4 !== -1) result += String.fromCharCode(c3);
  }
  return result;
}

function parseToken(token) {
  try {
    const [clientId, shopId, phone, expiry] = fromBase64(token).split(":");
    if (!clientId || !shopId || !expiry) return null;
    if (Date.now() > Number(expiry)) return null;
    return { clientId, shopId, phone };
  } catch { return null; }
}

export default async function handler(req, res) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  const token = (req.method === "POST" ? b?.token : req.query?.token);
  const auth  = parseToken(token || "");
  if (!auth) { res.status(401).json({ error: "Sesión inválida o expirada" }); return; }

  const dbH = { "Content-Type": "application/json", "Authorization": "Bearer " + SUPABASE_KEY, "apikey": SUPABASE_KEY };

  if (req.method === "GET") {
    const url = SUPABASE_URL + "/rest/v1/bookings"
      + "?client_id=eq." + auth.clientId
      + "&shop_id=eq." + auth.shopId
      + "&select=id,scheduled_at,status,price,delivery_fee,address_line,services(name),barbers(full_name)"
      + "&order=scheduled_at.desc&limit=30";
    const r = await fetch(url, { headers: dbH });
    const bookings = await r.json();
    res.status(200).json({ ok: true, bookings: Array.isArray(bookings) ? bookings : [] });
    return;
  }

  if (req.method === "POST" && b?.action === "cancel") {
    const { bookingId } = b;
    if (!bookingId) { res.status(400).json({ error: "bookingId requerido" }); return; }

    // Verificar que la reserva pertenece a este cliente
    const checkUrl = SUPABASE_URL + "/rest/v1/bookings?id=eq." + bookingId + "&client_id=eq." + auth.clientId + "&select=id,status,scheduled_at";
    const checkRes = await fetch(checkUrl, { headers: dbH });
    const rows = await checkRes.json();
    const booking = Array.isArray(rows) ? rows[0] : null;
    if (!booking) { res.status(404).json({ error: "Reserva no encontrada" }); return; }
    if (["cancelled", "completed", "no_show"].includes(booking.status)) {
      res.status(400).json({ error: "Esta reserva ya no se puede cancelar" });
      return;
    }

    const upd = await fetch(SUPABASE_URL + "/rest/v1/bookings?id=eq." + bookingId, {
      method: "PATCH",
      headers: { ...dbH, "Prefer": "return=minimal" },
      body: JSON.stringify({ status: "cancelled", cancel_reason: "Cancelado por el cliente" }),
    });
    if (!upd.ok) { res.status(400).json({ error: "No se pudo cancelar la reserva" }); return; }

    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).end();
}
