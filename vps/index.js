/**
 * Servidor principal VPS — Clippr
 * Incluye: Baileys WhatsApp + Mercado Pago
 *
 * Instalar deps: npm install @whiskeysockets/baileys mercadopago @supabase/supabase-js express cors qrcode dotenv
 * Arrancar: node index.js  (o pm2 start index.js --name clippr-server)
 */

require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const app        = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Mercado Pago ─────────────────────────────────────────────
require("./mp-payments")(app);

// ── Baileys WhatsApp ──────────────────────────────────────────
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const { createClient }  = require("@supabase/supabase-js");
const QRCode            = require("qrcode");
const path              = require("path");
const fs                = require("fs");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Mapa de sockets activos por barbero
const sessions = {};  // barberId -> { sock, qr, status }

async function startBarberSession(barberId) {
  const authDir = path.join(__dirname, "sessions", barberId);
  fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    auth:           state,
    printQRInTerminal: false,
  });

  sessions[barberId] = { sock, qr: null, status: "connecting" };

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      const qrImage = await QRCode.toDataURL(qr);
      sessions[barberId].qr     = qrImage;
      sessions[barberId].status = "qr_ready";
      console.log(`QR listo para barbero ${barberId}`);
    }
    if (connection === "open") {
      sessions[barberId].status = "connected";
      sessions[barberId].qr     = null;
      console.log(`WhatsApp conectado: barbero ${barberId}`);
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log(`Reconectando barbero ${barberId}...`);
        setTimeout(() => startBarberSession(barberId), 5000);
      } else {
        sessions[barberId].status = "logged_out";
        fs.rmSync(authDir, { recursive: true, force: true });
      }
    }
  });
}

// ── Rutas WhatsApp ────────────────────────────────────────────

// QR para escanear
app.get("/qr/:barberId", async (req, res) => {
  const { barberId } = req.params;
  if (!sessions[barberId]) await startBarberSession(barberId);
  const s = sessions[barberId];
  if (s?.qr) return res.json({ qr: s.qr, status: s.status });
  res.json({ qr: null, status: s?.status ?? "connecting" });
});

// Estado de conexión
app.get("/status/:barberId", (req, res) => {
  const s = sessions[req.params.barberId];
  res.json({ status: s?.status ?? "not_started" });
});

// Notificar barbero cuando llega reserva
app.post("/notify", async (req, res) => {
  try {
    // Soporta { barberId, message } y { record: bookingRecord }
    let { barberId, message, record } = req.body;

    // Si viene record (desde el booking wizard), extraer barberId y construir mensaje
    if (record && !barberId) {
      barberId = record.barber_id;

      // Buscar datos completos desde Supabase
      const { data: full } = await supabase
        .from("bookings")
        .select("scheduled_at, type, address_line, client_notes, clients(full_name, phone), services(name)")
        .eq("id", record.id)
        .maybeSingle();

      const src   = full ?? record;
      const fecha = src.scheduled_at
        ? new Date(src.scheduled_at).toLocaleString("es-CL", {
            weekday: "short", day: "numeric", month: "short",
            hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago",
          })
        : "";

      message = [
        `🔔 *Nueva reserva* ✂️`,
        ``,
        `👤 Cliente: ${src.clients?.full_name ?? record.clients?.full_name ?? "Cliente"}`,
        `📱 Teléfono: ${src.clients?.phone ?? record.clients?.phone ?? "—"}`,
        `✂️ Servicio: ${src.services?.name ?? record.services?.name ?? "—"}`,
        `📅 Fecha: ${fecha}`,
        src.type === "delivery" ? `📍 Domicilio: ${src.address_line ?? ""}` : `📍 En el local`,
        src.client_notes ? `📝 Nota: ${src.client_notes}` : "",
      ].filter(Boolean).join("\n");
    }

    if (!barberId || !message) {
      return res.status(400).json({ error: "barberId y message requeridos" });
    }

    const s = sessions[barberId];
    if (!s || s.status !== "connected") {
      return res.status(400).json({ error: "Barbero no conectado a WhatsApp" });
    }

    const { data: barber } = await supabase
      .from("barbers").select("phone").eq("id", barberId).single();

    if (!barber?.phone) return res.status(400).json({ error: "Barbero sin teléfono" });

    const phone = barber.phone.replace(/\D/g, "");
    const jid   = phone.startsWith("56") ? `${phone}@s.whatsapp.net` : `56${phone}@s.whatsapp.net`;

    await s.sock.sendMessage(jid, { text: message });
    console.log(`✅ Notificación enviada al barbero ${barberId}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("notify error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Notificar cliente cuando se confirma reserva
app.post("/notify-client", async (req, res) => {
  try {
    const { phone, message, barberId } = req.body;

    // Usar sesión del barbero para enviar al cliente
    let s = barberId ? sessions[barberId] : Object.values(sessions).find(s => s.status === "connected");
    if (!s || s.status !== "connected") {
      return res.status(400).json({ error: "Sin sesión WhatsApp activa" });
    }

    const clean = phone.replace(/\D/g, "");
    const jid   = clean.startsWith("56") ? `${clean}@s.whatsapp.net` : `56${clean}@s.whatsapp.net`;

    await s.sock.sendMessage(jid, { text: message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Arrancar sesiones existentes al iniciar ───────────────────
async function initExistingSessions() {
  const sessionsDir = path.join(__dirname, "sessions");
  if (!fs.existsSync(sessionsDir)) return;
  const dirs = fs.readdirSync(sessionsDir);
  for (const barberId of dirs) {
    console.log(`Reconectando sesión existente: ${barberId}`);
    startBarberSession(barberId).catch(console.error);
  }
}

// ── Health check ──────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ ok: true, sessions: Object.keys(sessions).length }));

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Clippr server corriendo en puerto ${PORT}`);
  initExistingSessions();
  // Iniciar cron de recordatorios
  require("./reminders")(sessions, supabase);
});
