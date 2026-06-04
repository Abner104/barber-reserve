const { sendWhatsApp } = require("./whatsapp-send.js");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }

  const { phone, type, clientName, serviceName, barberName, shopName, date, time, reason } = body ?? {};
  if (!phone || !type) { res.status(400).json({ error: "phone y type requeridos" }); return; }

  const msgs = {
    confirmed: [
      `✅ *Reserva confirmada — ${shopName || "Barbería"}*`,
      ``,
      `Hola ${clientName || ""}! Tu reserva está confirmada 💈`,
      ``,
      `✂️ ${serviceName}`,
      `👤 Con: ${barberName}`,
      `📅 ${date} a las ${time}`,
      ``,
      `Te esperamos. Si necesitás cancelar escribí acá.`,
    ].join("\n"),
    reminder: [
      `⏰ *Recordatorio — ${shopName || "Barbería"}*`,
      ``,
      `Hola ${clientName || ""}! Te recordamos tu reserva de hoy:`,
      ``,
      `✂️ ${serviceName} a las *${time}*`,
      `👤 Con: ${barberName}`,
      ``,
      `¡Te esperamos! 💈`,
    ].join("\n"),
    cancelled: [
      `❌ *Reserva cancelada — ${shopName || "Barbería"}*`,
      ``,
      `Hola ${clientName || ""}, tu reserva fue cancelada.`,
      reason ? `Motivo: ${reason}` : "",
      ``,
      `Reagendá en: clipprreserve.com`,
    ].filter(Boolean).join("\n"),
    noshow: [
      `😔 *${shopName || "Barbería"}*`,
      ``,
      `Hola ${clientName || ""}, notamos que no pudiste venir hoy.`,
      ``,
      `Reagendá cuando quieras: clipprreserve.com`,
    ].join("\n"),
  };

  const msg = msgs[type];
  if (!msg) { res.status(400).json({ error: "Tipo no válido" }); return; }

  try {
    await sendWhatsApp(phone, msg);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
