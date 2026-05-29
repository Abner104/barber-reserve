import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../../../store/authStore";
import { getSupplierByProfileId } from "../services/supplierService";
import { supabase } from "../../../lib/supabase";
import { formatCurrency } from "../../../lib/utils";

const O = "var(--brand, #FF6B2C)";

async function getCredits(supplierId) {
  const { data, error } = await supabase
    .from("supplier_sales")
    .select("*")
    .eq("supplier_id", supplierId)
    .eq("payment_method", "credit")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function markAsPaid(id) {
  const { error } = await supabase
    .from("supplier_sales")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

function daysLeft(createdAt, creditDays) {
  const created = new Date(createdAt);
  const due     = new Date(created.getTime() + creditDays * 86400000);
  const diff    = Math.ceil((due - new Date()) / 86400000);
  return diff;
}

export default function SupplierCreditsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("pending"); // pending | paid | all

  const { data: supplier } = useQuery({
    queryKey: ["supplier-profile", user?.id],
    queryFn:  () => getSupplierByProfileId(user.id),
    enabled:  !!user?.id,
  });

  const { data: credits = [], isLoading } = useQuery({
    queryKey: ["supplier-credits", supplier?.id],
    queryFn:  () => getCredits(supplier.id),
    enabled:  !!supplier?.id,
  });

  const payMut = useMutation({
    mutationFn: markAsPaid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-credits"] });
      toast.success("Crédito marcado como pagado");
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const filtered = credits.filter(c =>
    filter === "all"     ? true :
    filter === "pending" ? c.status === "pending" :
    c.status === "paid"
  );

  const totalPending = credits
    .filter(c => c.status === "pending")
    .reduce((s, c) => s + c.total, 0);

  const overdue = credits.filter(c => {
    if (c.status !== "pending" || !c.credit_days) return false;
    return daysLeft(c.created_at, c.credit_days) < 0;
  });

  return (
    <div className="sup-page" style={{ maxWidth: "min(800px, 100%)" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)" }}>Créditos</h1>
        <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Ventas a crédito y seguimiento de pagos</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={{ background: "rgba(255,107,44,0.06)", border: "1px solid rgba(255,107,44,0.2)", borderRadius: 14, padding: "14px 16px" }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: O }}>{formatCurrency(totalPending)}</p>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>Total pendiente</p>
        </div>
        <div style={{ background: overdue.length > 0 ? "rgba(239,68,68,0.06)" : "var(--surface)", border: `1px solid ${overdue.length > 0 ? "rgba(239,68,68,0.2)" : "var(--border)"}`, borderRadius: 14, padding: "14px 16px" }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: overdue.length > 0 ? "#ef4444" : "var(--text)" }}>{overdue.length}</p>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>Vencidos</p>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px" }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: "var(--text)" }}>{credits.filter(c => c.status === "pending").length}</p>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>Pendientes</p>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px" }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: "#22c55e" }}>{credits.filter(c => c.status === "paid").length}</p>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>Cobrados</p>
        </div>
      </div>

      {/* Filtro */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { id: "pending", label: "Pendientes" },
          { id: "paid",    label: "Cobrados" },
          { id: "all",     label: "Todos" },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setFilter(id)}
            style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${filter === id ? O : "var(--border)"}`, background: filter === id ? `rgba(255,107,44,0.08)` : "transparent", color: filter === id ? O : "var(--text-faint)", fontWeight: filter === id ? 700 : 400, fontSize: 13, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 70, borderRadius: 14, background: "var(--surface)" }} />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16 }}>
          <CheckCircle size={40} color="#22c55e" style={{ opacity: 0.4, marginBottom: 12 }} />
          <p style={{ color: "var(--text-faint)", fontSize: 14 }}>
            {filter === "pending" ? "No hay créditos pendientes" : "Sin registros"}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(credit => {
          const days    = credit.credit_days ? daysLeft(credit.created_at, credit.credit_days) : null;
          const expired = days !== null && days < 0;
          const isOpen  = expanded === credit.id;

          return (
            <div key={credit.id}
              style={{ background: "var(--surface)", border: `1px solid ${expired && credit.status === "pending" ? "rgba(239,68,68,0.3)" : "var(--border)"}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
                onClick={() => setExpanded(isOpen ? null : credit.id)}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: credit.status === "paid" ? "rgba(34,197,94,0.1)" : expired ? "rgba(239,68,68,0.1)" : "rgba(255,107,44,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {credit.status === "paid"
                    ? <CheckCircle size={16} color="#22c55e" />
                    : expired
                    ? <AlertTriangle size={16} color="#ef4444" />
                    : <Clock size={16} color={O} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{credit.client_name || "Cliente sin nombre"}</p>
                  <p style={{ fontSize: 12, color: "var(--text-faint)" }}>
                    {new Date(credit.created_at).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                    {credit.credit_days && (
                      <> · {credit.status === "paid" ? "Cobrado" : expired ? `Vencido hace ${Math.abs(days)} días` : `Vence en ${days} días`}</>
                    )}
                  </p>
                </div>
                <p style={{ fontWeight: 800, color: credit.status === "paid" ? "#22c55e" : O, fontSize: 16, flexShrink: 0 }}>{formatCurrency(credit.total)}</p>
                {isOpen ? <ChevronUp size={16} color="var(--text-faint)" /> : <ChevronDown size={16} color="var(--text-faint)" />}
              </div>

              {isOpen && (
                <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                  <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {(credit.items ?? []).map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ fontSize: 13, color: "var(--text)" }}>{item.name}</p>
                          <p style={{ fontSize: 11, color: "var(--text-faint)" }}>{item.qty} × {formatCurrency(item.price)}</p>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{formatCurrency(item.price * item.qty)}</p>
                      </div>
                    ))}
                    {credit.note && (
                      <p style={{ fontSize: 12, color: "var(--text-faint)", padding: "8px 10px", background: "var(--surface2)", borderRadius: 8, marginTop: 4 }}>📝 {credit.note}</p>
                    )}
                    {credit.client_phone && (
                      <p style={{ fontSize: 12, color: "var(--text-faint)" }}>📱 {credit.client_phone}</p>
                    )}
                    {credit.status === "pending" && (
                      <button onClick={() => payMut.mutate(credit.id)} disabled={payMut.isPending}
                        style={{ marginTop: 8, padding: "10px 16px", borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%" }}>
                        ✓ Marcar como cobrado
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
