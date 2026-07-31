const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = "Clippr <noreply@clipprreserve.com>";

async function sendViaResend({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data;
}

function confirmationHtml({ clientName, shopName, serviceName, barberName, date, time, manageUrl }) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #FF6B2C;">✂️ Reserva confirmada</h2>
      <p>Hola ${clientName || ""},</p>
      <p>Tu reserva en <strong>${shopName}</strong> quedó registrada:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #666;">Servicio</td><td style="padding: 6px 0; text-align: right;"><strong>${serviceName || "—"}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Barbero</td><td style="padding: 6px 0; text-align: right;"><strong>${barberName || "—"}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Fecha</td><td style="padding: 6px 0; text-align: right;"><strong>${date || "—"}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Hora</td><td style="padding: 6px 0; text-align: right;"><strong>${time || "—"}</strong></td></tr>
      </table>
      ${manageUrl ? `<p><a href="${manageUrl}" style="display: inline-block; background: #FF6B2C; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700;">Ver o cancelar mi reserva</a></p>` : ""}
      <p style="color: #999; font-size: 13px; margin-top: 24px;">Este correo fue enviado por Clippr en nombre de ${shopName}.</p>
    </div>
  `;
}

function reminderHtml({ clientName, shopName, serviceName, barberName, date, time, manageUrl }) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #FF6B2C;">⏰ Recordatorio de tu reserva</h2>
      <p>Hola ${clientName || ""},</p>
      <p>Te recordamos tu reserva en <strong>${shopName}</strong>:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #666;">Servicio</td><td style="padding: 6px 0; text-align: right;"><strong>${serviceName || "—"}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Barbero</td><td style="padding: 6px 0; text-align: right;"><strong>${barberName || "—"}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Fecha</td><td style="padding: 6px 0; text-align: right;"><strong>${date || "—"}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Hora</td><td style="padding: 6px 0; text-align: right;"><strong>${time || "—"}</strong></td></tr>
      </table>
      ${manageUrl ? `<p><a href="${manageUrl}" style="display: inline-block; background: #FF6B2C; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700;">Ver o cancelar mi reserva</a></p>` : ""}
      <p style="color: #999; font-size: 13px; margin-top: 24px;">Este correo fue enviado por Clippr en nombre de ${shopName}.</p>
    </div>
  `;
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  if (!RESEND_API_KEY) { res.status(500).json({ error: "RESEND_API_KEY no configurada" }); return; }

  try {
    const { to, type, ...data } = req.body ?? {};
    if (!to) { res.status(400).json({ error: "Falta el email destinatario" }); return; }

    let subject, html;
    if (type === "confirmation") {
      subject = `Reserva confirmada — ${data.shopName || "Clippr"}`;
      html = confirmationHtml(data);
    } else if (type === "reminder") {
      subject = `Recordatorio de tu reserva — ${data.shopName || "Clippr"}`;
      html = reminderHtml(data);
    } else {
      res.status(400).json({ error: "type debe ser 'confirmation' o 'reminder'" });
      return;
    }

    const result = await sendViaResend({ to, subject, html });
    res.status(200).json({ ok: true, id: result.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
