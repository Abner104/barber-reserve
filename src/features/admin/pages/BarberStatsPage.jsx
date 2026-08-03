import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { resolveShopId } from "../services/adminService";
import { formatCurrency } from "../../../lib/utils";
import { TrendingUp, Calendar, DollarSign, Star, ChevronDown } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";

const O = "var(--brand, #FF6B2C)";

const PERIODS = [
  { label: "Este mes",  value: "this_month"  },
  { label: "Mes anterior", value: "last_month" },
  { label: "Últimos 30 días", value: "last_30" },
  { label: "Todo el tiempo",  value: "all"    },
];

function getPeriodDates(period) {
  const now = new Date();
  if (period === "this_month")  return { from: startOfMonth(now), to: endOfMonth(now) };
  if (period === "last_month")  return { from: startOfMonth(subMonths(now,1)), to: endOfMonth(subMonths(now,1)) };
  if (period === "last_30")     return { from: new Date(now - 30*24*60*60*1000), to: now };
  return { from: new Date("2020-01-01"), to: now };
}

async function fetchBarberStats(shopId, period) {
  const { from, to } = getPeriodDates(period);
  const fromISO = from.toISOString();
  const toISO   = to.toISOString();

  const [{ data: barbers }, { data: bookings }] = await Promise.all([
    supabase.from("barbers").select("id, full_name, avatar_url, commission_pct, specialty, is_active").eq("shop_id", shopId).order("full_name"),
    supabase.from("bookings")
      .select("barber_id, price, status, scheduled_at, duration_min, delivery_fee")
      .eq("shop_id", shopId)
      .in("status", ["confirmed", "in_progress", "completed", "pending"])
      .gte("scheduled_at", fromISO)
      .lte("scheduled_at", toISO),
  ]);

  return (barbers ?? []).map(b => {
    const bBookings = (bookings ?? []).filter(bk => bk.barber_id === b.id);
    const revenue   = bBookings.reduce((s, bk) => s + (bk.price ?? 0), 0);
    const commission = Math.round(revenue * ((b.commission_pct ?? 0) / 100));
    const avg       = bBookings.length > 0 ? Math.round(revenue / bBookings.length) : 0;
    return {
      ...b,
      bookings:   bBookings.length,
      revenue,
      commission,
      avg,
      ownerShare: revenue - commission,
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

export default function BarberStatsPage() {
  const [period, setPeriod] = useState("this_month");
  const shopId = resolveShopId();

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["barber-stats", shopId, period],
    queryFn:  () => fetchBarberStats(shopId, period),
  });

  const totalRevenue   = stats.reduce((s, b) => s + b.revenue, 0);
  const totalBookings  = stats.reduce((s, b) => s + b.bookings, 0);
  const totalCommission = stats.reduce((s, b) => s + b.commission, 0);
  const maxRevenue     = Math.max(...stats.map(b => b.revenue), 1);

  const periodLabel = PERIODS.find(p => p.value === period)?.label ?? "";

  return (
    <div className="admin-page" style={{ maxWidth: "min(900px, 100%)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>Rendimiento</h1>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Métricas por barbero · {periodLabel}</p>
        </div>
        <div style={{ position: "relative" }}>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            style={{ padding: "9px 36px 9px 14px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, outline: "none", cursor: "pointer", appearance: "none" }}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} />
        </div>
      </div>

      {/* Totales globales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Ingresos totales",   value: formatCurrency(totalRevenue),    icon: <DollarSign size={16} />, accent: true },
          { label: "Reservas",           value: totalBookings,                    icon: <Calendar size={16} />   },
          { label: "Comisiones totales", value: formatCurrency(totalCommission),  icon: <TrendingUp size={16} /> },
          { label: "Para el local",      value: formatCurrency(totalRevenue - totalCommission), icon: <Star size={16} />, accent: true },
        ].map(({ label, value, icon, accent }) => (
          <div key={label} style={{ background: accent ? "rgba(255,107,44,0.05)" : "var(--card-bg)", border: `1px solid ${accent ? "rgba(255,107,44,0.2)" : "var(--card-border)"}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: accent ? O : "var(--text-faint)", marginBottom: 6 }}>{icon}<span style={{ fontSize: 11 }}>{label}</span></div>
            <p style={{ fontSize: 20, fontWeight: 800, color: accent ? O : "var(--text)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Cards por barbero */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 110, borderRadius: 14, background: "var(--surface)" }} />)}
        </div>
      )}

      {!isLoading && stats.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16 }}>
          <p style={{ fontSize: 32, marginBottom: 10 }}>📊</p>
          <p style={{ color: "var(--text)", fontWeight: 700, marginBottom: 6 }}>Sin datos en este período</p>
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No hay reservas completadas en el rango seleccionado.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {stats.map((b, idx) => (
          <div key={b.id} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              {/* Rank */}
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: idx === 0 ? "rgba(255,107,44,0.15)" : "var(--surface2)", border: `1px solid ${idx === 0 ? O : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: idx === 0 ? O : "var(--text-faint)" }}>#{idx + 1}</span>
              </div>

              {/* Avatar */}
              {b.avatar_url ? (
                <img src={b.avatar_url} alt={b.full_name} style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,107,44,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: O }}>{b.full_name[0]}</span>
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>{b.full_name}</p>
                <p style={{ fontSize: 12, color: "var(--text-faint)" }}>{b.specialty || "Barbero"} · {b.commission_pct ?? 0}% comisión</p>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontWeight: 900, fontSize: 18, color: O }}>{formatCurrency(b.revenue)}</p>
                <p style={{ fontSize: 11, color: "var(--text-faint)" }}>{b.bookings} reservas</p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(b.revenue / maxRevenue) * 100}%`, background: O, borderRadius: 3, transition: "width 0.6s ease" }} />
            </div>

            {/* Métricas secundarias */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {[
                { label: "Ticket prom.", value: formatCurrency(b.avg) },
                { label: "Comisión",     value: formatCurrency(b.commission) },
                { label: "Para el local", value: formatCurrency(b.ownerShare) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "var(--surface2)", borderRadius: 9, padding: "8px 10px" }}>
                  <p style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
