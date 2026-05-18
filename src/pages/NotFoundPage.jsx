import { Link } from "react-router-dom";
import { Scissors, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0A",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 20px", textAlign: "center",
    }}>
      {/* Logo */}
      <div style={{ width: 56, height: 56, background: "#FF6B2C", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <Scissors size={26} color="#fff" />
      </div>

      {/* 404 */}
      <p style={{ fontSize: 96, fontWeight: 900, color: "#1E1E1E", lineHeight: 1, marginBottom: 8, letterSpacing: -4 }}>404</p>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
        Página no encontrada
      </h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 36, lineHeight: 1.6, maxWidth: 320 }}>
        La barbería que buscas no existe o el enlace es incorrecto.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
        <Link to="/" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "14px", borderRadius: 12, background: "#FF6B2C",
          color: "#fff", fontWeight: 700, fontSize: 15, textDecoration: "none",
        }}>
          <ArrowLeft size={16} /> Volver al inicio
        </Link>
        <Link to="/login" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "14px", borderRadius: 12, border: "1px solid #2A2A2A",
          color: "#A0A0A0", fontWeight: 600, fontSize: 14, textDecoration: "none",
        }}>
          Panel admin
        </Link>
      </div>
    </div>
  );
}
