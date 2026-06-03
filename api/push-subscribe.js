export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }

  const SUPABASE_URL     = process.env.SUPABASE_URL     || "https://jyggjagnnwfmqyezilzv.supabase.co";
  const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Z2dqYWdubndmbXF5ZXppbHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ4MDIxOSwiZXhwIjoyMDk0MDU2MjE5fQ.KZUqfNA8WbLmOXk0V_zcSDJJdBpg3iIRPd4gpKwlP88";

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }

  const { barberId, subscription } = body ?? {};
  if (!barberId || !subscription) { res.status(400).json({ error: "barberId y subscription requeridos" }); return; }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SUPABASE_SERVICE}`,
    "apikey": SUPABASE_SERVICE,
    "Prefer": "resolution=merge-duplicates",
  };

  const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      barber_id:    barberId,
      endpoint:     subscription.endpoint,
      subscription: JSON.stringify(subscription),
    }),
  });

  if (!r.ok) {
    const err = await r.json();
    res.status(400).json({ error: err.message ?? "Error guardando suscripción" });
    return;
  }
  res.status(200).json({ ok: true });
}
