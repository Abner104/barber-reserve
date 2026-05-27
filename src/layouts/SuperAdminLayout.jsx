import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Scissors, LayoutDashboard, Building2, LogOut, Menu, X, ChevronRight, Zap, Tag, Package } from "lucide-react";
import { useAuthStore } from "../store/authStore";

const NAV = [
  { to: "/superadmin",           icon: LayoutDashboard, label: "Overview",    exact: true },
  { to: "/superadmin/shops",     icon: Building2,       label: "Barberías"   },
  { to: "/superadmin/suppliers", icon: Package,         label: "Proveedores" },
  { to: "/superadmin/pricing",   icon: Tag,             label: "Precios"     },
];

export default function SuperAdminLayout() {
  const { pathname }               = useLocation();
  const navigate                   = useNavigate();
  const { signOut, profile, loading, user } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #2A2A2A", borderTopColor: "#FF6B2C", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role !== "super_admin") return <Navigate to="/admin" replace />;

  function isActive(nav) {
    return nav.exact ? pathname === nav.to : pathname.startsWith(nav.to);
  }

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px", borderBottom: "1px solid #1E1E1E", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, background: "#FF6B2C", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={15} color="#fff" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>Clippr</p>
            <p style={{ fontSize: 10, color: "#FF6B2C", fontWeight: 700 }}>Super Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(nav => {
          const active = isActive(nav);
          const Icon   = nav.icon;
          return (
            <Link key={nav.to} to={nav.to} onClick={() => setDrawerOpen(false)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
              textDecoration: "none", background: active ? "rgba(255,107,44,0.12)" : "transparent",
              color: active ? "#FF6B2C" : "#666", fontWeight: active ? 600 : 400, fontSize: 14,
            }}>
              <Icon size={17} />
              <span style={{ flex: 1 }}>{nav.label}</span>
              {active && <ChevronRight size={13} />}
            </Link>
          );
        })}
        <Link to="/admin" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, textDecoration: "none", color: "#555", fontSize: 14, marginTop: 8 }}>
          <Scissors size={17} />
          <span>Panel Admin</span>
        </Link>
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid #1E1E1E" }}>
        {profile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,107,44,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#FF6B2C" }}>{(profile.full_name || "S")[0]}</span>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{profile.full_name || "Super Admin"}</p>
              <p style={{ fontSize: 10, color: "#FF6B2C" }}>super_admin</p>
            </div>
          </div>
        )}
        <button onClick={async () => { try { await signOut(); } catch {} navigate("/login", { replace: true }); }} style={{
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
        .sa-layout  { display: flex; min-height: 100vh; background: #0A0A0A; }
        .sa-sidebar { width: 220px; background: #0F0F0F; border-right: 1px solid #1E1E1E; flex-shrink: 0; position: sticky; top: 0; height: 100vh; }
        .sa-topbar  { display: none; }
        .sa-main    { flex: 1; min-width: 0; }
        .sa-page    { padding: 32px; }
        .sa-drawer-overlay { display: none; }
        .sa-drawer  { display: none; }
        @media (max-width: 768px) {
          .sa-sidebar { display: none; }
          .sa-page    { padding: 20px 16px; }
          .sa-topbar  { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #0F0F0F; border-bottom: 1px solid #1E1E1E; position: sticky; top: 0; z-index: 40; }
          .sa-drawer-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 50; }
          .sa-drawer  { display: block; position: fixed; top: 0; left: 0; bottom: 0; width: 240px; background: #0F0F0F; border-right: 1px solid #1E1E1E; z-index: 51; overflow-y: auto; }
        }
      `}</style>

      <div className="sa-layout">
        <aside className="sa-sidebar"><SidebarContent /></aside>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="sa-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, background: "#FF6B2C", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={13} color="#fff" />
              </div>
              <span style={{ fontWeight: 800, color: "#fff", fontSize: 14 }}>Super Admin</span>
            </div>
            <button onClick={() => setDrawerOpen(true)} style={{ background: "#1E1E1E", border: "1px solid #2A2A2A", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#fff", display: "flex" }}>
              <Menu size={18} />
            </button>
          </div>
          <main className="sa-main"><Outlet /></main>
        </div>
      </div>

      {drawerOpen && (
        <>
          <div className="sa-drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="sa-drawer">
            <button onClick={() => setDrawerOpen(false)} style={{ position: "absolute", top: 14, right: 14, background: "#1E1E1E", border: "1px solid #2A2A2A", borderRadius: 8, padding: 4, cursor: "pointer", color: "#fff", display: "flex", zIndex: 1 }}>
              <X size={16} />
            </button>
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}
