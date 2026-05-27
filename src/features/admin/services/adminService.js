import { supabase } from "../../../lib/supabase";
import { SHOP_ID } from "../../../lib/constants";
import { useAuthStore } from "../../../store/authStore";

// Lee el shop_id del authStore (ya cargado al iniciar sesión) — sin llamadas extra
export function resolveShopId() {
  const profile = useAuthStore.getState().profile;
  return profile?.shop_id ?? SHOP_ID;
}

// Fecha local Chile (America/Santiago) en formato YYYY-MM-DD
function todayChile() {
  return new Date().toLocaleDateString("es-CL", {
    timeZone: "America/Santiago",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).split("-").reverse().join("-"); // DD-MM-YYYY → YYYY-MM-DD
}

// ── DASHBOARD ────────────────────────────────────────────────
export async function getDashboardStats() {
  const sid   = resolveShopId();
  const today = todayChile();
  // Rango del día en hora local de Santiago (UTC-4)
  const dayStart = `${today}T00:00:00-04:00`;
  const dayEnd   = `${today}T23:59:59-04:00`;

  const [bookingsToday, deliveriesToday, newClients, completedBookings] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact" })
      .eq("shop_id", sid)
      .gte("scheduled_at", dayStart).lte("scheduled_at", dayEnd)
      .in("status", ["pending", "confirmed", "in_progress", "completed"]),
    supabase.from("bookings").select("id", { count: "exact" })
      .eq("shop_id", sid).eq("type", "delivery")
      .gte("scheduled_at", dayStart).lte("scheduled_at", dayEnd),
    supabase.from("clients").select("id", { count: "exact" })
      .eq("shop_id", sid).gte("created_at", dayStart),
    supabase.from("bookings").select("price")
      .eq("shop_id", sid).eq("status", "completed")
      .gte("scheduled_at", dayStart).lte("scheduled_at", dayEnd),
  ]);

  const revenue = (completedBookings.data || []).reduce((s, b) => s + Number(b.price), 0);
  return {
    bookingsToday:   bookingsToday.count    ?? 0,
    deliveriesToday: deliveriesToday.count  ?? 0,
    newClients:      newClients.count       ?? 0,
    revenueToday:    revenue,
  };
}

export async function getTodayBookings() {
  const sid   = resolveShopId();
  const today = todayChile();
  const dayStart = `${today}T00:00:00-04:00`;
  const dayEnd   = `${today}T23:59:59-04:00`;

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, scheduled_at, duration_min, status, type, price, delivery_fee,
      address_line, client_notes, payment_proof_url,
      clients(full_name, phone),
      barbers(full_name),
      services(name)
    `)
    .eq("shop_id", sid)
    .gte("scheduled_at", dayStart)
    .lte("scheduled_at", dayEnd)
    .not("status", "in", '("cancelled","no_show")')
    .order("scheduled_at");
  if (error) throw error;
  return data;
}

// Próximas reservas (hoy + futuras pendientes) — para el dashboard
export async function getUpcomingBookings() {
  const sid = resolveShopId();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, scheduled_at, duration_min, status, type, price, delivery_fee,
      address_line, client_notes, payment_proof_url,
      clients(full_name, phone),
      barbers(full_name),
      services(name)
    `)
    .eq("shop_id", sid)
    .gte("scheduled_at", now)
    .in("status", ["pending", "confirmed"])
    .order("scheduled_at")
    .limit(20);
  if (error) throw error;
  return data;
}

// ── BARBEROS ─────────────────────────────────────────────────
export async function getAdminBarbers() {
  const sid = resolveShopId();
  const { data, error } = await supabase
    .from("barbers")
    .select("*, barber_services(service_id)")
    .eq("shop_id", sid)
    .order("full_name");
  if (error) throw error;
  return data;
}

