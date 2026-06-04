export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  const { to, message } = b || {};
  if (!to || !message) { res.status(400).json({ error: "to y message requeridos" }); return; }

  const SID   = process.env.TWILIO_ACCOUNT_SID;
  const TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const FROM  = process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886";
  const clean = to.replace(/\D/g, "");
  const intl  = clean.startsWith("56") ? clean : "56" + clean;
  function toBase64(s){const c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";let r="",i=0;while(i<s.length){const a=s.charCodeAt(i++),b=s.charCodeAt(i++),cc=s.charCodeAt(i++);r+=c[a>>2]+c[((a&3)<<4)|(b>>4)]+(isNaN(b)?"=":c[((b&15)<<2)|(cc>>6)])+(isNaN(cc)?"=":c[cc&63]);}return r;}
  const auth  = toBase64(SID + ":" + TOKEN);

  try {
    const r = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + SID + "/Messages.json", {
      method: "POST",
      headers: { "Authorization": "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: "From=whatsapp%3A" + encodeURIComponent(FROM) + "&To=whatsapp%3A%2B" + intl + "&Body=" + encodeURIComponent(message),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || JSON.stringify(d));
    res.status(200).json({ ok: true, sid: d.sid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
