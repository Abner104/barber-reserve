import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { playBookingSound } from "../../../lib/bookingSound";

export function useRealtimeBarberBookings() {
  const qc         = useQueryClient();
  const channelRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function setup() {
      const { getMyBarberProfile } = await import("../services/barberService");
      const barber = await getMyBarberProfile();
      if (!barber?.id || !active) return;

      const barberId = barber.id;

      // Limpiar canal anterior si existe
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel(`barber-bookings-${barberId}-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bookings" },
          (payload) => {
            if (!active) return;
            if (payload.new?.barber_id !== barberId) return;

            qc.invalidateQueries({ queryKey: ["my-upcoming"], exact: false, refetchType: "all" });
            qc.invalidateQueries({ queryKey: ["my-agenda"],   exact: false, refetchType: "all" });

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
        )
        .subscribe((status) => {
          console.log("Barber realtime:", status);
        });

      channelRef.current = channel;
    }

    setup();

    return () => {
      active = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [qc]);
}
