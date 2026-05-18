import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../store/authStore";
import { toast } from "sonner";
import { playBookingSound } from "../../../lib/bookingSound";

export function useRealtimeBookings() {
  const qc      = useQueryClient();
  const profile = useAuthStore(s => s.profile);
  const shopId  = profile?.shop_id;

  useEffect(() => {
    // No suscribir hasta tener el shopId real
    if (!shopId) return;

    const channel = supabase
      .channel(`bookings-admin-${shopId}`)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "bookings",
        },
        (payload) => {
          const record = payload.new ?? payload.old;
          console.log("📡 Realtime payload:", {
            event:          payload.eventType,
            record_shop_id: record?.shop_id,
            my_shop_id:     shopId,
            match:          record?.shop_id === shopId,
          });

          qc.invalidateQueries({ queryKey: ["upcoming-bookings"], exact: false, refetchType: "all" });
          qc.invalidateQueries({ queryKey: ["today-bookings"],    exact: false, refetchType: "all" });
          qc.invalidateQueries({ queryKey: ["admin-stats"],       exact: false, refetchType: "all" });
          qc.invalidateQueries({ queryKey: ["admin-bookings"],    exact: false, refetchType: "all" });

          if (payload.eventType === "INSERT") {
            const b = payload.new;
            playBookingSound();
            toast.success(
              `🔔 Nueva reserva${b.type === "delivery" ? " a domicilio 📍" : ""}`,
              {
                description: b.scheduled_at
                  ? new Date(b.scheduled_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
                  : "",
                duration: 8000,
                action: { label: "Ver", onClick: () => window.location.href = "/admin/bookings" },
              }
            );
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime bookings:", status);
      });

    return () => { supabase.removeChannel(channel); };
  }, [shopId, qc]);
}