export async function createBarber(barber) {
  const sid = resolveShopId();
  const { email, callmebot_key, ...barberData } = barber;

  // 1. Crear barbero en la tabla
  const { data: newBarber, error } = await supabase
    .from("barbers")
    .insert({ ...barberData, shop_id: sid })
    .select().single();
  if (error) throw error;

  // 2. Si tiene email, crear cuenta de usuario y mandar invitación
  if (email?.trim()) {
    const tempPassword = Math.random().toString(36).slice(-8) + "B1!";

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password: tempPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/barber`,
        data: { full_name: barberData.full_name },
      },
    });

    if (!authError && authData.user) {
      // 3. Crear perfil como barber
      await supabase.from("profiles").insert({
        id:        authData.user.id,
        shop_id:   sid,
        role:      "barber",
        full_name: barberData.full_name,
        phone:     barberData.phone ?? null,
      });

      // 4. Linkear el profile_id al barbero
      await supabase.from("barbers")
        .update({ profile_id: authData.user.id })
        .eq("id", newBarber.id);

      // 5. Retornar contraseña temporal para que el admin se la comparta
      return { ...newBarber, tempPassword, email };
    }
  }

  return newBarber;
}

export async function updateBarber(id, updates) {
  const sid = resolveShopId();
  // Excluir campos que no existen en la tabla
  const { email, callmebot_key, ...safe } = updates;
  const { data, error } = await supabase
    .from("barbers").update(safe).eq("id", id).eq("shop_id", sid)
    .select().single();
  if (error) throw error;
  return data;
}

export async function toggleBarberActive(id, is_active) {
  return updateBarber(id, { is_active });
}

export async function getBarberWorkingHours(barberId) {
  const { data, error } = await supabase
    .from("working_hours").select("*").eq("barber_id", barberId).order("day");
  if (error) throw error;
  return data;
}

export async function upsertWorkingHours(barberId, day, start_time, end_time, is_active, available_slots = null) {
  const sid = resolveShopId();
  const payload = { shop_id: sid, barber_id: barberId, day, start_time, end_time, is_active };
  if (available_slots !== null) payload.available_slots = available_slots;

  const { data, error } = await supabase
    .from("working_hours")
    .upsert(payload, { onConflict: "barber_id,day" })
    .select().single();
  if (error) throw error;
  return data;
}

export async function upsertWorkingSlots(barberId, day, available_slots, is_active = true) {
  const sid    = resolveShopId();
  const sorted = [...available_slots].sort();

  // end_time debe ser > start_time — sumamos 30min al último slot
  function addThirty(time) {
    const [h, m] = time.split(":").map(Number);
    const total  = h * 60 + m + 30;
    return `${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
  }

  const startTime = sorted[0]                 ?? "09:00";
  const lastSlot  = sorted[sorted.length - 1] ?? "09:00";
  const endTime   = addThirty(lastSlot);      // siempre > start_time

  const { data, error } = await supabase
    .from("working_hours")
    .upsert({
      shop_id:         sid,
      barber_id:       barberId,
      day,
      start_time:      startTime,
      end_time:        endTime,
      is_active:       is_active && sorted.length > 0,
      available_slots: sorted.length > 0 ? sorted : null,
    }, { onConflict: "barber_id,day" })
    .select().single();
  if (error) {
    console.error("upsertWorkingSlots error:", error);
    throw error;
  }
  return data;
}

// ── SERVICIOS ────────────────────────────────────────────────
export async function getAdminServices() {
  const sid = resolveShopId();
  const { data, error } = await supabase
    .from("services").select("*, service_categories(name)")
    .eq("shop_id", sid).order("sort_order");
  if (error) throw error;
  return data;
}

export async function getAdminCategories() {
  const sid = resolveShopId();
  const { data, error } = await supabase
    .from("service_categories").select("*").eq("shop_id", sid).order("sort_order");
  if (error) throw error;
  return data;
}

export async function createCategory(name) {
  const sid = resolveShopId();
  const { data, error } = await supabase
    .from("service_categories")
    .insert({ shop_id: sid, name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id) {
  const { error } = await supabase.from("service_categories").delete().eq("id", id);
  if (error) throw error;
}

export async function createService(service) {
  const sid = resolveShopId();
  const { data, error } = await supabase
    .from("services").insert({ ...service, shop_id: sid }).select().single();
  if (error) throw error;
  return data;
}

export async function updateService(id, updates) {
  const sid = resolveShopId();
  const { data, error } = await supabase
    .from("services").update(updates).eq("id", id).eq("shop_id", sid).select().single();
  if (error) throw error;
  return data;
}

export async function toggleServiceAvailable(id, is_available) {
  return updateService(id, { is_available });
}

export async function deleteService(id) {
  const sid = resolveShopId();
  const { error } = await supabase
    .from("services").delete().eq("id", id).eq("shop_id", sid);
  if (error) throw error;
}

// ── RESERVAS ─────────────────────────────────────────────────
export async function updateBookingStatus(id, status, reason = "") {
  const sid = resolveShopId();
  const { data, error } = await supabase
    .from("bookings").update({ status }).eq("id", id).eq("shop_id", sid).select(`
      id, status, type, scheduled_at, price, delivery_fee, address_line,
      clients(full_name, phone),
      barbers(full_name, phone),
      services(name),
      shop:barbershops(name)
    `).single();
  if (error) throw error;

  if (data && (status === "confirmed" || status === "cancelled")) {
    notifyClient(data, status, reason);
  }

  return data;
}

async function notifyClient(booking, status, reason = "") {
  const clientPhone = booking.clients?.phone;
  if (!clientPhone) return;

  const WA_URL    = import.meta.env.VITE_WA_SERVICE_URL ?? "http://localhost:3001";
  const WA_SECRET = "barberos2026secret";

  const at   = new Date(booking.scheduled_at);
  const date = at.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Santiago" });
  const time = at.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
  const shopName   = booking.shop?.name ?? "la barbería";
  const barberName = booking.barbers?.full_name ?? "tu barbero";
  const service    = booking.services?.name ?? "tu servicio";

  let message;
  if (status === "confirmed") {
    message = [
      `✅ *¡Reserva confirmada!* - ${shopName}`,
      ``,
      `Hola ${booking.clients.full_name} 👋`,
      `Tu reserva ha sido *confirmada* por ${barberName}.`,
      ``,
      `✂️ ${service}`,
      `📅 ${date} a las ${time}`,
      booking.type === "delivery" ? `📍 A domicilio: ${booking.address_line}` : `📍 En el local`,
      ``,
      `¡Te esperamos! 💈`,
    ].join("\n");
  } else {
    message = [
      `❌ *Reserva cancelada* - ${shopName}`,
      ``,
      `Hola ${booking.clients.full_name},`,
      `Lamentablemente tu reserva de *${service}* con ${barberName} fue cancelada.`,
      reason ? `\n📝 Motivo: ${reason}` : "",
      ``,
      `Puedes reagendar cuando quieras. 💈`,
    ].filter(Boolean).join("\n");
  }

  // El barbero que tiene la sesión activa manda el mensaje al cliente
  const barberId = booking.barbers?.id ?? null;
  if (!barberId) return;

  try {
    // Buscar el barber_id desde la reserva
    const { data: bookingData } = await supabase
      .from("bookings").select("barber_id").eq("id", booking.id).maybeSingle();

    await fetch(`${WA_URL}/notify-client`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WA_SECRET}`,
      },
      body: JSON.stringify({
        barberId: bookingData?.barber_id,
        clientPhone,
        message,
      }),
    });
  } catch (e) {
    console.error("Error notificando cliente:", e);
  }
}

export async function getBookings({ from, to, barberId, status } = {}) {
  const sid = resolveShopId();
  let query = supabase
    .from("bookings")
    .select(`id, scheduled_at, duration_min, status, type, price, delivery_fee,
      client_notes, barber_notes, address_line,
      clients(id, full_name, phone), barbers(id, full_name), services(id, name, duration_min)`)
    .eq("shop_id", sid).order("scheduled_at");

  if (from)     query = query.gte("scheduled_at", from);
  if (to)       query = query.lte("scheduled_at", to);
  if (barberId) query = query.eq("barber_id", barberId);
  if (status)   query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateBookingNotes(id, barber_notes) {
  const { data, error } = await supabase
    .from("bookings").update({ barber_notes }).eq("id", id).eq("shop_id", resolveShopId())
    .select().single();
  if (error) throw error;
  return data;
}

// ── PORTAFOLIO ───────────────────────────────────────────────
export async function getBarberPortfolio(barberId) {
  const { data, error } = await supabase
    .from("barber_portfolio")
    .select("id, image_url, caption")
    .eq("barber_id", barberId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addPortfolioPhoto(barberId, image_url, caption = "") {
  const { data, error } = await supabase
    .from("barber_portfolio")
    .insert({ barber_id: barberId, image_url, caption })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deletePortfolioPhoto(photoId) {
  const { error } = await supabase
    .from("barber_portfolio")
    .delete()
    .eq("id", photoId);
  if (error) throw error;
}
