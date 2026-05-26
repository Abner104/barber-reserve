import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../../../store/authStore";
import { getSupplierByProfileId, getSupplierOrders, updateOrderStatus } from "../services/supplierService";
import { formatCurrency } from "../../../lib/utils";

const O = "#FF6B2C";

const STATUS_LABEL = { pending: "Pendiente", processing: "En proceso", shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado" };
const STATUS_COLOR = {
  pending:    { bg: "rgba(251,191,36,0.12)", text: "#fbbf24" },
  processing: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa" },
  shipped:    { bg: "rgba(168,85,247,0.12)", text: "#c084fc" },
  delivered:  { bg: "rgba(34,197,94,0.12)",  text: "#4ade80" },
  cancelled:  { bg: "rgba(239,68,68,0.12)",  text: "#f87171" },
};
const NEXT_STATUS = { pending: "processing", processing: "shipped", shipped: "delivered" };
const NEXT_LABEL  = { pending: "Iniciar proceso", processing: "Marcar enviado", shipped: "Marcar entregado" };
const ACCENT_COLOR = { pending: "#fbbf24", processing: "#60a5fa", shipped: "#c084fc", delivered: "#4ade80", cancelled: "#555" };

export default function SupplierOrdersPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [openId, setOpenId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");

  const { data: supplier } = useQuery({
    queryKey: ["supplier-profile", user?.id],
    queryFn:  () => getSupplierByProfileId(user.id),
    enabled:  !!user?.id,
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["supplier-orders", supplier?.id],
    queryFn:  () => getSupplierOrders(supplier.id),
    enabled:  !!supplier?.id,
    refetchInterval: 30000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateOrderStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier-orders"] }); toast.success("Estado actualizado"); },
    onError: () => toast.error("Error al actualizar"),
  });

  const filtered = filterStatus ? orders.filter(o => o.status === filterStatus) : orders;

  function buildWA(order) {
    const phone = order.contact_phone?.replace(/\D/g, "");
    if (!phone) return null;
    const intl = phone.startsWith("56") ? phone : `56${phone}`;
    const items = (order.items ?? []).map(i => `• ${i.name} × ${i.qty}`).join("\n");
    const msg = encodeURIComponent(`Hola ${order.contact_name} 👋\nTu pedido ha sido actualizado: *${STATUS_LABEL[order.status]}* ✅\n\nProductos:\n${items}\n\nTotal: ${formatCurrency(order.total ?? 0)}`);
    return `https://wa.me/${intl}?text=${msg}`;
  }

  return (
    <div className="sup-page" style={{ maxWidth: "min(1100px, 100%)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>Pedidos</h1>
          <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>{orders.length} pedidos en total</p>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 9, background: "#111", border: "1px solid #1E1E1E", color: filterStatus ? "#fff" : "#555", fontSize: 13, cursor: "pointer" }}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 12, background: "#111" }} />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 20px", background: "#111", border: "1px solid #1E1E1E", borderRadius: 16 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
          <p style={{ fontWeight: 700, color: "#fff", marginBottom: 6 }}>Sin pedidos</p>
          <p style={{ color: "#555", fontSize: 13 }}>{filterStatus ? "No hay pedidos con ese estado." : "Los pedidos de los barberos aparecerán aquí."}</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(o => {
          const sc     = STATUS_COLOR[o.status] ?? { bg: "#1E1E1E", text: "#555" };
          const accent = ACCENT_COLOR[o.status] ?? "#555";
          const isOpen = openId === o.id;
          const next   = NEXT_STATUS[o.status];
          const waUrl  = buildWA(o);

          return (
            <div key={o.id} style={{ background: "#111", border: `1px solid ${isOpen ? O + "44" : "#1E1E1E"}`, borderRadius: 14, overflow: "hidden", borderLeft: `4px solid ${accent}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer" }}
                onClick={() => setOpenId(isOpen ? null : o.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: "#fff", fontSize: 14, marginBottom: 2 }}>
                    {o.contact_name ?? "Barbería"}
                    {o.barbershops?.name && <span style={{ fontSize: 12, color: "#555", fontWeight: 400, marginLeft: 8 }}>{o.barbershops.name}</span>}
                  </p>
                  <p style={{ color: "#555", fontSize: 12 }}>
                    {o.items?.length ?? 0} producto(s) · {format(new Date(o.created_at), "d MMM HH:mm", { locale: es })}
                  </p>
                </div>
                <p style={{ fontWeight: 700, color: O, fontSize: 14, flexShrink: 0 }}>{formatCurrency(o.total ?? 0)}</p>
                <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.text, whiteSpace: "nowrap" }}>
                  {STATUS_LABEL[o.status]}
                </span>
                <ChevronDown size={16} color="#333" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
              </div>

              {isOpen && (
                <div style={{ borderTop: "1px solid #1E1E1E", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Ítems */}
                  <div style={{ background: "#0A0A0A", borderRadius: 10, padding: "12px 14px" }}>
                    <p style={{ fontSize: 11, color: "#555", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1.5 }}>Productos</p>
                    {(o.items ?? []).map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                        <span style={{ color: "#ccc" }}>{item.name} <span style={{ color: "#555" }}>× {item.qty} {item.unit ?? ""}</span></span>
                        <span style={{ color: "#fff", fontWeight: 600 }}>{formatCurrency(item.price * item.qty)}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: "1px solid #1E1E1E", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#aaa" }}>Total</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: O }}>{formatCurrency(o.total ?? 0)}</span>
                    </div>
                  </div>

                  {/* Contacto */}
                  <div style={{ fontSize: 13, color: "#777", display: "flex", flexDirection: "column", gap: 4 }}>
                    {o.contact_phone && <p>📱 {o.contact_phone}</p>}
                    {o.note && <p>📝 {o.note}</p>}
                  </div>

                  {/* Acciones */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {waUrl && (
                      <a href={waUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)", color: "#25d166", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    )}
                    {next && (
                      <button onClick={() => statusMut.mutate({ id: o.id, status: next })} disabled={statusMut.isPending}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, background: `${sc.text}18`, border: `1px solid ${sc.text}44`, color: sc.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        {NEXT_LABEL[o.status]}
                      </button>
                    )}
                    {o.status !== "cancelled" && o.status !== "delivered" && (
                      <button onClick={() => statusMut.mutate({ id: o.id, status: "cancelled" })} disabled={statusMut.isPending}
                        style={{ padding: "8px 14px", borderRadius: 9, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
