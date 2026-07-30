import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS   = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

// Calcula la próxima fecha de vencimiento de una barbería
// Lógica: created_at + 30 días (trial) + 30 días por cada pago registrado
function calcDueDate(shop, payments) {
  const base    = new Date(shop.created_at);
  const months  = 1 + (payments?.length ?? 0); // 1 mes gratis + 1 mes por pago
  const due     = new Date(base);
  due.setMonth(due.getMonth() + months);
  return due;
}

function statusOf(dueDate, today) {
  const diff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return "overdue";   // vencida
  if (diff <= 7) return "warning";   // vence en 7 días
  return "ok";
}

const STATUS_STYLE = {
  overdue: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", icon: AlertCircle,    label: "Vencida"         },
  warning: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", icon: Clock,        label: "Vence pronto"    },
  ok:      { color: "#22c55e", bg: "rgba(34,197,94,0.06)",  border: "rgba(34,197,94,0.15)",  icon: CheckCircle,  label: "Al día"          },
};

export default function PaymentsCalendarPage() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Traer todas las barberías activas + sus pagos
  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["sa-due-dates"],
    queryFn: async () => {
      const { data: allShops } = await supabase
        .from("barbershops")
        .select("id, name, slug, created_at, plan, is_active, trial_ends_at")
        .eq("is_active", true)
        .order("created_at");

      if (!allShops?.length) return [];

      // Traer conteo de pagos por barbería
      const { data: allPayments } = await supabase
        .from("shop_payments")
        .select("shop_id, paid_at")
        .order("paid_at");

      const paysByShop = (allPayments ?? []).reduce((acc, p) => {
        if (!acc[p.shop_id]) acc[p.shop_id] = [];
        acc[p.shop_id].push(p);
        return acc;
      }, {});

      return allShops.map(s => {
        const pays   = paysByShop[s.id] ?? [];
        const due    = calcDueDate(s, pays);
        const status = statusOf(due, today);
        return { ...s, payments: pays, dueDate: due, status };
      });
    },
    staleTime: 60_000,
  });

  // Filtrar barberías que vencen en el mes seleccionado
  const shopsThisMonth = shops.filter(s => {
    return s.dueDate.getFullYear() === year && s.dueDate.getMonth() === month;
  });

  // Agrupar por día de vencimiento para el calendario
  const byDay = shopsThisMonth.reduce((acc, s) => {
    const d = s.dueDate.getDate();
    if (!acc[d]) acc[d] = [];
    acc[d].push(s);
    return acc;
  }, {});

  // Resumen global
  const overdue = shops.filter(s => s.status === "overdue");
  const warning = shops.filter(s => s.status === "warning");
  const ok      = shops.filter(s => s.status === "ok");

  // Grilla del calendario
  const firstDay  = new Date(year, month, 1);
  const daysCount = new Date(year, month + 1, 0).getDate();
  const startDow  = firstDay.getDay();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysCount; d++) cells.push(d);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  return (
    <div className="sa-page" style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>Vencimientos</h1>
        <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
          Calculado automáticamente según fecha de ingreso + pagos registrados
        </p>
      </div>

      {/* Resumen global */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 28 }}>
        {[
          { list: overdue, label: "Vencidas",      color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)"  },
          { list: warning, label: "Vencen pronto", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
          { list: ok,      label: "Al día",         color: "#22c55e", bg: "rgba(34,197,94,0.06)",  border: "rgba(34,197,94,0.15)" },
        ].map(({ list, label, color, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 26, fontWeight: 800, color }}>{list.length}</p>
            <p style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Navegación del mes */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "#555" }}>
          {shopsThisMonth.length} barbería{shopsThisMonth.length !== 1 ? "s" : ""} vencen en {MONTHS[month]}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, background: "#141414", border: "1px solid #2A2A2A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 700, color: "#fff", fontSize: 15, minWidth: 140, textAlign: "center" }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, background: "#141414", border: "1px solid #2A2A2A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Grilla días */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#555", fontWeight: 700, padding: "6px 0" }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 32 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dayShops = byDay[day] ?? [];
          const isToday  = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const hasDue   = dayShops.length > 0;
          const worstStatus = dayShops.some(s => s.status === "overdue") ? "overdue"
                           : dayShops.some(s => s.status === "warning") ? "warning"
                           : hasDue ? "ok" : null;
          const st = worstStatus ? STATUS_STYLE[worstStatus] : null;

          return (
            <div key={day} style={{
              minHeight: 72, borderRadius: 8, padding: 6,
              background: st ? st.bg : "#141414",
              border: `1px solid ${isToday ? "#FF6B2C" : st ? st.border : "#1E1E1E"}`,
            }}>
              <p style={{ fontSize: 11, fontWeight: isToday ? 800 : 500, color: isToday ? "#FF6B2C" : "#555", marginBottom: 3 }}>{day}</p>
              {dayShops.map(s => (
                <p key={s.id} title={s.name} style={{ fontSize: 10, color: STATUS_STYLE[s.status].color, fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.name}
                </p>
              ))}
            </div>
          );
        })}
      </div>

      {/* Lista completa ordenada por vencimiento */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Todas las barberías</h2>
      {isLoading ? (
        <p style={{ color: "#555", fontSize: 13 }}>Cargando...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[...shops].sort((a, b) => a.dueDate - b.dueDate).map(s => {
            const st   = STATUS_STYLE[s.status];
            const Icon = st.icon;
            const diff = Math.ceil((s.dueDate - today) / (1000 * 60 * 60 * 24));
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: st.bg, border: `1px solid ${st.border}`, borderRadius: 12, gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Icon size={16} color={st.color} style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: "#fff", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                    <p style={{ fontSize: 11, color: "#555", marginTop: 1 }}>
                      {s.payments.length} pago{s.payments.length !== 1 ? "s" : ""} registrado{s.payments.length !== 1 ? "s" : ""}
                      {" · "} Ingresó {new Date(s.created_at).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: st.color }}>
                    {diff < 0 ? `Vencida hace ${Math.abs(diff)} días` : diff === 0 ? "Vence hoy" : `Vence en ${diff} días`}
                  </p>
                  <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                    {s.dueDate.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
