import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Mail, Calendar, Clock, Scissors, MapPin, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { applyTheme } from "../lib/applyTheme";

async function getShopBySlug(slug) {
  const { data, error } = await supabase
    .from("barbershops")
    .select("id, name, slug, theme_mode, theme_color, theme_font, logo_url")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`No se encontró barbería: ${slug}`);
  return data;
}

const STATUS_LABEL = {
  pending:   { text: "Pendiente",  color: "#F59E0B" },
  confirmed: { text: "Confirmada", color: "#22C55E" },
  completed: { text: "Completada", color: "#64748B" },
  cancelled: { text: "Cancelada",  color: "#EF4444" },
  no_show:   { text: "No asistió", color: "#EF4444" },
};

function formatDateTime(iso) {
  const d = new Date(iso);
  const dia  = d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Santiago" });
  const hora = d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
  return { dia, hora };
}

const STORAGE_KEY = (shopId) => `client_token_${shopId}`;

export default function ClientBookingsPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlToken = searchParams.get("token");
  const qc = useQueryClient();
  const cached = qc.getQueryData(["shop", slug]);

  const { data: shop } = useQuery({
    queryKey: ["shop", slug],
    queryFn:  () => getShopBySlug(slug),
    initialData: cached ?? undefined,
  });
  const activeShop = shop ?? cached;

  useEffect(() => {
    if (activeShop) {
      applyTheme(activeShop);
      document.title = `${activeShop.name} — Mis reservas`;
    }
  }, [activeShop?.id]);

  const [phase, setPhase]   = useState("locked"); // locked → list
  const [token, setToken]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [cancelingId, setCancelingId] = useState(null);

  // Token en la URL (link del email) tiene prioridad — acceso directo sin pedir login
  useEffect(() => {
    if (!activeShop?.id) return;
    if (urlToken) {
      localStorage.setItem(STORAGE_KEY(activeShop.id), urlToken);
      setToken(urlToken);
      setPhase("list");
      loadBookings(urlToken);
      searchParams.delete("token");
      setSearchParams(searchParams, { replace: true });
      return;
    }
    const saved = localStorage.getItem(STORAGE_KEY(activeShop.id));
    if (saved) {
      setToken(saved);
      setPhase("list");
      loadBookings(saved);
    }
  }, [activeShop?.id]);

  async function loadBookings(tok) {
    setLoading(true);
    try {
      const r = await fetch(`/api/client-bookings?token=${encodeURIComponent(tok)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo cargar tus reservas");
      setBookings(d.bookings || []);
    } catch (e) {
      toast.error(e.message);
      logout();
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking(bookingId) {
    if (!confirm("¿Seguro que querés cancelar esta reserva?")) return;
    setCancelingId(bookingId);
    try {
      const r = await fetch("/api/client-bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "cancel", bookingId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo cancelar");
      toast.success("Reserva cancelada");
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "cancelled" } : b));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCancelingId(null);
    }
  }

  function logout() {
    if (activeShop?.id) localStorage.removeItem(STORAGE_KEY(activeShop.id));
    setToken(null);
    setPhase("locked");
    setBookings([]);
  }

  if (!activeShop) {
    return <div style={{ minHeight: "100vh", background: "#0A0A0A" }} />;
  }

  const brand = "var(--brand)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #0A0A0A)", color: "var(--text, #fff)", padding: "24px 16px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          {activeShop.logo_url && <img src={activeShop.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />}
          <div>
            <p style={{ fontSize: 12, color: "var(--text-faint, #888)", textTransform: "uppercase", letterSpacing: 1.5 }}>Mis reservas</p>
            <h1 style={{ fontSize: 18, fontWeight: 800 }}>{activeShop.name}</h1>
          </div>
        </div>

        {phase === "locked" && (
          <div style={{ background: "var(--card-bg, #141414)", border: "1px solid var(--border, #222)", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <Mail size={28} color={brand} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Entrá desde tu correo</p>
            <p style={{ fontSize: 13, color: "var(--text-muted, #999)", lineHeight: 1.5 }}>
              Para ver o cancelar tu reserva, abrí el correo de confirmación que te enviamos y tocá el botón "Ver o cancelar mi reserva".
            </p>
          </div>
        )}

        {phase === "list" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "var(--text-muted, #999)" }}>Tus reservas en {activeShop.name}</p>
              <button onClick={logout} style={{ background: "none", border: "none", color: "var(--text-faint, #888)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <ArrowLeft size={13} /> Salir
              </button>
            </div>

            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                <Loader2 size={24} color="var(--text-faint, #888)" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : bookings.length === 0 ? (
              <div style={{ background: "var(--card-bg, #141414)", border: "1px solid var(--border, #222)", borderRadius: 16, padding: 28, textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "var(--text-muted, #999)" }}>Todavía no tenés reservas acá.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {bookings.map(b => {
                  const { dia, hora } = formatDateTime(b.scheduled_at);
                  const st = STATUS_LABEL[b.status] || { text: b.status, color: "#888" };
                  const canCancel = ["pending", "confirmed"].includes(b.status);
                  return (
                    <div key={b.id} style={{ background: "var(--card-bg, #141414)", border: "1px solid var(--border, #222)", borderRadius: 14, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Scissors size={15} color={brand} />
                          <p style={{ fontWeight: 700, fontSize: 14 }}>{b.services?.name || "Servicio"}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: `${st.color}1a`, padding: "3px 10px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.5 }}>{st.text}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-muted, #999)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Calendar size={13} /> {dia}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Clock size={13} /> {hora}</div>
                        {b.barbers?.full_name && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>👤 {b.barbers.full_name}</div>}
                        {b.address_line && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><MapPin size={13} /> {b.address_line}</div>}
                      </div>
                      {canCancel && (
                        <button onClick={() => cancelBooking(b.id)} disabled={cancelingId === b.id}
                          style={{ marginTop: 14, width: "100%", padding: 10, borderRadius: 10, border: "1px solid #EF444433", background: "#EF44441a", color: "#EF4444", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          {cancelingId === b.id ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <X size={14} />}
                          Cancelar reserva
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p style={{ marginTop: 20, fontSize: 12, color: "var(--text-faint, #777)", textAlign: "center", lineHeight: 1.6 }}>
              ¿Necesitás reagendar? Cancelá esta reserva y hacé una nueva desde{" "}
              <a href={`/${slug}/booking`} style={{ color: brand, fontWeight: 700, textDecoration: "none" }}>el botón de reservar</a>.
            </p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
