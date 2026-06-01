export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const SUPABASE_URL     = process.env.SUPABASE_URL     || "https://jyggjagnnwfmqyezilzv.supabase.co";
  const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Z2dqYWdubndmbXF5ZXppbHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ4MDIxOSwiZXhwIjoyMDk0MDU2MjE5fQ.KZUqfNA8WbLmOXk0V_zcSDJJdBpg3iIRPd4gpKwlP88";

  let body = req.body;
  // Vercel a veces entrega el body como string si Content-Type no matchea
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { email, password, fullName, supplierName, description, whatsapp } = body ?? {};

  if (!email || !password || !fullName || !supplierName) {
    res.status(400).json({ error: "Faltan campos: email, password, fullName, supplierName" });
    return;
  }

  const base = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${SUPABASE_SERVICE}`,
    "apikey":        SUPABASE_SERVICE,
  };

  try {
    // 1. Crear usuario auth
    const authRes  = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST", headers: base,
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName } }),
    });
    const authData = await authRes.json();
    if (!authRes.ok) throw new Error(authData.msg ?? authData.message ?? authData.error_description ?? JSON.stringify(authData));

    const userId = authData.id;

    // 2. Upsert perfil con rol supplier (puede que el trigger lo cree, puede que no)
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: { ...base, "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ id: userId, full_name: fullName, role: "supplier" }),
    });

    // 3. Insertar en suppliers
    const supRes  = await fetch(`${SUPABASE_URL}/rest/v1/suppliers`, {
      method: "POST",
      headers: { ...base, "Prefer": "return=representation" },
      body: JSON.stringify({
        profile_id:  userId,
        name:        supplierName,
        slug:        supplierName.toLowerCase().trim().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),
        description: description || null,
        whatsapp:    whatsapp    || null,
        is_active:   true,
      }),
    });
    const supData = await supRes.json();
    if (!supRes.ok) throw new Error(supData.message ?? supData.hint ?? JSON.stringify(supData));

    res.status(200).json({ supplier: Array.isArray(supData) ? supData[0] : supData });

  } catch (e) {
    console.error("[create-supplier]", e.message);
    res.status(400).json({ error: e.message });
  }
}
