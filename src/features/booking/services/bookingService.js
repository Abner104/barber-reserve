import { supabase } from "../../../lib/supabase";
import { SHOP_ID } from "../../../lib/constants";
import { addMinutes, format } from "date-fns";
import { useBookingStore } from "../../../store/bookingStore";

// Lee el shopId del store en memoria — siempre actualizado
function getShopId() {
  return useBookingStore.getState().shopId || SHOP_ID;
}

// Mismo formato que api/client-login.js: base64(clientId:shopId:phone:expiry), 30 días.
// Generarlo acá evita el login por SMS cuando el cliente entra desde el link del email.
function makeClientToken(clientId, shopId, phone) {
  const raw = `${clientId}:${shopId}:${phone}:${Date.now() + 30 * 24 * 60 * 60 * 1000}`;
  return btoa(raw);
}

export async function getServices(shopId) {
  const id = shopId || getShopId();
  const { data, error } = await supabase
    .from("services")
    .select("*, service_categories(name)")
    .eq("shop_id", id)
    .eq("is_available", true)
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function getBarbers({ serviceId, type, shopId } = {}) {
  const id = shopId || getShopId();
  let query = supabase
    .from("barbers")
    .select("id, full_name, avatar_url, bio, specialty, does_delivery, delivery_radius, lat, lng, barber_services(service_id)")
    .eq("shop_id", id)
    .eq("is_active", true);

  if (type === "delivery") query = query.eq("does_delivery", true);

  const { data, error } = await query;
  if (error) throw error;

  if (serviceId) {
    return data.filter(b =>
      b.barber_services.length === 0 ||
      b.barber_services.some(bs => bs.service_id === serviceId)
    );
  }
  return data;
}

export async function getAvailableSlots({ barberId, date, durationMin, type }) {
  const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const dayName  = dayNames[new Date(date + "T12:00:00").getDay()];

  // Obtener horario y datos del barbero en paralelo
  const [{ data: wh }, { data: barberData }] = await Promise.all([
    supabase.from("working_hours")
      .select("start_time, end_time, available_slots")
      .eq("barber_id", barberId)
      .eq("day", dayName)
      .eq("is_active", true)
      .maybeSingle(),
    supabase.from("barbers")
      .select("slot_duration_min, travel_time_min")
      .eq("id", barberId)
      .maybeSingle(),
  ]);

  // Intervalo entre slots según el barbero (default 30 min)
  const slotInterval = barberData?.slot_duration_min ?? 30;

  // travel_time_min del barbero — siempre disponible para calcular bloqueos
  const travelMin = barberData?.travel_time_min ?? 0;

  // Para domicilios, el bloqueo del slot nuevo incluye el trayecto de ida+vuelta
  const effectiveDuration = type === "delivery" ? durationMin + travelMin : durationMin;

  if (!wh) return [];

  // Usar UTC explícito para filtrar — Chile es UTC-4
  const dayStart = `${date}T00:00:00-04:00`;
  const dayEnd   = `${date}T23:59:59-04:00`;

  const [{ data: existingBookings }, { data: blocks }] = await Promise.all([
    supabase.from("bookings")
      .select("scheduled_at, duration_min, type")
      .eq("barber_id", barberId)
      .gte("scheduled_at", dayStart)
      .lte("scheduled_at", dayEnd)
      .in("status", ["pending","confirmed","in_progress"]),
    supabase.from("time_blocks")
      .select("starts_at, ends_at")
      .eq("barber_id", barberId)
      .lte("starts_at", dayEnd)
      .gte("ends_at", dayStart),
  ]);

  // Función para verificar si un slot está bloqueado
  function isBlocked(cursor) {
    const slotEnd = addMinutes(cursor, effectiveDuration);

    return (
      (existingBookings || []).some(b => {
        const bs  = new Date(b.scheduled_at);
        const dur = b.duration_min || durationMin;

        if (b.type === "delivery" && travelMin > 0) {
          // Reserva existente = domicilio:
          // Bloquear [bs - travelMin ... bs + dur + travelMin]
          // El barbero necesita travelMin para ir Y travelMin para volver
          const blockedFrom = addMinutes(bs, -travelMin);
          const blockedTo   = addMinutes(bs, dur + travelMin);
          if (cursor < blockedTo && slotEnd > blockedFrom) return true;
        } else {
          // Reserva existente = local normal
          const beEnd = addMinutes(bs, dur);
          if (cursor < beEnd && slotEnd > bs) return true;

          // Si el NUEVO slot es domicilio, necesita travelMin libres antes de salir
          // — no puede haber un cliente en el local dentro de ese margen
          if (type === "delivery" && travelMin > 0) {
            const departFrom = addMinutes(cursor, -travelMin);
            if (bs < cursor && beEnd > departFrom) return true;
          }
        }

        return false;
      }) ||
      (blocks || []).some(bl => {
        const bs = new Date(bl.starts_at);
        const be = new Date(bl.ends_at);
        return cursor < be && slotEnd > bs;
      })
    );
  }

  // Hora actual en Chile — no mostrar slots pasados si es hoy
  const nowChile  = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }));
  const isToday   = date === format(nowChile, "yyyy-MM-dd");

  // MODO 1: Slots específicos
  if (wh.available_slots && wh.available_slots.length > 0) {
    return wh.available_slots.filter(slot => {
      const cursor = new Date(`${date}T${slot}:00-04:00`);
      if (isToday && cursor <= nowChile) return false; // ya pasó
      return !isBlocked(cursor);
    });
  }

  // MODO 2: Rango continuo
  const slots     = [];
  const workStart = new Date(`${date}T${wh.start_time}-04:00`);
  const workEnd   = new Date(`${date}T${wh.end_time}-04:00`);
  let cursor      = workStart;

  while (addMinutes(cursor, effectiveDuration) <= workEnd) {
    // Filtrar slots ya pasados si es hoy
    if (!isToday || cursor > nowChile) {
      if (!isBlocked(cursor)) slots.push(format(cursor, "HH:mm"));
    }
    cursor = addMinutes(cursor, slotInterval);
  }

  return slots;
}

