export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }

  const { email, password, fullName, supplierName, description, whatsapp } = req.body ?? {};

  if (!email || !password || !fullName || !supplierName) {
    res.status(400).json({ error: "Faltan campos obligatorios" });
    return;
  }

  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE) {
    res.status(500).json({ error: "Variables de entorno no configuradas" });
    return;
  }

  const headers = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${SUPABASE_SERVICE}`,
    "apikey":        SUPABASE_SERVICE,
  };

  try {
    // 1. Crear usuario en Supabase Auth
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method:  "POST",
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      }),
    });
    const authData = await authRes.json();
    if (!authRes.ok) {
      throw new Error(authData.message ?? authData.error ?? "Error al crear usuario");
    }
    const userId = authData.id;

    // 2. Actualizar perfil con rol supplier
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method:  "PATCH",
      headers: { ...headers, "Prefer": "return=minimal" },
      body: JSON.stringify({ role: "supplier", full_name: fullName }),
    });

    // 3. Crear registro en tabla suppliers
    const supplierRes = await fetch(`${SUPABASE_URL}/rest/v1/suppliers`, {
      method:  "POST",
      headers: { ...headers, "Prefer": "return=representation" },
      body: JSON.stringify({
        profile_id:  userId,
        name:        supplierName,
        description: description || null,
        whatsapp:    whatsapp    || null,
        is_active:   true,
      }),
    });
    const supplierData = await supplierRes.json();
    if (!supplierRes.ok) {
      throw new Error(supplierData.message ?? "Error al crear el proveedor");
    }

    res.status(200).json({ supplier: supplierData[0] ?? supplierData });

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
