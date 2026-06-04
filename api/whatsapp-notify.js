const SUPABASE_URL     = process.env.SUPABASE_URL     || "https://jyggjagnnwfmqyezilzv.supabase.co";
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Z2dqYWdubndmbXF5ZXppbHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ4MDIxOSwiZXhwIjoyMDk0MDU2MjE5fQ.KZUqfNA8WbLmOXk0V_zcSDJJdBpg3iIRPd4gpKwlP88";

async function sendWS(to, msgBody) {
  const SID   = process.env.TWILIO_ACCOUNT_SID;
  const TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const FROM  = process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886";
  const clean = to.replace(/\D/g, "");
  const intl  = clean.startsWith("56") ? clean : "56" + clean;
  function toBase64(s){const c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";let r="",i=0;while(i<s.length){const a=s.charCodeAt(i++),b=s.charCodeAt(i++),cc=s.charCodeAt(i++);r+=c[a>>2]+c[((a&3)<<4)|(b>>4)]+(isNaN(b)?"=":c[((b&15)<<2)|(cc>>6)])+(isNaN(cc)?"=":c[cc&63]);}return r;}
  const auth  = toBase64(SID + ":" + TOKEN);
  const r = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + SID + "/Messages.json", {
    method: "POST",
    headers: { "Authorization": "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: "From=whatsapp%3A" + encodeURIComponent(FROM) + "&To=whatsapp%3A%2B" + intl + "&Body=" + encodeURIComponent(msgBody),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || JSON.stringify(d));
  return d;
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  const { barberId, clientName, serviceName, date, time, type, address, price } = b || {};
  if (!barberId) { res.status(400).json({ error: "barberId requerido" }); return; }

  const dbH    = { "Authorization": "Bearer " + SUPABASE_SERVICE, "apikey": SUPABASE_SERVICE };
  const r      = await fetch(SUPABASE_URL + "/rest/v1/barbers?id=eq." + barberId + "&select=whatsapp_number,whatsapp_verified,full_name", { headers: dbH });
  const barber = (await r.json())?.[0];

  if (!barber?.whatsapp_number || !barber?.whatsapp_verified) {
    return res.status(200).json({ ok: false, reason: "Barbero sin número verificado" });
  }

  const msg = [
    "🔔 *Nueva reserva — Clippr*", "",
    "👤 Cliente: " + (clientName || "Sin nombre"),
    "✂️ Servicio: " + (serviceName || "—"),
    "📅 Fecha: " + date, "🕐 Hora: " + time,
    type === "delivery" ? "📍 *Domicilio:* " + (address || "Ver panel") : "📍 En el local",
    "💰 " + price, "",
    "✅ Confirmá en: clipprreserve.com/barber",
  ].join("\n");

  try {
    await sendWS(barber.whatsapp_number, msg);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
