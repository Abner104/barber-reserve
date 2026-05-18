import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Scissors } from "lucide-react";

export default function ProtectedRoute({ children, requireSuperAdmin = false }) {
  const { user, profile, loading } = useAuthStore();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, background: "#FF6B2C", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Scissors size={20} color="#fff" />
          </div>
          <div style={{ width: 24, height: 24, border: "3px solid #2A2A2A", borderTopColor: "#FF6B2C", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requireSuperAdmin && profile?.role !== "super_admin") {
    return <Navigate to="/admin" replace />;
  }

  if (profile && profile.role !== "owner" && profile.role !== "super_admin" && profile.role !== "barber") {
    return <Navigate to="/" replace />;
  }

  return children;
}
