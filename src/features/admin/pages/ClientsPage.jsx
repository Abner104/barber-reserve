import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { SHOP_ID } from "../../../lib/constants";
import { formatCurrency } from "../../../lib/utils";
import { Search, Phone, Calendar, Scissors, ChevronDown, ChevronUp, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const O = "var(--brand, #FF6B2C)";

async function fetchClients(shopId) {
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, phone, created_at")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  const { data: bookings } = await supabase
    .from("bookings")
    .select("client_id, price, status, scheduled_at, duration_min, services(name), barbers(full_name)")
    .eq("shop_id", shopId)
    .in("status", ["confirmed", "completed", "pending", "in_progress"])
    .order("scheduled_at", { ascending: false });

  return (clients ?? []).map(c => {
    const cb      = (bookings ?? []).filter(b => b.client_id === c.id);
    const total   = cb.reduce((s, b) => s + (b.price ?? 0), 0);
    const last    = cb[0]?.scheduled_at ?? null;
    return { ...c, bookings: cb, totalSpent: total, lastVisit: last, visitCount: cb.length };
  });
}

export default function ClientsPage() {
  const [search, setSearch]     = useState("");
  const [expanded, setExpanded] = useState(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["admin-clients", SHOP_ID],
    queryFn:  () => fetchClients(SHOP_ID),
  });

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? "").includes(search)
  );

  const totalClients  = clients.length;
  const totalRevenue  = clients.reduce((s, c) => s + c.totalSpent, 0);
  const avgSpend      = totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;
  const returning     = clients.filter(c => c.visitCount > 1).length;

  return (
    <div className="admin-page" style={{ maxWidth: "min(900px, 100%)" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>Clientes</h1>
        <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>{totalClients} clientes registrados</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total clientes",   value: totalClients,             accent: false },
          { label: "Ingresos totales", value: formatCurrency(totalRevenue), accent: true },
          { label: "Ticket promedio",  value: formatCurrency(avgSpend), accent: false },
          { label: "Recurrentes",      value: returning,                accent: false },
        ].map(({ label, value, accent }) => (
          <div key={label} style={{ background: accent ? "rgba(255,107,44,0.05)" : "var(--card-bg)", border: `1px solid ${accent ? "rgba(255,107,44,0.2)" : "var(--card-border)"}`, borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: accent ? O : "var(--text)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          style={{ width: "100%", paddingLeft: 36, padding: "10px 12px 10px 36px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", display: "flex" }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Lista */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 72, borderRadius: 12, background: "var(--surface)" }} />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16 }}>
          <p style={{ fontSize: 32, marginBottom: 10 }}>👥</p>
          <p style={{ color: "var(--text)", fontWeight: 700, marginBottom: 6 }}>
            {search ? "Sin resultados" : "Sin clientes aún"}
          </p>
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>
            {search ? `No hay clientes que coincidan con "${search}".` : "Los clientes aparecen automáticamente cuando reservan."}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(c => {
          const isOpen = expanded === c.id;
          return (
            <div key={c.id} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden" }}>
              {/* Fila principal */}
              <button
                onClick={() => setExpanded(isOpen ? null : c.id)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                {/* Avatar inicial */}
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,107,44,0.1)", border: "1px solid rgba(255,107,44,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: O }}>{c.full_name[0]?.toUpperCase()}</span>
                </div>

                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{c.full_name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                    {c.phone && (
                      <span style={{ fontSize: 12, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 3 }}>
                        <Phone size={10} /> {c.phone}
                      </span>
                    )}
                    {c.lastVisit && (
                      <span style={{ fontSize: 12, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 3 }}>
                        <Calendar size={10} /> {format(new Date(c.lastVisit), "d MMM yyyy", { locale: es })}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: 15, color: O }}>{formatCurrency(c.totalSpent)}</p>
                  <p style={{ fontSize: 11, color: "var(--text-faint)" }}>{c.visitCount} visita{c.visitCount !== 1 ? "s" : ""}</p>
                </div>

                <div style={{ color: "var(--text-faint)", flexShrink: 0 }}>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Historial expandido */}
              {isOpen && (
                <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg)", padding: "12px 18px" }}>
                  {c.bookings.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--text-faint)", textAlign: "center", padding: "12px 0" }}>Sin reservas registradas.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {c.bookings.map((b, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", background: "var(--surface)", borderRadius: 10 }}>
                          <div style={{ flexShrink: 0, width: 44 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>
                              {format(new Date(b.scheduled_at), "d MMM", { locale: es })}
                            </p>
                            <p style={{ fontSize: 10, color: "var(--text-faint)" }}>
                              {format(new Date(b.scheduled_at), "HH:mm")}
                            </p>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {b.services?.name ?? "Servicio"}
                            </p>
                            {b.barbers?.full_name && (
                              <p style={{ fontSize: 11, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 3 }}>
                                <Scissors size={9} /> {b.barbers.full_name}
                              </p>
                            )}
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right" }}>
                            <p style={{ fontWeight: 700, fontSize: 13, color: O }}>{formatCurrency(b.price ?? 0)}</p>
                            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 10, background: b.status === "completed" ? "rgba(34,197,94,0.1)" : "rgba(255,107,44,0.1)", color: b.status === "completed" ? "#4ade80" : O }}>
                              {b.status === "completed" ? "Completada" : b.status === "confirmed" ? "Confirmada" : "Pendiente"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
