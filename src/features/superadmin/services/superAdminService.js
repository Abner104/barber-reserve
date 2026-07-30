import { supabase } from "../../../lib/supabase";

// ── AUDITORÍA ────────────────────────────────────────────────
// Registra una acción sensible del super-admin. No bloquea el flujo si falla.
export async function logAudit({ action, shopId, shopName, detail }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("superadmin_audit_log").insert({
      actor_id:    user?.id ?? null,
      actor_email: user?.email ?? null,
      action,
      shop_id:     shopId ?? null,
      shop_name:   shopName ?? null,
      detail:      detail ?? null,
    });
  } catch (e) {
    console.error("[logAudit]", e);
  }
}

export async function getShopAuditLog(shopId) {
  const { data, error } = await supabase
    .from("superadmin_audit_log")
    .select("id, actor_email, action, detail, created_at")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function getAllShops() {
  const { data, error } = await supabase
    .from("barbershops")
    .select(`
      id, name, slug, city, plan, is_active,
      created_at, trial_ends_at, subscribed_at,
      logo_url, whatsapp_number
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getShopStats(shopId) {
  const [barbers, services, bookings, clients] = await Promise.all([
    supabase.from("barbers").select("id", { count: "exact" }).eq("shop_id", shopId).eq("is_active", true),
    supabase.from("services").select("id", { count: "exact" }).eq("shop_id", shopId).eq("is_available", true),
    supabase.from("bookings").select("id, price, status, type, created_at", { count: "exact" }).eq("shop_id", shopId),
    supabase.from("clients").select("id", { count: "exact" }).eq("shop_id", shopId),
  ]);

  const completedBookings = (bookings.data || []).filter(b => b.status === "completed");
  const revenue = completedBookings.reduce((s, b) => s + Number(b.price || 0), 0);
  const deliveries = (bookings.data || []).filter(b => b.type === "delivery").length;

  // Reservas del último mes
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const recentBookings = (bookings.data || []).filter(b => new Date(b.created_at) > monthAgo).length;

  return {
    barbers:       barbers.count ?? 0,
    services:      services.count ?? 0,
    totalBookings: bookings.count ?? 0,
    clients:       clients.count ?? 0,
    revenue,
    deliveries,
    recentBookings,
  };
}

export async function getGlobalStats() {
  const [shops, bookings, clients] = await Promise.all([
    supabase.from("barbershops").select("id, plan, is_active, created_at"),
    supabase.from("bookings").select("price, status, created_at"),
    supabase.from("clients").select("id, created_at"),
  ]);

  const activeShops  = (shops.data || []).filter(s => s.is_active).length;
  const trialShops   = (shops.data || []).filter(s => s.plan === "trial").length;
  const proShops     = (shops.data || []).filter(s => s.plan === "pro").length;

  const revenue = (bookings.data || [])
    .filter(b => b.status === "completed")
    .reduce((s, b) => s + Number(b.price || 0), 0);

  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const newShopsMonth    = (shops.data || []).filter(s => new Date(s.created_at) > monthAgo).length;
  const bookingsMonth    = (bookings.data || []).filter(b => new Date(b.created_at) > monthAgo).length;

  return {
    totalShops: shops.data?.length ?? 0,
    activeShops,
    trialShops,
    proShops,
    totalRevenue: revenue,
    totalClients: clients.data?.length ?? 0,
    newShopsMonth,
    bookingsMonth,
  };
}

export async function updateShopPlan(shopId, plan, is_active) {
  const updates = {};
  if (plan !== undefined)      updates.plan      = plan;
  if (is_active !== undefined) updates.is_active = is_active;
  if (plan === "pro")          updates.subscribed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("barbershops").update(updates).eq("id", shopId).select().single();
  if (error) throw error;

  if (plan === "pro" && data.referred_by_supplier_id) {
    await settleReferralCommission(data);
  }

  return data;
}

async function settleReferralCommission(shop) {
  const { data: config } = await supabase
    .from("saas_config")
    .select("base_price, price_per_barber")
    .eq("id", 1)
    .maybeSingle();

  const { count: barberCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shop.id)
    .eq("role", "barber");

  const base   = config?.base_price       ?? 11990;
  const perBar = config?.price_per_barber ?? 2990;
  const firstPayment = base + Math.max(0, (barberCount ?? 1) - 1) * perBar;
  const rate = 0.40;

  await supabase.from("referral_commissions").upsert({
    supplier_id: shop.referred_by_supplier_id,
    shop_id: shop.id,
    rate,
    first_payment_amount: firstPayment,
    commission_amount: Math.round(firstPayment * rate),
    status: "pending",
  }, { onConflict: "supplier_id,shop_id" });
}

// ── SAAS CONFIG ──────────────────────────────────────────────
export async function getSaasConfig() {
  const { data, error } = await supabase
    .from("saas_config")
    .select("id, base_price, price_per_barber, trial_days")
    .eq("id", 1)
    .maybeSingle();
  // Si no existe la fila o hay error de permisos, devuelve defaults
  if (error || !data) return { id: 1, base_price: 11990, price_per_barber: 2990, trial_days: 30 };
  return data;
}

export async function updateSaasConfig(updates) {
  const { data, error } = await supabase
    .from("saas_config")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return data;
}
