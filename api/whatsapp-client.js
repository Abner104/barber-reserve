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
  const { phone, type, clientName, serviceName, barberName, shopName, date, time, reason } = b || {};
  if (!phone || !type) { res.status(400).json({ error: "phone y type requeridos" }); return; }

  const msgs = {
    confirmed: ["✅ *Reserva confirmada — " + (shopName||"Barbería") + "*", "", "Hola " + (clientName||"") + "! Tu reserva está confirmada 💈", "", "✂️ " + serviceName, "👤 Con: " + barberName, "📅 " + date + " a las " + time, "", "Te esperamos!"].join("\n"),
    reminder:  ["⏰ *Recordatorio — " + (shopName||"Barbería") + "*", "", "Hola " + (clientName||"") + "! Te recordamos tu reserva:", "", "✂️ " + serviceName + " a las *" + time + "*", "👤 Con: " + barberName, "", "¡Te esperamos! 💈"].join("\n"),
    cancelled: ["❌ *Reserva cancelada — " + (shopName||"Barbería") + "*", "", "Hola " + (clientName||"") + ", tu reserva fue cancelada.", reason ? "Motivo: " + reason : "", "", "Reagendá en: clipprreserve.com"].filter(Boolean).join("\n"),
    noshow:    ["😔 *" + (shopName||"Barbería") + "*", "", "Hola " + (clientName||"") + ", notamos que no pudiste venir hoy.", "", "Reagendá cuando quieras: clipprreserve.com"].join("\n"),
  };

  const msg = msgs[type];
  if (!msg) { res.status(400).json({ error: "Tipo no válido" }); return; }
  try {
    await sendWS(phone, msg);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
