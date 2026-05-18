import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

export function useRealtimeBarberBookings() {
  const qc = useQueryClient();

  useEffect(() => {
    let barberId = null;
    let channel  = null;

    async function setup() {
      // Importar dinámicamente para evitar circular deps
      const { getMyBarberProfile } = await import("../services/barberService");
      const barber = await getMyBarberProfile();
      if (!barber?.id) return;

      barberId = barber.id;

      channel = supabase
        .channel(`barber-bookings-${barberId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bookings" },
          (payload) => {
            const record = payload.new ?? payload.old;
            if (record?.barber_id !== barberId) return;

            // Refrescar agenda
            qc.invalidateQueries({ queryKey: ["my-upcoming"],  exact: false, refetchType: "all" });
            qc.invalidateQueries({ queryKey: ["my-agenda"],    exact: false, refetchType: "all" });

            // Toast solo para nuevas reservas
            if (payload.eventType === "INSERT") {
              const b = payload.new;
              toast.success(
                `🔔 Nueva reserva${b.type === "delivery" ? " a domicilio 📍" : ""}`,
                {
                  description: b.scheduled_at
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
          console.log("Barber realtime:", status);
        });
    }

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);
}
