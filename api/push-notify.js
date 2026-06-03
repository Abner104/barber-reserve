import webpush from "web-push";

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || "BOTgc6bINijFbgcRknxzADcJDwbmDUwAQBPS1Djud5f8SFX-I64XbH2gBK4PXCam-ibLJYIwekC6F2uPQAGfPcY";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "EpGqmEzy5afR6FjMsI9bcmmOuJ_6qMukUONG-G9FmC8";

webpush.setVapidDetails("mailto:stocklys86@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE);

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }

  const SUPABASE_URL     = process.env.SUPABASE_URL     || "https://jyggjagnnwfmqyezilzv.supabase.co";
  const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Z2dqYWdubndmbXF5ZXppbHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ4MDIxOSwiZXhwIjoyMDk0MDU2MjE5fQ.KZUqfNA8WbLmOXk0V_zcSDJJdBpg3iIRPd4gpKwlP88";

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }

  const { barberId, title, message, url } = body ?? {};
  if (!barberId || !title) { res.status(400).json({ error: "barberId y title requeridos" }); return; }

  const headers = {
    "Authorization": `Bearer ${SUPABASE_SERVICE}`,
    "apikey": SUPABASE_SERVICE,
  };

  // Obtener todas las suscripciones del barbero
  const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?barber_id=eq.${barberId}&select=subscription`, { headers });
  const subs = await r.json();

  if (!subs?.length) { res.status(200).json({ ok: true, sent: 0 }); return; }

  const payload = JSON.stringify({ title, body: message ?? "", icon: "/LogoC.png", url: url ?? "/barber" });
  let sent = 0;

  for (const row of subs) {
    try {
      const sub = typeof row.subscription === "string" ? JSON.parse(row.subscription) : row.subscription;
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (e) {
      // Suscripción expirada — eliminarla
      if (e.statusCode === 410) {
        await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?barber_id=eq.${barberId}`, {
          method: "DELETE", headers,
        });
      }
    }
  }

  res.status(200).json({ ok: true, sent });
}
