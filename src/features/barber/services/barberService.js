import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../store/authStore";
import { SHOP_ID } from "../../../lib/constants";

async function getMyBarberId() {
  const { user, profile } = useAuthStore.getState();
  if (!user) return null;

  // Override del admin para ver el panel de un barbero específico
  const adminViewId = sessionStorage.getItem("admin_view_barber_id");
  if (adminViewId && (profile?.role === "owner" || profile?.role === "super_admin")) {
    const { data: override } = await supabase
      .from("barbers")
      .select("id, shop_id, full_name, phone, specialty, does_delivery, delivery_radius, commission_pct, is_active, avatar_url, lat, lng, address")
      .eq("id", adminViewId)
      .maybeSingle();
    if (override) return override;
  }

  // Buscar por profile_id (barbero con cuenta propia)
  const { data: byProfile } = await supabase
    .from("barbers")
    .select("id, shop_id, full_name, phone, specialty, does_delivery, delivery_radius, commission_pct, is_active, avatar_url, lat, lng, address")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (byProfile) return byProfile;

  // Si es owner, devolver el primer barbero activo del shop
  if (profile?.role === "owner" || profile?.role === "super_admin") {
    const shopId = profile?.shop_id ?? SHOP_ID;
    const { data: first } = await supabase
      .from("barbers")
      .select("id, shop_id, full_name, phone, specialty, does_delivery, delivery_radius, commission_pct, is_active, avatar_url, lat, lng, address")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    return first;
  }

  return null;
}

export async function getMyBarberProfile() {
  return getMyBarberId();
}

export async function getMyUpcomingBookings() {
  const barber = await getMyBarberId();
  if (!barber) return [];

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, scheduled_at, duration_min, status, type, price, delivery_fee,
      address_line, client_notes, barber_notes,
      clients(full_name, phone),
      services(name)
    `)
    .eq("barber_id", barber.id)
    .gte("scheduled_at", now)
    .not("status", "in", '("cancelled","no_show","completed")')
    .order("scheduled_at")
    .limit(20);

  if (error) throw error;
  return data;
}

export async function getMyAgenda(date) {
  const barber = await getMyBarberId();
  if (!barber) return [];

  const d = date ?? new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, scheduled_at, duration_min, status, type, price, delivery_fee,
      address_line, client_notes, barber_notes,
      clients(full_name, phone),
      services(name)
    `)
    .eq("barber_id", barber.id)
    .gte("scheduled_at", `${d}T00:00:00-04:00`)
    .lte("scheduled_at", `${d}T23:59:59-04:00`)
    .not("status", "in", '("cancelled","no_show")')
    .order("scheduled_at");

  if (error) throw error;
  return data;
}

export async function getMyCaja(date) {
  const barber = await getMyBarberId();
  if (!barber) return { bookings: [], total: 0, myEarnings: 0, deliveries: 0, model: "percentage" };

  const d = date ?? new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });

  const { data, error } = await supabase
    .from("bookings")
    .select("id, price, price_final, delivery_fee, status, type, scheduled_at, services(name), clients(full_name)")
    .eq("barber_id", barber.id)
    .gte("scheduled_at", `${d}T00:00:00-04:00`)
    .lte("scheduled_at", `${d}T23:59:59-04:00`)
    .in("status", ["completed", "confirmed", "in_progress"])
    .order("scheduled_at");

  if (error) throw error;

  const total      = (data || []).reduce((s, b) => s + Number(b.price_final != null ? b.price_final : (b.price || 0)), 0);
  const deliveries = (data || []).reduce((s, b) => s + Number(b.delivery_fee || 0), 0);
  const model      = barber.payment_model ?? "percentage";

  let myEarnings = 0;
  let modelInfo  = {};

  if (model === "independent") {
    myEarnings = total + deliveries;
    modelInfo  = {};
  } else if (model === "percentage") {
    const pct  = Number(barber.commission_pct ?? 0);
    myEarnings = total * (pct / 100);
    modelInfo  = { pct };
  } else if (model === "chair_rent") {
    myEarnings = total;
    modelInfo  = { rentAmount: Number(barber.chair_rent_amount ?? 0), rentPeriod: barber.chair_rent_period ?? "monthly" };
  } else if (model === "day_rate") {
    const dayRate = Number(barber.day_rate_amount ?? 0);
    myEarnings    = total - dayRate;
    modelInfo     = { dayRate };
  }

  return { bookings: data || [], total, myEarnings, deliveries, model, modelInfo };
}

export async function updateMyAvailability(updates) {
  const barber = await getMyBarberId();
  if (!barber) throw new Error("Barbero no encontrado");

  const { data, error } = await supabase
    .from("barbers")
    .update(updates)
    .eq("id", barber.id)
    .select().single();

  if (error) throw error;
  return data;
}

export async function updateBookingNote(bookingId, barber_notes) {
  const { data, error } = await supabase
    .from("bookings")
    .update({ barber_notes })
    .eq("id", bookingId)
    .select().single();
  if (error) throw error;
  return data;
}
