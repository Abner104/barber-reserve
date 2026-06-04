// Envía mensajes al cliente (confirmación, recordatorio, cancelación)
import { sendWhatsApp } from "./whatsapp-send.js";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }

  const { phone, type, clientName, serviceName, barberName, shopName, date, time, reason } = body ?? {};
  if (!phone || !type) { res.status(400).json({ error: "phone y type requeridos" }); return; }

  let msg = "";

  if (type === "confirmed") {
    msg = [
      `✅ *Reserva confirmada — ${shopName || "Barbería"}*`,
      ``,
      `Hola ${clientName || ""}! Tu reserva está confirmada 💈`,
      ``,
      `✂️ ${serviceName}`,
      `👤 Con: ${barberName}`,
      `📅 ${date} a las ${time}`,
      ``,
      `Te esperamos. Si necesitás cancelar escribí acá.`,
    ].join("\n");
  } else if (type === "reminder") {
    msg = [
      `⏰ *Recordatorio — ${shopName || "Barbería"}*`,
      ``,
      `Hola ${clientName || ""}! Te recordamos tu reserva de hoy:`,
      ``,
      `✂️ ${serviceName} a las *${time}*`,
      `👤 Con: ${barberName}`,
      ``,
      `¡Te esperamos! 💈`,
    ].join("\n");
  } else if (type === "cancelled") {
    msg = [
      `❌ *Reserva cancelada — ${shopName || "Barbería"}*`,
      ``,
      `Hola ${clientName || ""}, lamentablemente tu reserva fue cancelada.`,
      reason ? `\nMotivo: ${reason}` : "",
      ``,
      `Podés reagendar en: clipprreserve.com`,
    ].filter(Boolean).join("\n");
  } else if (type === "noshow") {
    msg = [
      `😔 *${shopName || "Barbería"}*`,
      ``,
      `Hola ${clientName || ""}, notamos que no pudiste venir a tu reserva de hoy.`,
      ``,
      `Cuando quieras podés reagendar en: clipprreserve.com`,
    ].join("\n");
  }

  if (!msg) { res.status(400).json({ error: "Tipo de mensaje no válido" }); return; }

  try {
    await sendWhatsApp(phone, msg);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
