import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import BarberLoader from "./BarberLoader";

export default function ProtectedRoute({ children, requireSuperAdmin = false }) {
  const { user, profile, loading } = useAuthStore();

  if (loading) return <BarberLoader />;

  if (!user) return <Navigate to="/login" replace />;

  if (requireSuperAdmin && profile?.role !== "super_admin") {
    return <Navigate to="/admin" replace />;
  }

  if (profile && profile.role !== "owner" && profile.role !== "super_admin" && profile.role !== "barber") {
    return <Navigate to="/" replace />;
  }

  return children;
}
