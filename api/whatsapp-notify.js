// Envía notificación WS al barbero cuando llega una reserva
import { sendWhatsApp } from "./whatsapp-send.js";

const SUPABASE_URL     = process.env.SUPABASE_URL     || "https://jyggjagnnwfmqyezilzv.supabase.co";
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Z2dqYWdubndmbXF5ZXppbHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ4MDIxOSwiZXhwIjoyMDk0MDU2MjE5fQ.KZUqfNA8WbLmOXk0V_zcSDJJdBpg3iIRPd4gpKwlP88";
const headers = { "Authorization": `Bearer ${SUPABASE_SERVICE}`, "apikey": SUPABASE_SERVICE };

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }

  const { barberId, clientName, serviceName, date, time, type, address, price } = body ?? {};
  if (!barberId) { res.status(400).json({ error: "barberId requerido" }); return; }

  // Obtener número verificado del barbero
  const r = await fetch(`${SUPABASE_URL}/rest/v1/barbers?id=eq.${barberId}&select=whatsapp_number,whatsapp_verified,full_name`, { headers });
  const barbers = await r.json();
  const barber  = barbers?.[0];

  if (!barber?.whatsapp_number || !barber?.whatsapp_verified) {
    return res.status(200).json({ ok: false, reason: "Barbero sin número verificado" });
  }

  const typeLabel = type === "delivery" ? `📍 *Domicilio:* ${address || "Ver panel"}` : "📍 En el local";
  const msg = [
    `🔔 *Nueva reserva — Clippr*`,
    ``,
    `👤 Cliente: ${clientName || "Sin nombre"}`,
    `✂️ Servicio: ${serviceName || "—"}`,
    `📅 Fecha: ${date}`,
    `🕐 Hora: ${time}`,
    typeLabel,
    `💰 ${price}`,
    ``,
    `✅ Confirmá en tu panel: clipprreserve.com/barber`,
  ].join("\n");

  try {
    await sendWhatsApp(barber.whatsapp_number, msg);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
