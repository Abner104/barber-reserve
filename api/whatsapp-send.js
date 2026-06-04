async function sendWhatsApp(to, body) {
  const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
  const FROM_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    throw new Error(`Twilio env vars missing: SID=${!!ACCOUNT_SID} TOKEN=${!!AUTH_TOKEN} FROM=${!!FROM_NUMBER}`);
  }

  const phone = to.replace(/\D/g, "");
  const intl  = phone.startsWith("56") ? phone : `56${phone}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const res  = await fetch(url, {
    method:  "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64"),
      "Content-Type":  "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: `whatsapp:${FROM_NUMBER}`,
      To:   `whatsapp:+${intl}`,
      Body: body,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? JSON.stringify(data));
  return data;
}

module.exports = { sendWhatsApp };
module.exports.default = async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const { to, message } = body ?? {};
  if (!to || !message) { res.status(400).json({ error: "to y message requeridos" }); return; }
  try {
    const result = await sendWhatsApp(to, message);
    res.status(200).json({ ok: true, sid: result.sid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
