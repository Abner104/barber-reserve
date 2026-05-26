import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Package, ShoppingBag, LogOut, Menu, X, ChevronRight, LayoutDashboard } from "lucide-react";
import { useAuthStore } from "../store/authStore";

const O = "#FF6B2C";

const NAV = [
  { to: "/supplier",          icon: LayoutDashboard, label: "Panel",    exact: true },
  { to: "/supplier/products", icon: Package,         label: "Productos" },
  { to: "/supplier/orders",   icon: ShoppingBag,     label: "Pedidos"   },
];

export default function SupplierLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, loading, user } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: "3px solid #2A2A2A", borderTopColor: O, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
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
      {/* Logo */}
      <div style={{ padding: "20px 16px", borderBottom: "1px solid #1E1E1E", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: O, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Package size={18} color="#fff" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>Proveedor</p>
            <p style={{ fontSize: 10, color: "#555" }}>Panel de gestión</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(nav => {
          const active = isActive(nav);
          const Icon   = nav.icon;
          return (
            <Link key={nav.to} to={nav.to} onClick={() => setDrawerOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10, textDecoration: "none",
                background: active ? `rgba(255,107,44,0.12)` : "transparent",
                color: active ? O : "#666",
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

      {/* Footer */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid #1E1E1E", flexShrink: 0 }}>
        {profile && (
          <div style={{ padding: "8px 12px", marginBottom: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{profile.full_name || "Proveedor"}</p>
            <p style={{ fontSize: 11, color: "#555" }}>supplier</p>
          </div>
        )}
        <button onClick={handleSignOut} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10,
          background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 13, width: "100%",
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
        .sup-layout  { display: flex; min-height: 100vh; background: #0A0A0A; }
        .sup-sidebar { width: 220px; background: #0F0F0F; border-right: 1px solid #1E1E1E; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow: hidden; }
        .sup-topbar  { display: none; }
        .sup-main    { flex: 1; min-width: 0; }
        .sup-page    { padding: clamp(16px, 3vw, 40px); width: 100%; box-sizing: border-box; }
        @media (max-width: 768px) {
          .sup-sidebar { display: none; }
          .sup-page    { padding: 20px 16px; }
          .sup-topbar  { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #0F0F0F; border-bottom: 1px solid #1E1E1E; position: sticky; top: 0; z-index: 40; }
        }
      `}</style>

      <div className="sup-layout">
        <aside className="sup-sidebar"><SidebarContent /></aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="sup-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, background: O, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Package size={13} color="#fff" />
              </div>
              <span style={{ fontWeight: 800, color: "#fff", fontSize: 14 }}>Proveedor</span>
            </div>
            <button onClick={() => setDrawerOpen(true)} style={{ background: "#1E1E1E", border: "1px solid #2A2A2A", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#fff", display: "flex" }}>
              <Menu size={18} />
            </button>
          </div>

          <main className="sup-main"><Outlet /></main>
        </div>
      </div>

      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50 }} />
          <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 240, background: "#0F0F0F", borderRight: "1px solid #1E1E1E", zIndex: 51, overflowY: "auto" }}>
            <button onClick={() => setDrawerOpen(false)} style={{ position: "absolute", top: 14, right: 14, background: "#1E1E1E", border: "1px solid #2A2A2A", borderRadius: 8, padding: 4, cursor: "pointer", color: "#fff", display: "flex" }}>
              <X size={16} />
            </button>
            <div style={{ height: "100%" }}><SidebarContent /></div>
          </div>
        </>
      )}
    </>
  );
}
