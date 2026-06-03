export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }

  const SUPABASE_URL     = process.env.SUPABASE_URL     || "https://jyggjagnnwfmqyezilzv.supabase.co";
  const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Z2dqYWdubndmbXF5ZXppbHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ4MDIxOSwiZXhwIjoyMDk0MDU2MjE5fQ.KZUqfNA8WbLmOXk0V_zcSDJJdBpg3iIRPd4gpKwlP88";

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }

  const { userId, newPassword } = body ?? {};
  if (!userId || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "userId y newPassword (mín. 6 caracteres) son requeridos" });
    return;
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE}`,
        "apikey":        SUPABASE_SERVICE,
      },
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message ?? data.msg ?? JSON.stringify(data));
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
