const SUPABASE_URL     = process.env.SUPABASE_URL     || "https://jyggjagnnwfmqyezilzv.supabase.co";
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    + "&select=id,scheduled_at,clients(full_name,phone),services(name),barbers(full_name),barbershops(name,slug)";

  const r = await fetch(url, { headers: dbH });
  const bookings = await r.json();
  if (!Array.isArray(bookings)) { res.status(200).json({ ok: true, sent: 0, note: "no rows or query error" }); return; }

  let sent = 0;
  for (const b of bookings) {
    const phone = b.clients?.phone;
    if (!phone) continue;
    const at   = new Date(b.scheduled_at);
    const time = at.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
    const manageLink = b.barbershops?.slug ? "\n\n📲 Cancelar o reagendar: clipprreserve.com/" + b.barbershops.slug + "/mis-reservas" : "";

    try {
      await sendSMS(phone, [
        "Recordatorio " + (b.barbershops?.name || "Barbería") + ":",
        "Hola " + (b.clients?.full_name?.split(" ")[0] || "") + "! Tu cita es hoy a las " + time + " con " + (b.barbers?.full_name || "tu barbero") + ".",
        manageLink ? "Ver/cancelar: clipprreserve.com/" + b.barbershops.slug + "/mis-reservas" : "",
      ].filter(Boolean).join(" "));

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
