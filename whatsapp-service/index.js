import "dotenv/config";
import express from "express";
import cors from "cors";
import QRCode from "qrcode";
import pino from "pino";
import { createClient } from "@supabase/supabase-js";
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import { existsSync, mkdirSync } from "fs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PORT   = process.env.PORT || 3001;
const SECRET = process.env.WEBHOOK_SECRET || "secret";
const logger = pino({ level: "silent" });

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const sessions = {};

async function startSession(barberId) {
  const authDir = `./sessions/${barberId}`;
  if (!existsSync(authDir)) mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version }          = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    browser: ["BarberOS", "Chrome", "1.0"],
  });

  sessions[barberId] = { sock, qr: null, status: "connecting" };

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      sessions[barberId].qr     = await QRCode.toDataURL(qr);
      sessions[barberId].status = "qr_ready";
      console.log(`\n✅ [${barberId}] QR listo\n`);
    }

    if (connection === "open") {
      sessions[barberId].status = "connected";
      sessions[barberId].qr     = null;
      console.log(`✅ [${barberId}] WhatsApp conectado`);
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        sessions[barberId].status = "reconnecting";
        setTimeout(() => startSession(barberId), 3000);
      } else {
        sessions[barberId].status = "logged_out";
        sessions[barberId].qr     = null;
      }
    }
  });
}

app.get("/qr/:barberId", async (req, res) => {
  const { barberId } = req.params;
  if (!sessions[barberId]) startSession(barberId).catch(console.error);
  const session = sessions[barberId];
  if (session?.status === "connected") return res.json({ status: "connected", qr: null });
  let waited = 0;
  while (!session?.qr && waited < 20000) {
    await new Promise(r => setTimeout(r, 500));
    waited += 500;
  }
  const s = sessions[barberId];
  res.json({ status: s?.status ?? "connecting", qr: s?.qr ?? null });
});

app.get("/status/:barberId", (req, res) => {
  const s = sessions[req.params.barberId];
  res.json({ status: s?.status ?? "not_started" });
});

app.delete("/session/:barberId", async (req, res) => {
  const { barberId } = req.params;
  const s = sessions[barberId];
  if (s?.sock) { try { await s.sock.logout(); } catch {} delete sessions[barberId]; }
  res.json({ ok: true });
});

app.post("/notify", async (req, res) => {
  const authHeader = req.headers.authorization ?? "";
  if (authHeader !== `Bearer ${SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const booking = req.body?.record ?? req.body;
  if (!booking?.barber_id) {
    return res.status(400).json({ error: "No booking en payload" });
  }

  console.log("📥 Webhook booking:", booking.id);

  const [{ data: barber }, { data: client }, { data: service }, { data: shop }] = await Promise.all([
    supabase.from("barbers").select("full_name, phone").eq("id", booking.barber_id).maybeSingle(),
    supabase.from("clients").select("full_name, phone").eq("id", booking.client_id).maybeSingle(),
    supabase.from("services").select("name").eq("id", booking.service_id).maybeSingle(),
    supabase.from("barbershops").select("name").eq("id", booking.shop_id).maybeSingle(),
  ]);

  if (!barber?.phone) {
    return res.json({ ok: false, reason: "Barbero sin telefono" });
  }

  const at   = new Date(booking.scheduled_at);
  const date = at.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Santiago" });
  const time = at.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
  const total = Number(booking.price || 0) + Number(booking.delivery_fee || 0);
  const totalFmt = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(total);

  const msg = [
    `🔔 *Nueva reserva - ${shop?.name ?? "Barberia"}*`,
    ``,
    `👤 ${client?.full_name ?? "Sin nombre"} · ${client?.phone ?? ""}`,
    `✂️  ${service?.name ?? "Servicio"}`,
    `📅 ${date} a las ${time}`,
    booking.type === "delivery" ? `📍 *DOMICILIO:* ${booking.address_line ?? "Ver panel"}` : `📍 En el local`,
    `💰 ${totalFmt}`,
    booking.client_notes ? `📝 "${booking.client_notes}"` : null,
    ``,
    `✅ Confirma en el panel admin.`,
  ].filter(Boolean).join("\n");

  const s = sessions[booking.barber_id];
  if (!s || s.status !== "connected") {
    console.log(`⚠️  Barbero no conectado: ${s?.status ?? "sin sesion"}`);
    return res.status(503).json({ ok: false, reason: "Barbero no conectado" });
  }

  try {
    const clean = barber.phone.replace(/\D/g, "");
    const jid   = `${clean}@s.whatsapp.net`;
    await s.sock.sendMessage(jid, { text: msg });
    console.log(`📩 WS enviado a ${barber.full_name}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error WS:", err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /notify-client — notifica al cliente cuando barbero confirma/cancela
app.post("/notify-client", async (req, res) => {
  const authHeader = req.headers.authorization ?? "";
  if (authHeader !== `Bearer ${SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { barberId, clientPhone, message } = req.body;
  if (!barberId || !clientPhone || !message) {
    return res.status(400).json({ error: "Faltan campos" });
  }

  const s = sessions[barberId];
  if (!s || s.status !== "connected") {
    return res.status(503).json({ ok: false, reason: "Sesión no conectada" });
  }

  try {
    const clean = clientPhone.replace(/\D/g, "");
    const intl  = clean.startsWith("56") ? clean : `56${clean}`;
    const jid   = `${intl}@s.whatsapp.net`;
    await s.sock.sendMessage(jid, { text: message });
    console.log(`📩 WS enviado al cliente (${jid})`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error WS cliente:", err);
    res.status(500).json({ error: String(err) });
  }
});

app.get("/health", (_, res) => res.json({
  ok: true,
  sessions: Object.fromEntries(Object.entries(sessions).map(([id, s]) => [id, s.status])),
}));

app.listen(PORT, async () => {
  console.log(`\n🟢 BarberOS WhatsApp Service en http://localhost:${PORT}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL ? "✅" : "❌ falta SUPABASE_URL"}\n`);

  // Auto-reconectar sesiones guardadas al arrancar
  const { readdirSync } = await import("fs");
  try {
    const sessionDirs = readdirSync("./sessions");
    for (const barberId of sessionDirs) {
      console.log(`🔄 Reconectando sesión de ${barberId}...`);
      startSession(barberId).catch(e => console.error(`Error reconectando ${barberId}:`, e));
    }
  } catch {
    console.log("   No hay sesiones guardadas\n");
  }
});
