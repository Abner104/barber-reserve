import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Phone, ShieldCheck, Calendar, Clock, Scissors, MapPin, X, Loader2 } from "lucide-react";
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

  const [phase, setPhase]   = useState("phone"); // phone → code → list
  const [phone, setPhone]   = useState("");
  const [code, setCode]     = useState("");
  const [token, setToken]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [cancelingId, setCancelingId] = useState(null);

  // Restaurar sesión guardada
  useEffect(() => {
    if (!activeShop?.id) return;
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

  async function sendCode() {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 8) { toast.error("Ingresá un número de teléfono válido"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/client-login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean, shopId: activeShop.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo enviar el código");
      toast.success("Te enviamos un código por SMS");
      setPhase("code");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode() {
    if (code.length !== 6) { toast.error("El código debe tener 6 dígitos"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/client-login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", phone: phone.replace(/\D/g, ""), shopId: activeShop.id, code }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Código incorrecto");
      localStorage.setItem(STORAGE_KEY(activeShop.id), d.token);
      setToken(d.token);
      setPhase("list");
      await loadBookings(d.token);
    } catch (e) {
      toast.error(e.message);
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
    setPhase("phone");
    setPhone("");
    setCode("");
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

        {phase === "phone" && (
          <div style={{ background: "var(--card-bg, #141414)", border: "1px solid var(--border, #222)", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Phone size={18} color={brand} />
              <p style={{ fontSize: 15, fontWeight: 700 }}>Ingresá tu número de teléfono</p>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted, #999)", marginBottom: 16, lineHeight: 1.5 }}>
              Te vamos a mandar un código de verificación para ver y gestionar tus reservas.
            </p>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+56 9 1234 5678"
              style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid var(--border, #222)", background: "var(--surface2, #0E0E0E)", color: "#fff", fontSize: 15, marginBottom: 16, outline: "none" }}
            />
            <button onClick={sendCode} disabled={loading}
              style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: brand, color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "Enviar código"}
            </button>
          </div>
        )}

        {phase === "code" && (
          <div style={{ background: "var(--card-bg, #141414)", border: "1px solid var(--border, #222)", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <ShieldCheck size={18} color={brand} />
              <p style={{ fontSize: 15, fontWeight: 700 }}>Ingresá el código que te llegó por SMS</p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid var(--border, #222)", background: "var(--surface2, #0E0E0E)", color: "#fff", fontSize: 22, letterSpacing: 8, textAlign: "center", marginBottom: 16, outline: "none" }}
            />
            <button onClick={confirmCode} disabled={loading}
              style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: brand, color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "Verificar"}
            </button>
            <button onClick={() => setPhase("phone")} style={{ width: "100%", padding: 10, background: "none", border: "none", color: "var(--text-muted, #999)", fontSize: 13, cursor: "pointer" }}>
              ← Cambiar número
            </button>
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
