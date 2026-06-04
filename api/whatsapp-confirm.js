// Confirma el código y marca el número como verificado
const SUPABASE_URL     = process.env.SUPABASE_URL     || "https://jyggjagnnwfmqyezilzv.supabase.co";
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Z2dqYWdubndmbXF5ZXppbHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ4MDIxOSwiZXhwIjoyMDk0MDU2MjE5fQ.KZUqfNA8WbLmOXk0V_zcSDJJdBpg3iIRPd4gpKwlP88";
const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE}`, "apikey": SUPABASE_SERVICE };

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }

  const { barberId, code } = body ?? {};
  if (!barberId || !code) { res.status(400).json({ error: "barberId y code requeridos" }); return; }

  // Buscar verificación pendiente
  const r = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_verifications?barber_id=eq.${barberId}&verified=eq.false&select=*&order=created_at.desc&limit=1`, { headers });
  const rows = await r.json();
  const row  = rows?.[0];

  if (!row) { res.status(400).json({ error: "No hay verificación pendiente" }); return; }
  if (new Date(row.expires_at) < new Date()) { res.status(400).json({ error: "Código expirado, solicitá uno nuevo" }); return; }
  if (row.code !== code) { res.status(400).json({ error: "Código incorrecto" }); return; }

  // Marcar como verificado
  await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_verifications?id=eq.${row.id}`, {
    method: "PATCH", headers, body: JSON.stringify({ verified: true }),
  });

  // Guardar número verificado en el barbero
  await fetch(`${SUPABASE_URL}/rest/v1/barbers?id=eq.${barberId}`, {
    method: "PATCH", headers, body: JSON.stringify({ whatsapp_number: row.phone, whatsapp_verified: true }),
  });

  res.status(200).json({ ok: true, phone: row.phone });
}
