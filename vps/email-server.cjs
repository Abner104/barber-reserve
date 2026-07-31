/**
 * Servidor de emails transaccionales (confirmación + recordatorio) via Resend.
 * Standalone — no depende de Baileys/WhatsApp. Expone HTTP para que el frontend
 * (clipprreserve.com) le pegue directo, y corre el cron de recordatorios en loop.
 *
 * Instalar deps: npm install express cors
 * Secretos requeridos en vps/secrets.local.cjs (ver secrets.example.cjs) — NO usa
 * archivos .env a propósito: el auto-loader nativo de env de PM2 7.x interfiere
 * de forma errática (sobreescribe process.env en loop con un .env vacío/distinto),
 * así que este script evita ese nombre de archivo por completo.
 * Ejecutar: node vps/email-server.cjs   (o con pm2 para que quede corriendo siempre)
 */

const secrets = require("./secrets.local.cjs");
const express = require("express");
const cors    = require("cors");

const SUPABASE_URL     = secrets.SUPABASE_URL;
const SUPABASE_SERVICE = secrets.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY   = secrets.RESEND_API_KEY;
const PORT              = secrets.EMAIL_PORT || 3002;

if (!SUPABASE_URL || !SUPABASE_SERVICE) { console.error("❌ Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
if (!RESEND_API_KEY) { console.error("❌ Falta RESEND_API_KEY"); process.exit(1); }

const app = express();
app.use(cors());
app.use(express.json());

const FROM = "Clippr <noreply@clipprreserve.com>";

// Mismo formato que api/client-login.js: base64(clientId:shopId:phone:expiry), 30 días.
function makeClientToken(clientId, shopId, phone) {
  const raw = `${clientId}:${shopId}:${phone}:${Date.now() + 30 * 24 * 60 * 60 * 1000}`;
  return Buffer.from(raw).toString("base64");
}

async function sendViaResend({ to, subject, html }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || JSON.stringify(d));
  return d;
}

function bookingHtml({ heading, intro, clientName, shopName, serviceName, barberName, date, time, manageUrl, logoUrl }) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      ${logoUrl ? `<img src="${logoUrl}" alt="${shopName || "Clippr"}" style="width: 48px; height: 48px; border-radius: 12px; object-fit: cover; margin-bottom: 12px;" />` : ""}
      <h2 style="color: #FF6B2C;">${heading}</h2>
      <p>Hola ${clientName || ""},</p>
      <p>${intro} <strong>${shopName}</strong>:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #666;">Servicio</td><td style="padding: 6px 0; text-align: right;"><strong>${serviceName || "—"}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Barbero</td><td style="padding: 6px 0; text-align: right;"><strong>${barberName || "—"}</strong></td></tr>
        ${date ? `<tr><td style="padding: 6px 0; color: #666;">Fecha</td><td style="padding: 6px 0; text-align: right;"><strong>${date}</strong></td></tr>` : ""}
        <tr><td style="padding: 6px 0; color: #666;">Hora</td><td style="padding: 6px 0; text-align: right;"><strong>${time || "—"}</strong></td></tr>
      </table>
      ${manageUrl ? `<p><a href="${manageUrl}" style="display: inline-block; background: #FF6B2C; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700;">Ver o cancelar mi reserva</a></p>` : ""}
      <p style="color: #999; font-size: 13px; margin-top: 24px;">Este correo fue enviado por Clippr en nombre de ${shopName}.</p>
    </div>
  `;
}

// ── Envío puntual (confirmación al reservar) — llamado desde el frontend ──
app.post("/send-email", async (req, res) => {
  try {
    const { to, type, ...data } = req.body ?? {};
    if (!to) { res.status(400).json({ error: "Falta el email destinatario" }); return; }

    let subject, html;
    if (type === "confirmation") {
      subject = `Reserva confirmada — ${data.shopName || "Clippr"}`;
      html = bookingHtml({ heading: "✂️ Reserva confirmada", intro: "Tu reserva quedó registrada en", ...data });
    } else if (type === "reminder") {
      subject = `Recordatorio de tu reserva — ${data.shopName || "Clippr"}`;
      html = bookingHtml({ heading: "⏰ Recordatorio de tu reserva", intro: "Te recordamos tu reserva en", ...data });
    } else {
      res.status(400).json({ error: "type debe ser 'confirmation' o 'reminder'" });
      return;
    }

    const result = await sendViaResend({ to, subject, html });
    res.json({ ok: true, id: result.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

// ── Cron de recordatorios (~2h antes) — corre en loop, no depende de HTTP ──
// Ventana normal: 105-135 min antes. Si la reserva se hizo tarde (menos de 135 min
// de anticipación), el límite inferior "desde ahora" la agarra igual en el próximo
// chequeo de 15 min, en vez de perderla por completo.
async function runReminders() {
  const dbH = { "Content-Type": "application/json", "Authorization": "Bearer " + SUPABASE_SERVICE, "apikey": SUPABASE_SERVICE };
  const now  = Date.now();
  const from = new Date(now + 20 * 60 * 1000).toISOString();
  const to   = new Date(now + 135 * 60 * 1000).toISOString();

  const url = SUPABASE_URL + "/rest/v1/bookings"
    + "?status=eq.confirmed&reminder_sent=eq.false"
    + "&scheduled_at=gte." + from + "&scheduled_at=lte." + to
    + "&select=id,scheduled_at,client_id,clients(full_name,email,phone),services(name),barbers(full_name),barbershops(id,name,slug,logo_url)";

  const r = await fetch(url, { headers: dbH });
  const bookings = await r.json();
  if (!Array.isArray(bookings) || !bookings.length) return;

  for (const b of bookings) {
    const email = b.clients?.email;
    if (!email) continue;
    const time = new Date(b.scheduled_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
    const token = b.client_id && b.barbershops?.id ? makeClientToken(b.client_id, b.barbershops.id, b.clients?.phone || "") : "";
    const manageUrl = b.barbershops?.slug
      ? "https://www.clipprreserve.com/" + b.barbershops.slug + "/mis-reservas" + (token ? "?token=" + encodeURIComponent(token) : "")
      : "https://www.clipprreserve.com";

    try {
      await sendViaResend({
        to: email,
        subject: "Recordatorio de tu reserva — " + (b.barbershops?.name || "Barbería"),
        html: bookingHtml({
          heading: "⏰ Recordatorio de tu reserva", intro: "Te recordamos tu reserva en",
          clientName: b.clients?.full_name, shopName: b.barbershops?.name || "Barbería",
          serviceName: b.services?.name, barberName: b.barbers?.full_name, time, manageUrl,
          logoUrl: b.barbershops?.logo_url,
        }),
      });
      await fetch(SUPABASE_URL + "/rest/v1/bookings?id=eq." + b.id, {
        method: "PATCH", headers: { ...dbH, "Prefer": "return=minimal" },
        body: JSON.stringify({ reminder_sent: true }),
      });
      console.log("✅ Recordatorio enviado →", b.clients.full_name, `(${b.id})`);
    } catch (e) {
      console.error("❌ Error enviando recordatorio:", e.message);
    }
  }
}

runReminders();
setInterval(runReminders, 15 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`📧 Email server activo en puerto ${PORT}`);
  console.log("⏰ Cron de recordatorios activo (cada 15 min)");
});
