import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Loader2, Users, Tag, Calculator } from "lucide-react";
import { getSaasConfig, updateSaasConfig } from "../services/superAdminService";
import { formatCurrency } from "../../../lib/utils";

const O = "#FF6B2C";

export default function PricingPage() {
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["saas-config"],
    queryFn:  getSaasConfig,
  });

  const [form, setForm] = useState({ base_price: 11990, price_per_barber: 2990, trial_days: 30 });

  useEffect(() => {
    if (config) setForm({
      base_price:       config.base_price       ?? 11990,
      price_per_barber: config.price_per_barber ?? 2990,
      trial_days:       config.trial_days       ?? 30,
    });
  }, [config]);

  const mut = useMutation({
    mutationFn: updateSaasConfig,
    onSuccess: () => { qc.invalidateQueries(["saas-config"]); toast.success("Precios actualizados"); },
    onError:   () => toast.error("Error al guardar"),
  });

  const inp = {
    width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 15,
    background: "#141414", border: "1px solid #222", color: "#fff",
    outline: "none", boxSizing: "border-box", fontWeight: 700,
  };

  // Simulador: cuánto paga una barbería con N barberos
  const [simBarbers, setSimBarbers] = useState(3);
  const simTotal = form.base_price + Math.max(0, simBarbers - 1) * form.price_per_barber;

  if (isLoading) return <div className="sa-page" style={{ color: "#555" }}>Cargando...</div>;

  return (
    <div className="sa-page" style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>Precios del SaaS</h1>
        <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>Define cuánto paga cada barbería por usar Clippr</p>
      </div>

      {/* Estructura de precios */}
      <div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 16, padding: 28, marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Estructura de precios</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#666", marginBottom: 8, fontWeight: 600 }}>
              <Tag size={13} color={O} /> PLAN BASE (1 barbero)
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: 13 }}>$</span>
              <input
                style={{ ...inp, paddingLeft: 28 }}
                type="number" min={0}
                value={form.base_price}
                onChange={e => setForm({ ...form, base_price: Number(e.target.value) })}
                onFocus={e => e.target.style.borderColor = O}
                onBlur={e => e.target.style.borderColor = "#222"}
              />
            </div>
            <p style={{ fontSize: 11, color: "#444", marginTop: 6 }}>Precio mensual para la primera silla</p>
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#666", marginBottom: 8, fontWeight: 600 }}>
              <Users size={13} color={O} /> POR BARBERO ADICIONAL
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: 13 }}>$</span>
              <input
                style={{ ...inp, paddingLeft: 28 }}
                type="number" min={0}
                value={form.price_per_barber}
                onChange={e => setForm({ ...form, price_per_barber: Number(e.target.value) })}
                onFocus={e => e.target.style.borderColor = O}
                onBlur={e => e.target.style.borderColor = "#222"}
              />
            </div>
            <p style={{ fontSize: 11, color: "#444", marginTop: 6 }}>Precio por cada barbero extra</p>
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: 200 }}>
          <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 8, fontWeight: 600 }}>DÍAS DE TRIAL GRATIS</label>
          <input
            style={inp}
            type="number" min={1} max={90}
            value={form.trial_days}
            onChange={e => setForm({ ...form, trial_days: Number(e.target.value) })}
            onFocus={e => e.target.style.borderColor = O}
            onBlur={e => e.target.style.borderColor = "#222"}
          />
        </div>
      </div>

      {/* Simulador */}
      <div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 16, padding: 28, marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <Calculator size={18} color={O} /> Simulador
        </h2>
        <p style={{ color: "#555", fontSize: 13, marginBottom: 20 }}>¿Cuánto paga una barbería con N barberos?</p>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 8, fontWeight: 600 }}>CANTIDAD DE BARBEROS</label>
            <input
              style={{ ...inp, fontWeight: 400 }}
              type="number" min={1} max={50}
              value={simBarbers}
              onChange={e => setSimBarbers(Math.max(1, Number(e.target.value)))}
              onFocus={e => e.target.style.borderColor = O}
              onBlur={e => e.target.style.borderColor = "#222"}
            />
          </div>
          <div style={{ flex: 1, background: "#0A0A0A", borderRadius: 12, padding: "16px 20px", border: "1px solid #222" }}>
            <p style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>PAGAN AL MES</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: O }}>{formatCurrency(simTotal)}</p>
            <p style={{ fontSize: 11, color: "#333", marginTop: 4 }}>
              {formatCurrency(form.base_price)} base
              {simBarbers > 1 && ` + ${simBarbers - 1} × ${formatCurrency(form.price_per_barber)}`}
            </p>
          </div>
        </div>

        {/* Tabla rápida */}
        <div style={{ background: "#0A0A0A", borderRadius: 10, overflow: "hidden", border: "1px solid #1A1A1A" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "8px 16px", background: "#141414", fontSize: 11, color: "#555", fontWeight: 700 }}>
            <span>BARBEROS</span><span>PRECIO/MES</span>
          </div>
          {[1,2,3,4,5,10].map(n => (
            <div key={n} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "10px 16px", borderTop: "1px solid #141414", fontSize: 13 }}>
              <span style={{ color: "#888" }}>{n} barbero{n !== 1 ? "s" : ""}</span>
              <span style={{ color: n === simBarbers ? O : "#fff", fontWeight: n === simBarbers ? 700 : 400 }}>
                {formatCurrency(form.base_price + Math.max(0, n - 1) * form.price_per_barber)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => mut.mutate(form)}
        disabled={mut.isPending}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 28px", background: O, border: "none", borderRadius: 11, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: mut.isPending ? 0.7 : 1 }}
      >
        {mut.isPending ? <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={17} />}
        Guardar precios
      </button>
    </div>
  );
}
