const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function toBase64(s){const c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";let r="",i=0;while(i<s.length){const a=s.charCodeAt(i++),b=s.charCodeAt(i++),cc=s.charCodeAt(i++);r+=c[a>>2]+c[((a&3)<<4)|(b>>4)]+(isNaN(b)?"=":c[((b&15)<<2)|(cc>>6)])+(isNaN(cc)?"=":c[cc&63]);}return r;}

async function sendSMS(to, msgBody) {
  const SID   = process.env.TWILIO_ACCOUNT_SID;
  const TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const FROM  = process.env.TWILIO_SMS_NUMBER || "+15075708383";
  const clean = to.replace(/\D/g, "");
  const intl  = clean.startsWith("56") ? clean : "56" + clean;
  const auth  = toBase64(SID + ":" + TOKEN);
  const r = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + SID + "/Messages.json", {
    method: "POST",
    headers: { "Authorization": "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: "From=" + encodeURIComponent(FROM) + "&To=%2B" + intl + "&Body=" + encodeURIComponent(msgBody),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || JSON.stringify(d));
  return d;
}

async function send(req, res, b, dbH) {
  const { phone, shopId } = b || {};
  if (!phone || !shopId) { res.status(400).json({ error: "phone y shopId requeridos" }); return; }

  const code    = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await fetch(SUPABASE_URL + "/rest/v1/client_verifications", {
    method: "POST",
    headers: { ...dbH, "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify({ shop_id: shopId, phone, code, expires_at: expires, verified: false }),
  });

  try {
    await sendSMS(phone, "Clippr: Tu codigo para ver tus reservas es " + code + ". Valido por 10 minutos.");
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function confirm(req, res, b, dbH) {
  const { phone, shopId, code } = b || {};
  if (!phone || !shopId || !code) { res.status(400).json({ error: "phone, shopId y code requeridos" }); return; }

  const vUrl = SUPABASE_URL + "/rest/v1/client_verifications"
    + "?shop_id=eq." + shopId + "&phone=eq." + encodeURIComponent(phone)
    + "&code=eq." + encodeURIComponent(code)
    + "&order=created_at.desc&limit=1";
  const vRes = await fetch(vUrl, { headers: dbH });
  const rows = await vRes.json();
  const row  = Array.isArray(rows) ? rows[0] : null;

  if (!row) { res.status(400).json({ error: "Código incorrecto" }); return; }
  if (new Date(row.expires_at).getTime() < Date.now()) { res.status(400).json({ error: "El código expiró, solicitá uno nuevo" }); return; }

  await fetch(SUPABASE_URL + "/rest/v1/client_verifications?id=eq." + row.id, {
    method: "PATCH",
    headers: { ...dbH, "Prefer": "return=minimal" },
    body: JSON.stringify({ verified: true }),
  });

  // Find or create the client record for this shop+phone
  const cUrl = SUPABASE_URL + "/rest/v1/clients?shop_id=eq." + shopId + "&phone=eq." + encodeURIComponent(phone) + "&select=id,full_name,phone";
  const cRes = await fetch(cUrl, { headers: dbH });
  const clients = await cRes.json();
  let client = Array.isArray(clients) ? clients[0] : null;

  if (!client) {
    const insRes = await fetch(SUPABASE_URL + "/rest/v1/clients", {
      method: "POST",
      headers: { ...dbH, "Prefer": "return=representation" },
      body: JSON.stringify({ shop_id: shopId, phone, full_name: "" }),
    });
    const inserted = await insRes.json();
    client = Array.isArray(inserted) ? inserted[0] : inserted;
  }

  // Token simple: base64(clientId:shopId:phone:expiry) — válido por 30 días
  const tokenExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const token = toBase64(client.id + ":" + shopId + ":" + phone + ":" + tokenExpiry);

  res.status(200).json({ ok: true, token, client: { id: client.id, full_name: client.full_name, phone: client.phone } });
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }

  const dbH = { "Content-Type": "application/json", "Authorization": "Bearer " + SUPABASE_KEY, "apikey": SUPABASE_KEY };

  if (b?.action === "confirm") return confirm(req, res, b, dbH);
  return send(req, res, b, dbH);
}
