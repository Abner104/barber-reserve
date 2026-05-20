/**
 * Cron de recordatorios WhatsApp
 * Corre cada 15 min y envía recordatorios 24h y 1h antes de cada reserva
 * Agregar al index.js: require('./reminders')(sessions, supabase)
 */

const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");
if (!global.WebSocket) global.WebSocket = WebSocket;

module.exports = function startReminders(sessions, supabase) {

  async function sendReminders() {
    try {
      const now   = new Date();

      // Ventanas: 24h ± 15min y 1h ± 15min
      const windows = [
        { label: "24h", from: addMin(now, 23 * 60 + 45), to: addMin(now, 24 * 60 + 15) },
        { label: "1h",  from: addMin(now, 45),            to: addMin(now, 75)            },
      ];

      for (const win of windows) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select(`
            id, scheduled_at, type, reminder_sent_${win.label === "24h" ? "24h" : "1h"},
            clients(full_name, phone),
            services(name),
            barbers(id, full_name, phone),
            barbershops(name)
          `)
          .in("status", ["confirmed", "pending"])
          .gte("scheduled_at", win.from.toISOString())
          .lte("scheduled_at", win.to.toISOString());

        if (!bookings?.length) continue;

        for (const b of bookings) {
          const reminderCol = win.label === "24h" ? "reminder_sent_24h" : "reminder_sent_1h";
          if (b[reminderCol]) continue; // ya enviado

          const clientPhone = b.clients?.phone?.replace(/\D/g, "");
          if (!clientPhone) continue;

          const fecha = new Date(b.scheduled_at).toLocaleString("es-CL", {
            weekday: "long", day: "numeric", month: "long",
            hour: "2-digit", minute: "2-digit",
            timeZone: "America/Santiago",
          });

          const msg = win.label === "24h"
            ? `Hola ${b.clients.full_name} 👋\n\nTe recordamos tu reserva de *${b.services?.name}* con *${b.barbers?.full_name}* mañana:\n\n📅 ${fecha}${b.type === "delivery" ? "\n📍 A domicilio" : ""}\n\n_${b.barbershops?.name}_`
            : `Hola ${b.clients.full_name} ⏰\n\nTu reserva de *${b.services?.name}* es *en 1 hora*:\n\n📅 ${fecha}${b.type === "delivery" ? "\n📍 A domicilio" : ""}\n\n_${b.barbershops?.name}_`;

          // Buscar sesión activa del barbero
          const barberId = b.barbers?.id;
          const session  = barberId ? sessions[barberId] : Object.values(sessions).find(s => s?.status === "connected");

          if (!session || session.status !== "connected") {
            console.log(`⚠️  Sin sesión WA para reminder ${win.label} booking ${b.id}`);
            continue;
          }

          try {
            const intl = clientPhone.startsWith("56") ? clientPhone : `56${clientPhone}`;
            const jid  = `${intl}@s.whatsapp.net`;
            await session.sock.sendMessage(jid, { text: msg });

            // Marcar como enviado
            await supabase.from("bookings").update({ [reminderCol]: true }).eq("id", b.id);
            console.log(`✅ Reminder ${win.label} enviado → ${b.clients.full_name} (${b.id})`);
          } catch (e) {
            console.error(`❌ Error enviando reminder ${win.label}:`, e.message);
          }
        }
      }
    } catch (e) {
      console.error("❌ Error en cron reminders:", e.message);
    }
  }

  // Correr cada 15 minutos
  sendReminders();
  setInterval(sendReminders, 15 * 60 * 1000);
  console.log("⏰ Cron de recordatorios activo (cada 15 min)");
};

function addMin(date, min) {
  return new Date(date.getTime() + min * 60000);
}
