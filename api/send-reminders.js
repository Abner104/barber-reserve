const SUPABASE_URL     = process.env.SUPABASE_URL     || "https://jyggjagnnwfmqyezilzv.supabase.co";
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY   = process.env.RESEND_API_KEY;

function toBase64(s){const c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";let r="",i=0;while(i<s.length){const a=s.charCodeAt(i++),b=s.charCodeAt(i++),cc=s.charCodeAt(i++);r+=c[a>>2]+c[((a&3)<<4)|(b>>4)]+(isNaN(b)?"=":c[((b&15)<<2)|(cc>>6)])+(isNaN(cc)?"=":c[cc&63]);}return r;}

async function sendSMS(to, msgBody) {
  const SID   = process.env.TWILIO_ACCOUNT_SID;
  const TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const FROM  = process.env.TWILIO_SMS_NUMBER || "+15075708383";
  const clean = to.replace(/\D/g, "");
  const intl  = clean.startsWith("56") ? clean : "56" + clean;
  const auth  = toBase64(SID + ":" + TOKEN);
  const r = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + SID + "/Messages.json", {
    method: "POST",
    headers: { "Authorization": "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: "From=" + encodeURIComponent(FROM) + "&To=%2B" + intl + "&Body=" + encodeURIComponent(msgBody),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || JSON.stringify(d));
  return d;
}

async function sendReminderEmail({ to, clientName, shopName, serviceName, barberName, date, time, manageUrl }) {
  if (!RESEND_API_KEY) return;
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

export default async function handler(req, res) {
  const dbH = { "Content-Type": "application/json", "Authorization": "Bearer " + SUPABASE_SERVICE, "apikey": SUPABASE_SERVICE };

  // Ventana de recordatorio: reservas confirmadas que empiezan entre 105 y 135 min desde ahora
  const now    = Date.now();
  const from   = new Date(now + 105 * 60 * 1000).toISOString();
  const to     = new Date(now + 135 * 60 * 1000).toISOString();

  const url = SUPABASE_URL + "/rest/v1/bookings"
    + "?status=eq.confirmed"
    + "&reminder_sent=eq.false"
    + "&scheduled_at=gte." + from
    + "&scheduled_at=lte." + to
    + "&select=id,scheduled_at,clients(full_name,phone,email),services(name),barbers(full_name),barbershops(name,slug)";

  const r = await fetch(url, { headers: dbH });
  const bookings = await r.json();
  if (!Array.isArray(bookings)) { res.status(200).json({ ok: true, sent: 0, note: "no rows or query error" }); return; }

  let sent = 0;
  for (const b of bookings) {
    const phone = b.clients?.phone;
    const email = b.clients?.email;
    if (!phone && !email) continue;
    const at   = new Date(b.scheduled_at);
    const time = at.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
    const manageUrl = b.barbershops?.slug ? "https://www.clipprreserve.com/" + b.barbershops.slug + "/mis-reservas" : "https://www.clipprreserve.com";

    try {
      if (phone) {
        await sendSMS(phone, [
          "Recordatorio " + (b.barbershops?.name || "Barbería") + ":",
          "Hola " + (b.clients?.full_name?.split(" ")[0] || "") + "! Tu cita es hoy a las " + time + " con " + (b.barbers?.full_name || "tu barbero") + ".",
          "Ver/cancelar: " + manageUrl,
        ].filter(Boolean).join(" "));
      }

      if (email) {
        await sendReminderEmail({
          to: email,
          clientName:  b.clients?.full_name,
          shopName:    b.barbershops?.name || "Barbería",
          serviceName: b.services?.name,
          barberName:  b.barbers?.full_name,
          time,
          manageUrl,
        });
      }

      await fetch(SUPABASE_URL + "/rest/v1/bookings?id=eq." + b.id, {
        method: "PATCH",
        headers: { ...dbH, "Prefer": "return=minimal" },
        body: JSON.stringify({ reminder_sent: true }),
      });
      sent++;
    } catch {
      // si falla el envío, no marcamos reminder_sent — se reintenta en la próxima corrida
    }
  }

  res.status(200).json({ ok: true, sent, candidates: bookings.length });
}
