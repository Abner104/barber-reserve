import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import {
  Scissors, Calendar, Users, LayoutDashboard,
  Settings, LogOut, Menu, X, ChevronRight, Zap, DollarSign, Package, TrendingUp, UserCheck,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useRealtimeBookings } from "../features/admin/hooks/useRealtimeBookings";
import BarberLoader from "../components/shared/BarberLoader";
import { useShopTheme } from "../hooks/useShopTheme";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import OnboardingTour, { useTour } from "../components/shared/OnboardingTour";
import { IMPERSONATE_SHOP_KEY } from "../features/admin/services/adminService";
import { getAllShops } from "../features/superadmin/services/superAdminService";

const VPS = import.meta.env.VITE_VPS_URL || "http://31.97.218.107:3001";

const NAV = [
  { to: "/admin",          icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/admin/bookings", icon: Calendar,      label: "Reservas"  },
  { to: "/admin/caja",     icon: DollarSign,    label: "Caja"      },
  { to: "/admin/barbers",  icon: Users,       label: "Barberos"    },
  { to: "/admin/stats",    icon: TrendingUp,  label: "Rendimiento" },
  { to: "/admin/clients",  icon: UserCheck,   label: "Clientes"    },
  { to: "/admin/services", icon: Scissors,    label: "Servicios"   },
  { to: "/admin/inventory",icon: Package,     label: "Inventario"  },
  { to: "/admin/settings", icon: Settings,    label: "Config"      },
];

export default function AdminLayout() {
  const { pathname }                = useLocation();
  const navigate                    = useNavigate();
  const qc                          = useQueryClient();
  const { signOut, profile, loading, user, shopName, shopLogo } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isSuperAdmin = profile?.role === "super_admin";
  const { show: showTour, close: closeTour } = useTour();

  const [impersonatedShopId, setImpersonatedShopId] = useState(() => sessionStorage.getItem(IMPERSONATE_SHOP_KEY) || "");
  const needsShopPicker = isSuperAdmin && !profile?.shop_id && !impersonatedShopId;

  const { data: allShops } = useQuery({
    queryKey: ["admin-shop-picker"],
    queryFn:  getAllShops,
    enabled:  needsShopPicker,
  });

  const { data: impersonatedShop } = useQuery({
    queryKey: ["admin-impersonated-shop", impersonatedShopId],
    queryFn:  async () => {
      const { data } = await supabase.from("barbershops").select("name, logo_url, theme_mode, theme_color, theme_font").eq("id", impersonatedShopId).maybeSingle();
      return data;
    },
    enabled: isSuperAdmin && !profile?.shop_id && !!impersonatedShopId,
  });

  function chooseShop(id) {
    sessionStorage.setItem(IMPERSONATE_SHOP_KEY, id);
    setImpersonatedShopId(id);
    qc.invalidateQueries();
  }

  function clearShop() {
    sessionStorage.removeItem(IMPERSONATE_SHOP_KEY);
    setImpersonatedShopId("");
    qc.invalidateQueries();
  }

  const effectiveShopName = shopName ?? impersonatedShop?.name;
  const effectiveShopLogo = shopLogo ?? impersonatedShop?.logo_url;

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

  // Verificar estado del plan directo desde Supabase (sin depender del VPS)
  const shopId = profile?.shop_id ?? (isSuperAdmin ? impersonatedShopId : undefined);
  const { data: subStatus } = useQuery({
    queryKey: ["sub-status", shopId],
    queryFn: async () => {
      const { data: shop } = await supabase
        .from("barbershops")
        .select("id, name, created_at, plan, is_active, trial_ends_at")
        .eq("id", shopId)
        .maybeSingle();
      if (!shop) return null;

      const { data: payments } = await supabase
        .from("shop_payments")
        .select("id, paid_at")
        .eq("shop_id", shopId)
        .order("paid_at");

      // Calcular vencimiento: created_at + 30 días gratis + 30 días por pago
      const base    = new Date(shop.created_at);
      const months  = 1 + (payments?.length ?? 0);
      const dueDate = new Date(base);
      dueDate.setMonth(dueDate.getMonth() + months);

      const now      = new Date();
      const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      const is_active = diffDays > 0;

      return {
        is_active,
        days_left:    Math.max(0, diffDays),
        trial_active: is_active && diffDays <= 7,
        due_date:     dueDate.toISOString(),
        plan:         shop.plan,
        shop_name:    shop.name,
      };
    },
    enabled: !!shopId && profile?.role === "owner",
    refetchInterval: 10 * 60 * 1000,
    retry: false,
  });

  const [payLoading, setPayLoading] = useState(false);
  async function handlePagar() {
    if (!shopId) return;
    setPayLoading(true);
    try {
      const r = await fetch(`${VPS}/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id:     shopId,
          shop_name:   subStatus?.shop_name ?? "Barbería",
          owner_email: user?.email ?? "",
        }),
      });
      const d = await r.json();
      if (d.init_point) {
        window.location.href = d.init_point;
      } else {
        alert("No se pudo crear el pago. Intentá de nuevo.");
      }
    } catch {
      alert("Error al conectar con el servidor de pagos.");
    } finally {
      setPayLoading(false);
    }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: "3px solid #2A2A2A", borderTopColor: "#FF6B2C", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  // Super admin sin barbería propia: debe elegir cuál operar antes de ver el panel
  if (needsShopPicker) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <p style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Elige una barbería</p>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>Estás en modo super admin. Selecciona qué barbería quieres administrar.</p>
          {allShops === undefined && <p style={{ color: "#555", fontSize: 13 }}>Cargando barberías...</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "60vh", overflowY: "auto" }}>
            {allShops?.map(s => (
              <button key={s.id} onClick={() => chooseShop(s.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: "#141414", border: "1px solid #222", color: "#fff", cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 600 }}>
                {s.logo_url
                  ? <img src={s.logo_url} alt={s.name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }} />
                  : <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FF6B2C", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flexShrink: 0 }}>{s.name[0].toUpperCase()}</div>}
                <span style={{ flex: 1 }}>{s.name}</span>
                <span style={{ fontSize: 11, color: "#555", fontWeight: 400 }}>{s.plan}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Plan vencido → solo muestra banner, no redirige (para que puedan ver sus datos)

  function isActive(nav) {
    return nav.exact ? pathname === nav.to : pathname.startsWith(nav.to);
  }

  async function handleSignOut() {
    try { await signOut(); } catch {}
    navigate("/", { replace: true });
  }

  function closeDrawer() { setDrawerOpen(false); }

  const brand = "var(--brand, #FF6B2C)";

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--sidebar-border, #1E1E1E)", flexShrink: 0 }}>
        <Link to="/admin" onClick={closeDrawer} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          {effectiveShopLogo ? (
            <img
              src={effectiveShopLogo}
              alt={effectiveShopName ?? "Logo"}
              style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border, #2A2A2A)" }}
            />
          ) : (
            <div style={{ width: 36, height: 36, background: brand, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Scissors size={16} color="#fff" />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: 14, color: "var(--text, #fff)", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{effectiveShopName ?? "Mi Barbería"}</p>
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

        {isSuperAdmin && !profile?.shop_id && impersonatedShopId && (
          <button onClick={() => { clearShop(); closeDrawer(); }} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, marginBottom: 8,
            background: "none", border: "none", cursor: "pointer", color: "var(--text-faint, #555)", fontSize: 13, width: "100%",
          }}>
            Cambiar barbería
          </button>
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
            <Link to="/admin" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              {effectiveShopLogo ? (
                <img src={effectiveShopLogo} alt={effectiveShopName ?? "Logo"} style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 28, height: 28, background: brand, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Scissors size={13} color="#fff" />
                </div>
              )}
              <span style={{ fontWeight: 800, color: "var(--text, #fff)", fontSize: 14 }}>{effectiveShopName ?? "Mi Barbería"}</span>
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

          {/* Banner trial vencido */}
          {subStatus && !subStatus.is_active && (
            <div style={{ background: "rgba(239,68,68,0.1)", borderBottom: "1px solid rgba(239,68,68,0.3)", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <p style={{ fontSize: 13, color: "#ef4444", fontWeight: 700 }}>
                🔴 Tu período de prueba venció. Renová tu plan para seguir usando Clippr.
              </p>
              <button onClick={handlePagar} disabled={payLoading}
                style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "#ef4444", padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", whiteSpace: "nowrap", opacity: payLoading ? 0.7 : 1 }}>
                {payLoading ? "Cargando..." : "Pagar con MercadoPago"}
              </button>
            </div>
          )}

          {/* Banner trial por vencer (7 días o menos) */}
          {subStatus?.is_active && subStatus.days_left <= 7 && (
            <div style={{ background: "rgba(251,191,36,0.08)", borderBottom: "1px solid rgba(251,191,36,0.2)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <p style={{ fontSize: 13, color: "#fbbf24", fontWeight: 600 }}>
                ⏰ Tu plan vence en {subStatus.days_left} día{subStatus.days_left !== 1 ? "s" : ""}. Renovalo ahora para no perder el acceso.
              </p>
              <button onClick={handlePagar} disabled={payLoading}
                style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "#f59e0b", padding: "5px 14px", borderRadius: 8, border: "none", cursor: "pointer", whiteSpace: "nowrap", opacity: payLoading ? 0.7 : 1 }}>
                {payLoading ? "Cargando..." : "Renovar con MercadoPago"}
              </button>
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

      {/* Tour onboarding — solo para owners nuevos */}
      {showTour && profile?.role === "owner" && (
        <OnboardingTour onClose={closeTour} />
      )}
    </>
  );
}
