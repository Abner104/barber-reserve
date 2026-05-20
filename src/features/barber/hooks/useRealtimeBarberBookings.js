import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { playBookingSound } from "../../../lib/bookingSound";

export function useRealtimeBarberBookings() {
  const qc = useQueryClient();

  useEffect(() => {
    let channel  = null;
    let barberId = null;

    async function setup() {
      const { getMyBarberProfile } = await import("../services/barberService");
      const barber = await getMyBarberProfile();
      if (!barber?.id) return;

      barberId = barber.id;
      console.log("🔌 Barber realtime suscribiendo para:", barberId);

      channel = supabase
        .channel(`barber-bookings-${barberId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bookings" },
          (payload) => {
            // Filtrar solo reservas de este barbero
            const record = payload.new ?? payload.old;
            if (record?.barber_id !== barberId) return;

            qc.refetchQueries({ queryKey: ["my-upcoming"], exact: false });
            qc.refetchQueries({ queryKey: ["my-agenda"],   exact: false });

            if (payload.eventType === "INSERT") {
              playBookingSound();
              const b = payload.new;
              toast.success(
                `🔔 Nueva reserva${b?.type === "delivery" ? " a domicilio 📍" : ""}`,
                {
                  description: b?.scheduled_at
                    ? new Date(b.scheduled_at).toLocaleDateString("es-CL", {
                        weekday: "short", day: "numeric", month: "short",
                        hour: "2-digit", minute: "2-digit",
                        timeZone: "America/Santiago",
                      })
                    : "",
                  duration: 8000,
                }
              );
            }
          }
        )
        .subscribe((status) => {
          console.log("Barber realtime status:", status);
        });
    }

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);
}
