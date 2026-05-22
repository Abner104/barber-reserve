import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Search, Calendar } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { formatCurrency } from "../../../lib/utils";
import { getMyBarberProfile } from "../services/barberService";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "../../../lib/constants";

const O = "var(--brand, #FF6B2C)";

async function getHistorial(barberId, from, to, search) {
  let query = supabase
    .from("bookings")
    .select("id, scheduled_at, status, type, price, price_final, delivery_fee, duration_min, client_notes, barber_notes, address_line, clients(full_name, phone), services(name)")
    .eq("barber_id", barberId)
    .in("status", ["completed", "cancelled", "no_show"])
    .order("scheduled_at", { ascending: false })
    .limit(100);

  if (from) query = query.gte("scheduled_at", from + "T00:00:00-04:00");
  if (to)   query = query.lte("scheduled_at", to   + "T23:59:59-04:00");

  const { data, error } = await query;
  if (error) throw error;

  if (search) {
    const s = search.toLowerCase();
    return (data || []).filter(b =>
      b.clients?.full_name?.toLowerCase().includes(s) ||
      b.services?.name?.toLowerCase().includes(s) ||
      b.clients?.phone?.includes(s)
    );
  }
  return data || [];
}

export default function HistorialPage() {
  const [from, setFrom]     = useState("");
  const [to, setTo]         = useState("");
  const [search, setSearch] = useState("");

  const { data: profile } = useQuery({ queryKey: ["my-barber-profile"], queryFn: getMyBarberProfile });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["barber-historial", profile?.id, from, to, search],
    queryFn:  () => getHistorial(profile.id, from || null, to || null, search),
    enabled:  !!profile?.id,
  });

  const totalEarned  = bookings.filter(b => b.status === "completed").reduce((s, b) => s + Number(b.price_final ?? b.price ?? 0), 0);
  const totalCortes  = bookings.filter(b => b.status === "completed").length;
  const totalCancels = bookings.filter(b => b.status === "cancelled").length;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>Mi historial</h1>
      <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 20 }}>Todos tus servicios completados</p>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 4, fontWeight: 700, letterSpacing: 1 }}>CORTES</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>{totalCortes}</p>
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 4, fontWeight: 700, letterSpacing: 1 }}>FACTURADO</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: O }}>{formatCurrency(totalEarned)}</p>
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 4, fontWeight: 700, letterSpacing: 1 }}>CANCELADAS</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: totalCancels > 0 ? "#ef4444" : "var(--text)" }}>{totalCancels}</p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {/* Buscador */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 180, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px" }}>
          <Search size={14} color="var(--text-faint)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente o servicio..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: 13 }}
          />
        </div>
        {/* Fechas */}
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--border)", color: from ? "var(--text)" : "var(--text-faint)", fontSize: 13 }} />
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--border)", color: to ? "var(--text)" : "var(--text-faint)", fontSize: 13 }} />
        {(from || to || search) && (
          <button onClick={() => { setFrom(""); setTo(""); setSearch(""); }}
            style={{ padding: "8px 12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-faint)", fontSize: 12, cursor: "pointer" }}>
            Limpiar
          </button>
        )}
      </div>

      {/* Lista */}
      {isLoading && [1,2,3].map(i => (
        <div key={i} style={{ height: 72, borderRadius: 12, background: "var(--surface2)", marginBottom: 8 }} />
      ))}

      {!isLoading && bookings.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-faint)" }}>
          <Calendar size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>No hay servicios en este período</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bookings.map(b => {
          const sc      = BOOKING_STATUS_COLOR[b.status] ?? { bg: "var(--surface2)", text: "var(--text-faint)" };
          const price   = b.price_final ?? b.price ?? 0;
          const fecha   = format(new Date(b.scheduled_at), "EEE d MMM · HH:mm", { locale: es });

          return (
            <div key={b.id} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              {/* Fecha */}
              <div style={{ textAlign: "center", minWidth: 44, flexShrink: 0 }}>
                <p style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>
                  {format(new Date(b.scheduled_at), "d", { locale: es })}
                </p>
                <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "capitalize" }}>
                  {format(new Date(b.scheduled_at), "MMM", { locale: es })}
                </p>
              </div>

              <div style={{ width: 1, height: 32, background: "var(--border)", flexShrink: 0 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{b.clients?.full_name}</p>
                  {b.type === "delivery" && <MapPin size={11} color="#3b82f6" />}
                </div>
                <p style={{ fontSize: 12, color: "var(--text-faint)" }}>
                  {b.services?.name} · {format(new Date(b.scheduled_at), "HH:mm")}
                </p>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {b.status === "completed" && (
                  <p style={{ fontWeight: 700, color: O, fontSize: 14 }}>{formatCurrency(price)}</p>
                )}
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: sc.bg, color: sc.text, fontWeight: 700 }}>
                  {BOOKING_STATUS_LABEL[b.status]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
