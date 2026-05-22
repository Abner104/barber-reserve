import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Calendar, User, LogOut, Menu, X, Scissors, ChevronRight, Images, Clock } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useRealtimeBarberBookings } from "../features/barber/hooks/useRealtimeBarberBookings";
import { BarberOnboardingTour, useBarberTour } from "../components/shared/OnboardingTour";

const NAV = [
  { to: "/barber",            icon: Calendar, label: "Mi agenda",    exact: true },
  { to: "/barber/historial",  icon: Clock,    label: "Historial"    },
  { to: "/barber/portfolio",  icon: Images,   label: "Mis trabajos" },
  { to: "/barber/perfil",     icon: User,     label: "Mi perfil"    },
];

export default function BarberLayout() {
  const { pathname }                        = useLocation();
  const navigate                            = useNavigate();
  const { signOut, profile, loading, user } = useAuthStore();
  const [drawerOpen, setDrawerOpen]         = useState(false);

  // Hooks siempre antes de cualquier return condicional
  useRealtimeBarberBookings();
  const { show: showTour, close: closeTour } = useBarberTour();

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #0A0A0A)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: "3px solid var(--border, #2A2A2A)", borderTopColor: "var(--brand, #FF6B2C)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role !== "barber" && profile?.role !== "owner" && profile?.role !== "super_admin") {
    return <Navigate to="/admin" replace />;
  }

  function isActive(nav) {
    return nav.exact ? pathname === nav.to : pathname.startsWith(nav.to);
  }

  async function handleSignOut() {
    try { await signOut(); } catch {}
    navigate("/login", { replace: true });
    setDrawerOpen(false);
  }

  const name   = profile?.full_name ?? "Barbero";
  const initl  = name[0].toUpperCase();
  const O      = "var(--brand, #FF6B2C)";
  const active = NAV.find(n => isActive(n));

  return (
    <>
      <style>{`
        @keyframes drawer-in { from { transform: translateX(-100%) } to { transform: translateX(0) } }
        .barber-drawer { animation: drawer-in 0.22s ease; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>

        {/* ── TOPBAR ── */}
        <div style={{ position: "sticky", top: 0, zIndex: 40, background: "var(--surface, #141414)", borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
          <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 54 }}>

            {/* Hamburguesa */}
            <button
              onClick={() => setDrawerOpen(true)}
              style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}
            >
              <Menu size={18} />
            </button>

            {/* Título página actual */}
            <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
              {active?.label ?? "Mi Panel"}
            </p>

            {/* Switch a Admin si es owner */}
            {(profile?.role === "owner" || profile?.role === "super_admin") ? (
              <Link to="/admin" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 10, background: "var(--brand-alpha)", border: "1px solid rgba(255,107,44,0.25)", textDecoration: "none", color: O, fontSize: 12, fontWeight: 700 }}>
                <Scissors size={13} />
                Admin
              </Link>
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--brand-alpha)", display: "flex", alignItems: "center", justifyContent: "center", color: O, fontWeight: 800, fontSize: 15 }}>
                {initl}
              </div>
            )}
          </div>
        </div>

        {/* ── CONTENIDO ── */}
        <div style={{ width: "100%", maxWidth: 960, margin: "0 auto", padding: "clamp(16px, 3vw, 32px)" }}>
          <Outlet />
        </div>
      </div>

      {/* ── DRAWER ── */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50 }}
          />

          {/* Panel */}
          <div className="barber-drawer" style={{
            position: "fixed", top: 0, left: 0, bottom: 0, width: 260, zIndex: 51,
            background: "var(--surface, #141414)", borderRight: "1px solid var(--border)",
            display: "flex", flexDirection: "column",
          }}>
            {/* Header drawer */}
            <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--brand-alpha)", display: "flex", alignItems: "center", justifyContent: "center", color: O, fontWeight: 900, fontSize: 18 }}>
                  {initl}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", lineHeight: 1 }}>{name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2, textTransform: "capitalize" }}>{profile?.role}</p>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
              {NAV.map(nav => {
                const act  = isActive(nav);
                const Icon = nav.icon;
                return (
                  <Link
                    key={nav.to}
                    to={nav.to}
                    onClick={() => setDrawerOpen(false)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "11px 14px", borderRadius: 10, textDecoration: "none",
                      background: act ? "var(--brand-alpha)" : "transparent",
                      color: act ? O : "var(--text-muted)",
                      fontWeight: act ? 700 : 400, fontSize: 14,
                    }}
                  >
                    <Icon size={18} />
                    <span style={{ flex: 1 }}>{nav.label}</span>
                    {act && <ChevronRight size={14} />}
                  </Link>
                );
              })}
            </nav>

            {/* Footer drawer */}
            <div style={{ padding: "12px 10px", borderTop: "1px solid var(--border)" }}>
              {(profile?.role === "owner" || profile?.role === "super_admin") && (
                <Link
                  to="/admin"
                  onClick={() => setDrawerOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, textDecoration: "none", background: "var(--brand-alpha)", border: "1px solid rgba(255,107,44,0.2)", color: O, fontSize: 13, fontWeight: 700, marginBottom: 8 }}
                >
                  <Scissors size={16} />
                  Panel Admin
                </Link>
              )}
              <button
                onClick={handleSignOut}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 13, width: "100%" }}
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tour onboarding barbero */}
      {showTour && <BarberOnboardingTour onClose={closeTour} />}
    </>
  );
}
