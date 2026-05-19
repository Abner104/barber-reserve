import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import {
  Scissors, Calendar, Users, LayoutDashboard,
  Settings, LogOut, Menu, X, ChevronRight, Zap, DollarSign,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useRealtimeBookings } from "../features/admin/hooks/useRealtimeBookings";
import BarberLoader from "../components/shared/BarberLoader";
import { useShopTheme } from "../hooks/useShopTheme";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

const VPS = import.meta.env.VITE_VPS_URL || "http://31.97.218.107:3001";

const NAV = [
  { to: "/admin",          icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/admin/bookings", icon: Calendar,      label: "Reservas"  },
  { to: "/admin/caja",     icon: DollarSign,    label: "Caja"      },
  { to: "/admin/barbers",  icon: Users,         label: "Barberos"  },
  { to: "/admin/services", icon: Scissors,         label: "Servicios" },
  { to: "/admin/settings", icon: Settings,         label: "Config"    },
];

export default function AdminLayout() {
  const { pathname }                = useLocation();
  const navigate                    = useNavigate();
  const { signOut, profile, loading, user } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isSuperAdmin = profile?.role === "super_admin";

  useRealtimeBookings();

  // Detectar si el owner también es barbero
  const { data: isAlsoBarber } = useQuery({
    queryKey: ["owner-is-barber", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("barbers").select("id").eq("profile_id", user.id).maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Verificar estado del plan (solo para owners, no super_admin)
  const shopId = profile?.shop_id;
  const { data: subStatus } = useQuery({
    queryKey: ["sub-status", shopId],
    queryFn:  () => fetch(`${VPS}/subscription-status/${shopId}`).then(r => r.json()),
    enabled:  !!shopId && profile?.role === "owner",
    refetchInterval: 5 * 60 * 1000, // cada 5 min
    retry: false,
  });

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: "3px solid #2A2A2A", borderTopColor: "#FF6B2C", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  // Plan vencido → pantalla de suscripción (solo owners, no super_admin)
  if (profile?.role === "owner" && subStatus && !subStatus.is_active && pathname !== "/admin/subscription") {
    return <Navigate to="/subscription" replace />;
  }

  function isActive(nav) {
    return nav.exact ? pathname === nav.to : pathname.startsWith(nav.to);
  }

  async function handleSignOut() {
    try { await signOut(); } catch {}
    navigate("/login", { replace: true });
  }

  function closeDrawer() { setDrawerOpen(false); }

  const brand = "var(--brand, #FF6B2C)";

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--sidebar-border, #1E1E1E)", flexShrink: 0 }}>
        <Link to="/" onClick={closeDrawer} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, background: brand, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Scissors size={15} color="#fff" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, color: "var(--text, #fff)", lineHeight: 1 }}>NobleCut</p>
            <p style={{ fontSize: 10, color: "var(--text-faint, #555)", marginTop: 2 }}>Panel Admin</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {NAV.map(nav => {
          const active = isActive(nav);
          const Icon   = nav.icon;
          return (
            <Link
              key={nav.to}
              to={nav.to}
              onClick={closeDrawer}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10, textDecoration: "none",
                background: active ? "var(--brand-alpha, rgba(255,107,44,0.12))" : "transparent",
                color: active ? brand : "var(--text-faint, #666)",
                fontWeight: active ? 600 : 400,
                fontSize: 14,
              }}
            >
              <Icon size={17} />
              <span style={{ flex: 1 }}>{nav.label}</span>
              {active && <ChevronRight size={13} />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid var(--sidebar-border, #1E1E1E)", flexShrink: 0 }}>

        {/* Switch a Mi Agenda si el owner también es barbero */}
        {isAlsoBarber && (
          <Link to="/barber" onClick={closeDrawer} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10,
            textDecoration: "none", background: "var(--brand-alpha, rgba(255,107,44,0.08))",
            border: "1px solid var(--brand-alpha, rgba(255,107,44,0.2))", marginBottom: 8,
          }}>
            <Calendar size={14} color={brand} />
            <span style={{ fontSize: 13, fontWeight: 600, color: brand }}>Mi agenda</span>
          </Link>
        )}

        {isSuperAdmin && (
          <Link to="/superadmin" onClick={closeDrawer} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10,
            textDecoration: "none", background: "var(--brand-alpha2, rgba(255,107,44,0.06))",
            border: "1px solid var(--brand-alpha, rgba(255,107,44,0.15))", marginBottom: 8,
          }}>
            <Zap size={14} color={brand} />
            <span style={{ fontSize: 13, fontWeight: 600, color: brand }}>Super Admin</span>
          </Link>
        )}

        {profile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--brand-alpha, rgba(255,107,44,0.15))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: brand }}>{(profile.full_name || "A")[0].toUpperCase()}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text, #fff)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {profile.full_name || "Admin"}
              </p>
              <p style={{ fontSize: 11, color: "var(--text-faint, #555)", textTransform: "capitalize" }}>{profile.role}</p>
            </div>
          </div>
        )}

        <button onClick={handleSignOut} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10,
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-faint, #555)", fontSize: 13, width: "100%",
        }}>
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        .admin-layout   { display: flex; min-height: 100vh; background: var(--bg, #0A0A0A); }
        .admin-sidebar  { width: 220px; background: var(--sidebar-bg, #0F0F0F); border-right: 1px solid var(--sidebar-border, #1E1E1E); flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow: hidden; }
        .admin-topbar   { display: none; }
        .admin-main     { flex: 1; min-width: 0; overflow-x: hidden; background: var(--bg, #0A0A0A); }
        .admin-page     { padding: clamp(16px, 3vw, 40px); width: 100%; box-sizing: border-box; }
        .admin-drawer-overlay { display: none; }
        .admin-drawer   { display: none; }

        @media (max-width: 768px) {
          .admin-sidebar  { display: none; }
          .admin-page     { padding: 20px 16px; }
          .admin-topbar   {
            display: flex; align-items: center; justify-content: space-between;
            padding: 12px 16px; background: var(--sidebar-bg, #0F0F0F);
            border-bottom: 1px solid var(--sidebar-border, #1E1E1E);
            position: sticky; top: 0; z-index: 40;
          }
          .admin-drawer-overlay {
            display: block; position: fixed; inset: 0;
            background: rgba(0,0,0,0.75); z-index: 50;
          }
          .admin-drawer {
            display: block; position: fixed; top: 0; left: 0; bottom: 0;
            width: 240px; background: var(--sidebar-bg, #0F0F0F);
            border-right: 1px solid var(--sidebar-border, #1E1E1E);
            z-index: 51; overflow-y: auto;
          }
        }

        .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 700px) { .settings-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <div className="admin-layout">
        {/* Sidebar desktop */}
        <aside className="admin-sidebar"><SidebarContent /></aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Topbar móvil */}
          <div className="admin-topbar">
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <div style={{ width: 28, height: 28, background: brand, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Scissors size={13} color="#fff" />
              </div>
              <span style={{ fontWeight: 800, color: "var(--text, #fff)", fontSize: 14 }}>NobleCut</span>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text-faint, #555)", textTransform: "capitalize" }}>
                {NAV.find(n => isActive(n))?.label ?? "Admin"}
              </span>
              <button onClick={() => setDrawerOpen(true)} style={{ background: "var(--surface2, #1E1E1E)", border: "1px solid var(--border, #2A2A2A)", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "var(--text, #fff)", display: "flex" }}>
                <Menu size={18} />
              </button>
            </div>
          </div>

          {/* Banner trial por vencer */}
          {subStatus?.trial_active && subStatus.days_left <= 7 && (
            <div style={{ background: "rgba(251,191,36,0.08)", borderBottom: "1px solid rgba(251,191,36,0.2)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <p style={{ fontSize: 13, color: "#fbbf24", fontWeight: 600 }}>
                ⏰ Tu trial vence en {subStatus.days_left} día{subStatus.days_left !== 1 ? "s" : ""}
              </p>
              <a href="/subscription" style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "#f59e0b", padding: "5px 14px", borderRadius: 8, textDecoration: "none" }}>
                Activar plan Pro
              </a>
            </div>
          )}

          {/* Contenido */}
          <main className="admin-main">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Drawer móvil */}
      {drawerOpen && (
        <>
          <div className="admin-drawer-overlay" onClick={closeDrawer} />
          <div className="admin-drawer">
            <button onClick={closeDrawer} style={{ position: "absolute", top: 14, right: 14, background: "var(--surface2, #1E1E1E)", border: "1px solid var(--border, #2A2A2A)", borderRadius: 8, padding: 4, cursor: "pointer", color: "var(--text, #fff)", display: "flex", zIndex: 1 }}>
              <X size={16} />
            </button>
            <div style={{ height: "100%" }}><SidebarContent /></div>
          </div>
        </>
      )}
    </>
  );
}
