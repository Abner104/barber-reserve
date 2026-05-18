import { supabase } from "../../../lib/supabase";

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
  return data;
}

export async function deleteShop(shopId) {
  // Soft delete — solo desactivar
  const { error } = await supabase
    .from("barbershops").update({ is_active: false }).eq("id", shopId);
  if (error) throw error;
}

// ── SAAS CONFIG ──────────────────────────────────────────────
export async function getSaasConfig() {
  const { data, error } = await supabase
    .from("saas_config")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
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
