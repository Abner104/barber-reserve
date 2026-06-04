const SUPABASE_URL = process.env.SUPABASE_URL || "https://jyggjagnnwfmqyezilzv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Z2dqYWdubndmbXF5ZXppbHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ4MDIxOSwiZXhwIjoyMDk0MDU2MjE5fQ.KZUqfNA8WbLmOXk0V_zcSDJJdBpg3iIRPd4gpKwlP88";

// Codificación base64 sin Buffer ni btoa — funciona en cualquier runtime JS
function toBase64(str) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "", i = 0;
  while (i < str.length) {
    const a = str.charCodeAt(i++), b = str.charCodeAt(i++), c = str.charCodeAt(i++);
    result += chars[a >> 2] + chars[((a & 3) << 4) | (b >> 4)] +
      (isNaN(b) ? "=" : chars[((b & 15) << 2) | (c >> 6)]) +
      (isNaN(c) ? "=" : chars[c & 63]);
  }
  return result;
}

async function sendWS(to, msgBody) {
  const SID   = process.env.TWILIO_ACCOUNT_SID;
  const TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const FROM  = process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886";
  const clean = to.replace(/\D/g, "");
  const intl  = clean.startsWith("56") ? clean : "56" + clean;
  const auth  = toBase64(SID + ":" + TOKEN);
  const params = new URLSearchParams({
    From: "whatsapp:" + FROM,
    To:   "whatsapp:+" + intl,
    Body: msgBody,
  });
  const r = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + SID + "/Messages.json", {
    method: "POST",
    headers: { "Authorization": "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || JSON.stringify(d));
  return d;
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  const { barberId, phone } = b || {};
  if (!barberId || !phone) { res.status(400).json({ error: "barberId y phone requeridos" }); return; }

  const code    = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const dbH     = { "Content-Type": "application/json", "Authorization": "Bearer " + SUPABASE_KEY, "apikey": SUPABASE_KEY };

  await fetch(SUPABASE_URL + "/rest/v1/whatsapp_verifications", {
    method: "POST",
    headers: { ...dbH, "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify({ barber_id: barberId, phone, code, expires_at: expires, verified: false }),
  });

  try {
    await sendWS(phone, "✂️ *Clippr*\n\nTu código de verificación es:\n\n*" + code + "*\n\nVálido por 10 minutos.");
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
