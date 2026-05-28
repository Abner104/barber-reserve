import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Package, ShoppingBag, LogOut, Menu, X, ChevronRight, LayoutDashboard, Settings } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { getSupplierByProfileId } from "../features/supplier/services/supplierService";
import { applyTheme, resetTheme } from "../lib/applyTheme";

const DEFAULT_COLOR = "#FF6B2C";

const NAV = [
  { to: "/supplier",          icon: LayoutDashboard, label: "Panel",    exact: true },
  { to: "/supplier/products", icon: Package,         label: "Productos" },
  { to: "/supplier/orders",   icon: ShoppingBag,     label: "Pedidos"   },
  { to: "/supplier/settings", icon: Settings,        label: "Config"    },
];

export default function SupplierLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, loading, user } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [supplier, setSupplier]     = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    getSupplierByProfileId(user.id).then(s => {
      if (!s) return;
      setSupplier(s);
      applyTheme({
        theme_mode:  s.theme_mode  || "dark",
        theme_color: s.theme_color || DEFAULT_COLOR,
        theme_font:  s.theme_font  || "Inter",
      });
    }).catch(() => {});
    return () => { resetTheme(); };
  }, [user?.id]);

  const brand = supplier?.theme_color || DEFAULT_COLOR;
  const logo  = supplier?.logo_url    || null;
  const name  = supplier?.name        || "Proveedor";

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #0A0A0A)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: "3px solid var(--border, #2A2A2A)", borderTopColor: brand, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (profile && profile.role !== "supplier" && profile.role !== "super_admin") {
    return <Navigate to="/" replace />;
  }

  function isActive(nav) {
    return nav.exact ? pathname === nav.to : pathname.startsWith(nav.to);
  }

  async function handleSignOut() {
    try { await signOut(); } catch {}
    navigate("/login", { replace: true });
  }

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--sidebar-border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {logo ? (
            <img src={logo} alt={name} style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 36, height: 36, background: "var(--brand)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>{name[0].toUpperCase()}</span>
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: 14, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</p>
            <p style={{ fontSize: 10, color: "var(--text-faint)" }}>Panel de gestión</p>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(nav => {
          const active = isActive(nav);
          const Icon   = nav.icon;
          return (
            <Link key={nav.to} to={nav.to} onClick={() => setDrawerOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10, textDecoration: "none",
                background: active ? "var(--brand-alpha)" : "transparent",
                color: active ? "var(--brand)" : "var(--text-faint)",
                fontWeight: active ? 600 : 400, fontSize: 14,
              }}
            >
              <Icon size={17} />
              <span style={{ flex: 1 }}>{nav.label}</span>
              {active && <ChevronRight size={13} />}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "12px 10px", borderTop: "1px solid var(--sidebar-border)", flexShrink: 0 }}>
        {profile && (
          <div style={{ padding: "8px 12px", marginBottom: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{profile.full_name || name}</p>
            <p style={{ fontSize: 11, color: "var(--text-faint)" }}>supplier</p>
          </div>
        )}
        <button onClick={handleSignOut} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10,
          background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 13, width: "100%",
        }}>
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Layout */
        .sup-layout  { display: flex; min-height: 100vh; background: var(--bg); color: var(--text); }
        .sup-sidebar { width: 220px; background: var(--sidebar-bg); border-right: 1px solid var(--sidebar-border); flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow: hidden; }
        .sup-topbar  { display: none; }
        .sup-main    { flex: 1; min-width: 0; }
        .sup-page    { padding: clamp(16px, 3vw, 40px); width: 100%; box-sizing: border-box; color: var(--text); }

        /* Inputs heredan el tema */
        .sup-page input, .sup-page textarea, .sup-page select {
          background: var(--input-bg) !important;
          color: var(--text) !important;
          border-color: var(--border) !important;
        }

        @media (max-width: 768px) {
          .sup-sidebar { display: none; }
          .sup-page    { padding: 20px 16px; }
          .sup-topbar  { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--sidebar-bg); border-bottom: 1px solid var(--sidebar-border); position: sticky; top: 0; z-index: 40; }
        }
      `}</style>

      <div className="sup-layout">
        <aside className="sup-sidebar"><SidebarContent /></aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="sup-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {logo ? (
                <img src={logo} alt={name} style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 28, height: 28, background: "var(--brand)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontWeight: 900, fontSize: 13, color: "#fff" }}>{name[0].toUpperCase()}</span>
                </div>
              )}
              <span style={{ fontWeight: 800, color: "var(--text)", fontSize: 14 }}>{name}</span>
            </div>
            <button onClick={() => setDrawerOpen(true)} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "var(--text)", display: "flex" }}>
              <Menu size={18} />
            </button>
          </div>

          <main className="sup-main"><Outlet /></main>
        </div>
      </div>

      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50 }} />
          <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 240, background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)", zIndex: 51, overflowY: "auto" }}>
            <button onClick={() => setDrawerOpen(false)} style={{ position: "absolute", top: 14, right: 14, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 4, cursor: "pointer", color: "var(--text)", display: "flex" }}>
              <X size={16} />
            </button>
            <div style={{ height: "100%" }}><SidebarContent /></div>
          </div>
        </>
      )}
    </>
  );
}
