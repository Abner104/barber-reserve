import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// URL del servicio de WhatsApp en tu VPS
const WA_SERVICE_URL = Deno.env.get("WA_SERVICE_URL") ?? "http://localhost:3001";
const WA_SECRET      = Deno.env.get("WA_WEBHOOK_SECRET") ?? "secret";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const booking = payload.record;
    if (!booking) return new Response("no record", { status: 400 });

    // Obtener datos del barbero, cliente, servicio y barbería
    const [
      { data: barber },
      { data: client },
      { data: service },
      { data: shop },
    ] = await Promise.all([
      supabase.from("barbers").select("id, full_name, phone").eq("id", booking.barber_id).maybeSingle(),
      supabase.from("clients").select("full_name, phone").eq("id", booking.client_id).maybeSingle(),
      supabase.from("services").select("name").eq("id", booking.service_id).maybeSingle(),
      supabase.from("barbershops").select("name").eq("id", booking.shop_id).maybeSingle(),
    ]);

    if (!barber?.phone) {
      return new Response(JSON.stringify({ skipped: "barber has no phone" }), { status: 200 });
    }

    // Formatear fecha
    const scheduledAt = new Date(booking.scheduled_at);
    const date = scheduledAt.toLocaleDateString("es-CL", {
      weekday: "long", day: "numeric", month: "long", timeZone: "America/Santiago",
    });
    const time = scheduledAt.toLocaleTimeString("es-CL", {
      hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago",
    });

    const total = Number(booking.price || 0) + Number(booking.delivery_fee || 0);
    const totalFmt = new Intl.NumberFormat("es-CL", {
      style: "currency", currency: "CLP", maximumFractionDigits: 0,
    }).format(total);

    const isDelivery = booking.type === "delivery";

    const message = [
      `🔔 *Nueva reserva - ${shop?.name ?? "Barbería"}*`,
      ``,
      `👤 Cliente: ${client?.full_name ?? "Sin nombre"}`,
      `📱 Tel: ${client?.phone ?? "-"}`,
      `✂️ Servicio: ${service?.name ?? "-"}`,
      `📅 Fecha: ${date}`,
      `🕐 Hora: ${time}`,
      isDelivery
        ? `📍 *DOMICILIO:* ${booking.address_line ?? "Ver panel"}`
        : `📍 En el local`,
      `💰 Total: ${totalFmt}`,
      booking.client_notes ? `📝 "${booking.client_notes}"` : null,
      ``,
      `✅ Confirma en el panel admin.`,
    ].filter(Boolean).join("\n");

    // Enviar al servicio de WhatsApp en el VPS
    const resp = await fetch(`${WA_SERVICE_URL}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WA_SECRET}`,
      },
      body: JSON.stringify({
        barberId: barber.id,
        phone:    barber.phone,
        message,
      }),
    });

    const result = await resp.json();
    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("notify-barber error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
