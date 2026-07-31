/**
 * Cron de recordatorios por email (Resend), independiente de WhatsApp/Baileys.
 * Corre cada 15 min. No requiere sesiones de WhatsApp conectadas — solo
 * variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.
 *
 * Uso standalone: node vps/email-reminders.js
 * (o require("./email-reminders")() desde index.js si querés correrlo junto al resto)
 */

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY   = process.env.RESEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error("❌ Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno");
  process.exit(1);
}
if (!RESEND_API_KEY) {
  console.error("❌ Falta RESEND_API_KEY en el entorno");
  process.exit(1);
}

async function sendReminderEmail({ to, clientName, shopName, serviceName, barberName, time, manageUrl }) {
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #FF6B2C;">⏰ Recordatorio de tu reserva</h2>
      <p>Hola ${clientName || ""},</p>
      <p>Te recordamos tu reserva en <strong>${shopName}</strong>:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #666;">Servicio</td><td style="padding: 6px 0; text-align: right;"><strong>${serviceName || "—"}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Barbero</td><td style="padding: 6px 0; text-align: right;"><strong>${barberName || "—"}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Hoy a las</td><td style="padding: 6px 0; text-align: right;"><strong>${time || "—"}</strong></td></tr>
      </table>
      ${manageUrl ? `<p><a href="${manageUrl}" style="display: inline-block; background: #FF6B2C; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700;">Ver o cancelar mi reserva</a></p>` : ""}
      <p style="color: #999; font-size: 13px; margin-top: 24px;">Este correo fue enviado por Clippr en nombre de ${shopName}.</p>
    </div>
  `;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Clippr <noreply@clipprreserve.com>", to, subject: "Recordatorio de tu reserva — " + shopName, html }),
  });
  if (!r.ok) throw new Error(await r.text());
}

async function runOnce() {
  const dbH = { "Content-Type": "application/json", "Authorization": "Bearer " + SUPABASE_SERVICE, "apikey": SUPABASE_SERVICE };

  // Ventana: reservas confirmadas que empiezan entre 105 y 135 min desde ahora (~2h antes)
  const now  = Date.now();
  const from = new Date(now + 105 * 60 * 1000).toISOString();
  const to   = new Date(now + 135 * 60 * 1000).toISOString();

  const url = SUPABASE_URL + "/rest/v1/bookings"
    + "?status=eq.confirmed"
    + "&reminder_sent=eq.false"
    + "&scheduled_at=gte." + from
    + "&scheduled_at=lte." + to
    + "&select=id,scheduled_at,clients(full_name,email),services(name),barbers(full_name),barbershops(name,slug)";

  const res = await fetch(url, { headers: dbH });
  const bookings = await res.json();
  if (!Array.isArray(bookings)) { console.log("⚠️  Respuesta inesperada de Supabase:", bookings); return; }
  if (!bookings.length) { console.log("· Sin recordatorios pendientes"); return; }

  let sent = 0;
  for (const b of bookings) {
    const email = b.clients?.email;
    if (!email) continue;
    const time = new Date(b.scheduled_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
    const manageUrl = b.barbershops?.slug ? "https://www.clipprreserve.com/" + b.barbershops.slug + "/mis-reservas" : "https://www.clipprreserve.com";

    try {
      await sendReminderEmail({
        to: email,
        clientName:  b.clients?.full_name,
        shopName:    b.barbershops?.name || "Barbería",
        serviceName: b.services?.name,
        barberName:  b.barbers?.full_name,
        time,
        manageUrl,
      });
      await fetch(SUPABASE_URL + "/rest/v1/bookings?id=eq." + b.id, {
        method: "PATCH",
        headers: { ...dbH, "Prefer": "return=minimal" },
        body: JSON.stringify({ reminder_sent: true }),
      });
      sent++;
      console.log("✅ Recordatorio enviado →", b.clients.full_name, `(${b.id})`);
    } catch (e) {
      console.error("❌ Error enviando recordatorio:", e.message);
    }
  }

  console.log(`· Corrida completa: ${sent}/${bookings.length} enviados`);
}

runOnce();
setInterval(runOnce, 15 * 60 * 1000);
console.log("⏰ Cron de recordatorios por email activo (cada 15 min)");
