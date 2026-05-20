import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { playBookingSound } from "../../../lib/bookingSound";

export function useRealtimeBarberBookings() {
  const qc = useQueryClient();

  useEffect(() => {
    let channel   = null;
    let cancelled = false;

    async function setup() {
      const { getMyBarberProfile } = await import("../services/barberService");
      const barber = await getMyBarberProfile();
      if (!barber?.id || cancelled) return;

      const barberId = barber.id;

      channel = supabase
        .channel(`barber-bookings-${barberId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bookings" },
          (payload) => {
            const record = payload.new ?? payload.old;
            if (record?.barber_id !== barberId) return;

            qc.invalidateQueries({ queryKey: ["my-upcoming"], exact: false, refetchType: "all" });
            qc.invalidateQueries({ queryKey: ["my-agenda"],   exact: false, refetchType: "all" });

            if (payload.eventType === "INSERT") {
              playBookingSound();
              toast.success(
                `🔔 Nueva reserva${payload.new?.type === "delivery" ? " a domicilio 📍" : ""}`,
                {
                  description: payload.new?.scheduled_at
                    ? new Date(payload.new.scheduled_at).toLocaleDateString("es-CL", {
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
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);
}