export async function createBooking({ type, serviceId, barberId, date, slot, durationMin, price, deliveryFee = 0, address, clientInfo, proofUrl = null, peopleCount = 1 }) {
  const shopId = getShopId();

  // 0. Verificar que el día no esté bloqueado por el barbero
  const { data: block } = await supabase
    .from("barber_blocks")
    .select("id, reason")
    .eq("barber_id", barberId)
    .eq("date", date)
    .maybeSingle();
  if (block) {
    throw new Error(block.reason ? `El barbero no está disponible ese día: ${block.reason}` : "El barbero no está disponible ese día.");
  }

  // 0b. Verificar solapamiento real con reservas existentes del día
  const newStart = new Date(`${date}T${slot}:00-04:00`);
  const newEnd   = addMinutes(newStart, durationMin);
  const dayStart = `${date}T00:00:00-04:00`;
  const dayEnd   = `${date}T23:59:59-04:00`;

  const [{ data: dayBookings }, { data: barberMeta }] = await Promise.all([
    supabase.from("bookings")
      .select("id, scheduled_at, duration_min, type")
      .eq("barber_id", barberId)
      .in("status", ["pending", "confirmed", "in_progress"])
      .gte("scheduled_at", dayStart)
      .lte("scheduled_at", dayEnd),
    supabase.from("barbers")
      .select("travel_time_min")
      .eq("id", barberId)
      .maybeSingle(),
  ]);

  const travelMinCreate = barberMeta?.travel_time_min ?? 0;

  const conflict = (dayBookings || []).find(b => {
    const bStart = new Date(b.scheduled_at);
    const bDur   = b.duration_min || durationMin;

    if (b.type === "delivery" && travelMinCreate > 0) {
      const blockedFrom = addMinutes(bStart, -travelMinCreate);
      const blockedTo   = addMinutes(bStart, bDur + travelMinCreate);
      return newStart < blockedTo && newEnd > blockedFrom;
    } else {
      const bEnd = addMinutes(bStart, bDur);
      if (newStart < bEnd && newEnd > bStart) return true;
      if (type === "delivery" && travelMinCreate > 0) {
        const departFrom = addMinutes(newStart, -travelMinCreate);
        return bStart < newStart && bEnd > departFrom;
      }
      return false;
    }
  });

  if (conflict) {
    const hora = new Date(conflict.scheduled_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    throw new Error(`El barbero ya tiene una reserva a las ${hora}. Elige otra hora.`);
  }

  // 1. buscar o crear cliente por teléfono dentro del shop
  let clientId;
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("shop_id", shopId)
    .eq("phone", clientInfo.phone)
    .maybeSingle();

  if (existing) {
    clientId = existing.id;
    if (clientInfo.email?.trim()) {
      await supabase.from("clients").update({ email: clientInfo.email.trim() }).eq("id", clientId);
    }
  } else {
    const { data: newClient, error: ce } = await supabase
      .from("clients")
      .insert({ shop_id: shopId, full_name: clientInfo.full_name, phone: clientInfo.phone, email: clientInfo.email?.trim() || null })
      .select("id")
      .single();
    if (ce) throw ce;
    clientId = newClient.id;
  }

  // 2. guardar dirección si es domicilio
  let addressId = null;
  if (type === "delivery" && address.lat) {
    const { data: addr, error: ae } = await supabase
      .from("client_addresses")
      .insert({ client_id: clientId, address_line: address.line, lat: address.lat, lng: address.lng })
      .select("id").single();
    if (ae) throw ae;
    addressId = addr.id;
  }

  // 3. crear la reserva — siempre con timezone Chile explícito
  const scheduledAt = new Date(`${date}T${slot}:00-04:00`).toISOString();
  const payload = {
    shop_id:      shopId,
    client_id:    clientId,
    barber_id:    barberId,
    service_id:   serviceId,
    type,
    scheduled_at: scheduledAt,
    duration_min: durationMin,
    people_count: peopleCount,
    price,
    status:       "confirmed",
    client_notes:      clientInfo.notes || null,
    payment_proof_url: proofUrl || null,
    ...(type === "delivery" && {
      address_id:   addressId,
      address_line: address.line,
      lat:          address.lat,
      lng:          address.lng,
      delivery_fee: deliveryFee,
    }),
  };

  const { data, error } = await supabase.rpc("create_public_booking", { payload });
  if (error) {
    if (error.code === "23P01") throw new Error("Ese horario se acaba de ocupar. Por favor elegí otra hora.");
    throw error;
  }

  // Notificaciones al barbero y cliente
  try {
    const at      = new Date(`${date}T${slot}:00-04:00`);
    const hora    = at.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
    const dia     = at.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Santiago" });
    const precio  = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(price + (deliveryFee || 0));

    // Push notification al barbero
    fetch("/api/push-notify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId, title: "🔔 Nueva reserva", message: `${clientInfo.full_name} · ${dia} a las ${hora}`, url: "/barber" }),
    }).catch(() => {});

    // WhatsApp al barbero via Twilio
    fetch("/api/whatsapp-notify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barberId,
        clientName:  clientInfo.full_name,
        serviceName: data.services?.name ?? "",
        date:        dia,
        time:        hora,
        type,
        address:     address?.line ?? "",
        price:       precio,
      }),
    }).catch(() => {});

    // Notificaciones al cliente
    {
      const { data: barberData } = await supabase.from("barbers").select("full_name").eq("id", barberId).maybeSingle();
      const { data: shopData }   = await supabase.from("barbershops").select("name, slug, logo_url").eq("id", shopId).maybeSingle();
      const clientToken = makeClientToken(clientId, shopId, clientInfo.phone);
      const manageUrl = shopData?.slug
        ? `https://www.clipprreserve.com/${shopData.slug}/mis-reservas?token=${encodeURIComponent(clientToken)}`
        : "https://www.clipprreserve.com";

      const EMAIL_SERVICE_URL = import.meta.env.VITE_EMAIL_SERVICE_URL;
      if (clientInfo.email?.trim() && EMAIL_SERVICE_URL) {
        fetch(`${EMAIL_SERVICE_URL}/send-email`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to:          clientInfo.email.trim(),
            type:        "confirmation",
            clientName:  clientInfo.full_name,
            serviceName: data.services?.name ?? "",
            barberName:  barberData?.full_name ?? "",
            shopName:    shopData?.name ?? "Barbería",
            date:        dia,
            time:        hora,
            manageUrl,
            logoUrl:     shopData?.logo_url ?? null,
          }),
        }).catch(() => {});
      }

      if (clientInfo.phone) {
        // WhatsApp al cliente (sandbox por ahora)
        fetch("/api/whatsapp-client", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone:       clientInfo.phone,
            type:        "confirmed",
            clientName:  clientInfo.full_name,
            serviceName: data.services?.name ?? "",
            barberName:  barberData?.full_name ?? "",
            shopName:    shopData?.name ?? "Barbería",
            shopSlug:    shopData?.slug ?? "",
            date:        dia,
            time:        hora,
          }),
        }).catch(() => {});

        // SMS al cliente con confirmación y link para ver/cancelar
        fetch("/api/whatsapp-client", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone:   clientInfo.phone,
            type:    "sms",
            message: `Reserva confirmada en ${shopData?.name ?? "la barbería"} - ${dia} a las ${hora} con ${barberData?.full_name ?? "tu barbero"}. Ver o cancelar: ${manageUrl}`,
          }),
        }).catch(() => {});
      }
    }
  } catch {}

  return data;
}

