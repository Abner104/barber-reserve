import WhatsAppQR from "../../admin/components/WhatsAppQR";

const O = "#FF6B2C";

export default function SuperAdminSettingsPage() {
  return (
    <div className="sa-page" style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>Configuración</h1>
        <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>Ajustes del panel super admin</p>
      </div>

      <div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 4 }}>WhatsApp Super Admin</p>
        <p style={{ fontSize: 13, color: "#555", marginBottom: 16, lineHeight: 1.5 }}>
          Conecta tu WhatsApp para recibir una notificación cada vez que una nueva barbería se registre en el SaaS.
        </p>
        <div style={{
          "--surface2": "#1A1A1A", "--border": "#2A2A2A", "--text": "#fff",
          "--text-faint": "#555", "--text-muted": "#888",
          "--brand": O, "--brand-alpha": "rgba(255,107,44,0.12)",
          "--surface": "#111",
        }}>
          <WhatsAppQR barberId="superadmin" barberName="Super Admin" />
        </div>
      </div>

      <div style={{ background: "rgba(255,107,44,0.06)", border: "1px solid rgba(255,107,44,0.2)", borderRadius: 12, padding: "12px 16px" }}>
        <p style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
          💡 La sesión <strong style={{ color: O }}>superadmin</strong> es independiente de las sesiones de los barberos. No hay conflicto entre notificaciones.
        </p>
      </div>
    </div>
  );
}
