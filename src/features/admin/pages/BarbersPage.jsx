import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Power, X, Loader2, ChevronDown, ChevronUp, Images, Trash2, Upload } from "lucide-react";
import ImageUpload, { uploadImage } from "../../../components/shared/ImageUpload";
import WhatsAppStatus from "../components/WhatsAppStatus";
import { getAdminBarbers, createBarber, updateBarber, toggleBarberActive, getBarberWorkingHours, upsertWorkingHours, getBarberPortfolio, addPortfolioPhoto, deletePortfolioPhoto } from "../services/adminService";
import { DAYS_OF_WEEK, DAY_LABEL } from "../../../lib/constants";
import TimeSelect from "../../../components/shared/TimeSelect";

const O = "var(--brand, #FF6B2C)";

const EMPTY_BARBER = { full_name: "", phone: "", specialty: "", bio: "", avatar_url: "", does_delivery: true, delivery_radius: 10, commission_pct: 40, callmebot_key: "", email: "", slot_duration_min: 30, payment_model: "independent", chair_rent_amount: 0, chair_rent_period: "monthly", day_rate_amount: 0 };

export default function BarbersPage() {
  const qc = useQueryClient();
  const [modal, setModal]       = useState(null); // null | 'create' | barber obj
  const [expanded, setExpanded] = useState(null); // barber id con horario expandido

  const { data: barbers = [], isLoading } = useQuery({ queryKey: ["admin-barbers"], queryFn: getAdminBarbers });

  const [credenciales, setCredenciales] = useState(null);

  const createMut = useMutation({
    mutationFn: createBarber,
    onSuccess: (data) => {
      qc.invalidateQueries(["admin-barbers"]);
      setModal(null);
      if (data?.tempPassword) {
        setCredenciales({ email: data.email, password: data.tempPassword, name: data.full_name });
      } else {
        toast.success("Barbero creado");
      }
    },
    onError: (e) => toast.error("Error: " + (e?.message ?? "al crear el barbero")),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, updates }) => updateBarber(id, updates),
    onSuccess: () => { qc.invalidateQueries(["admin-barbers"]); setModal(null); toast.success("Barbero actualizado"); },
    onError: () => toast.error("Error al actualizar el barbero"),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) => toggleBarberActive(id, is_active),
    onSuccess: (_, { is_active }) => { qc.invalidateQueries(["admin-barbers"]); toast.success(is_active ? "Barbero activado" : "Barbero desactivado"); },
    onError: () => toast.error("Error al cambiar el estado"),
  });

  return (
    <div className="admin-page" style={{ maxWidth: "min(900px, 100%)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>Barberos</h1>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Gestiona tu equipo y sus horarios</p>
        </div>
        <button
          onClick={() => setModal("create")}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--brand)", border: "none", borderRadius: 10, color: "var(--text)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        >
          <Plus size={16} /> Nuevo barbero
        </button>
      </div>

      {isLoading && <div style={{ color: "var(--text-faint)" }}>Cargando...</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {barbers.map(b => (
          <BarberRow
            key={b.id}
            barber={b}
            expanded={expanded === b.id}
            onExpand={() => setExpanded(expanded === b.id ? null : b.id)}
            onEdit={() => setModal(b)}
            onToggle={() => toggleMut.mutate({ id: b.id, is_active: !b.is_active })}
          />
        ))}
        {!isLoading && barbers.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-faint)" }}>
            <p style={{ marginBottom: 8 }}>No hay barberos aún.</p>
            <button onClick={() => setModal("create")} style={{ color: "var(--brand)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
              + Crear el primero
            </button>
          </div>
        )}
      </div>

      {modal && (
        <BarberModal
          barber={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSave={(data) => {
            if (modal === "create") createMut.mutate(data);
            else updateMut.mutate({ id: modal.id, updates: data });
          }}
          loading={createMut.isPending || updateMut.isPending}
        />
      )}

      {/* Modal credenciales — aparece cuando se crea barbero con email */}
      {credenciales && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>✅</p>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>Barbero creado</h2>
              <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
                Comparte estas credenciales con <strong style={{ color: "var(--text)" }}>{credenciales.name}</strong> por WhatsApp
              </p>
            </div>

            <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>EMAIL</p>
                <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>{credenciales.email}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>CONTRASEÑA TEMPORAL</p>
                <p style={{ fontWeight: 700, color: "var(--brand)", fontSize: 18, letterSpacing: 1 }}>{credenciales.password}</p>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 20, lineHeight: 1.5, textAlign: "center" }}>
              El barbero entra a <strong style={{ color: "var(--text)" }}>{window.location.origin}/login</strong>, usa estas credenciales y podrá cambiar su contraseña después.
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <a
                href={`https://wa.me/${credenciales.email.includes("56") ? "" : ""}?text=${encodeURIComponent(`Hola ${credenciales.name}! 👋\n\nTus credenciales para el panel:\n\n📱 *URL:* ${window.location.origin}/login\n📧 *Email:* ${credenciales.email}\n🔑 *Contraseña:* ${credenciales.password}\n\nEntra desde tu celular y cambia la contraseña cuando quieras. ✂️`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, padding: "12px", borderRadius: 10, background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)", color: "#25d166", fontWeight: 700, fontSize: 13, textAlign: "center", textDecoration: "none" }}
              >
                📤 Enviar por WS
              </a>
              <button onClick={() => setCredenciales(null)}
                style={{ flex: 1, padding: "12px", borderRadius: 10, background: "var(--brand)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BarberRow({ barber, expanded, onExpand, onEdit, onToggle }) {
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
        {/* avatar */}
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: "var(--brand)", flexShrink: 0 }}>
          {barber.full_name[0]}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>{barber.full_name}</p>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: barber.is_active ? "rgba(34,197,94,0.1)" : "rgba(113,113,122,0.1)", color: barber.is_active ? "#22c55e" : "#71717a" }}>
              {barber.is_active ? "Activo" : "Inactivo"}
            </span>
            {barber.does_delivery && (
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "var(--brand-alpha)", color: "var(--brand)" }}>Domicilio</span>
            )}
          </div>
          {barber.specialty && <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 2 }}>{barber.specialty}</p>}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <IconBtn onClick={onEdit} title="Editar"><Pencil size={15} /></IconBtn>
          <IconBtn onClick={onToggle} title={barber.is_active ? "Desactivar" : "Activar"} danger={barber.is_active}>
            <Power size={15} />
          </IconBtn>
          <IconBtn onClick={onExpand} title="Horarios">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </IconBtn>
        </div>
      </div>

      {expanded && (
        <>
          <PortfolioEditor barberId={barber.id} />
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--card-border)" }}>
            <WhatsAppStatus barberId={barber.id} />
          </div>
        </>
      )}
    </div>
  );
}

function WorkingHoursEditor({ barberId }) {
  const qc = useQueryClient();
  const { data: hours = [] } = useQuery({ queryKey: ["wh", barberId], queryFn: () => getBarberWorkingHours(barberId) });

  const mut = useMutation({
    mutationFn: ({ day, start_time, end_time, is_active }) => upsertWorkingHours(barberId, day, start_time, end_time, is_active),
    onSuccess: () => { qc.invalidateQueries(["wh", barberId]); toast.success("Horario guardado"); },
    onError: () => toast.error("Error al guardar el horario"),
  });

  const getDay = (day) => hours.find(h => h.day === day);

  return (
    <div style={{ borderTop: "1px solid var(--card-border)", padding: "16px 18px", background: "var(--sidebar-bg)" }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Horario semanal</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {DAYS_OF_WEEK.map(day => {
          const h = getDay(day);
          const active = h?.is_active ?? false;
          return (
            <div key={day} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* toggle */}
              <button
                onClick={() => mut.mutate({ day, start_time: h?.start_time ?? "09:00", end_time: h?.end_time ?? "18:00", is_active: !active })}
                style={{ width: 36, height: 20, borderRadius: 10, background: active ? O : "#2A2A2A", border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}
              >
                <span style={{ position: "absolute", top: 2, left: active ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </button>
              <span style={{ width: 80, fontSize: 13, color: active ? "#fff" : "#555", fontWeight: active ? 600 : 400 }}>{DAY_LABEL[day]}</span>
              {active && (
                <>
                  <TimeSelect
                    value={h?.start_time ?? "09:00"}
                    onChange={v => mut.mutate({ day, start_time: v, end_time: h?.end_time ?? "18:00", is_active: true })}
                  />
                  <span style={{ color: "var(--text-faint)", fontSize: 12 }}>–</span>
                  <TimeSelect
                    value={h?.end_time ?? "18:00"}
                    onChange={v => mut.mutate({ day, start_time: h?.start_time ?? "09:00", end_time: v, is_active: true })}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarberModal({ barber, onClose, onSave, loading }) {
  const [form, setForm] = useState(barber ? {
    full_name: barber.full_name, phone: barber.phone ?? "", specialty: barber.specialty ?? "",
    bio: barber.bio ?? "", does_delivery: barber.does_delivery, delivery_radius: barber.delivery_radius,
    commission_pct: barber.commission_pct, callmebot_key: barber.callmebot_key ?? "",
    slot_duration_min: barber.slot_duration_min ?? 30,
    payment_model: barber.payment_model ?? "percentage",
    chair_rent_amount: barber.chair_rent_amount ?? 0,
    chair_rent_period: barber.chair_rent_period ?? "monthly",
    day_rate_amount: barber.day_rate_amount ?? 0,
  } : EMPTY_BARBER);

  const inp = { background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{barber ? "Editar barbero" : "Nuevo barbero"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nombre completo *">
            <input style={inp} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Carlos Rodríguez" />
          </Field>
          {!barber && (
            <Field label="Email del barbero (para su acceso al panel)">
              <input style={inp} type="email" value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="jordan@noblecut.com" />
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                Se enviará un email de activación. El admin recibirá la contraseña temporal para compartirla.
              </p>
            </Field>
          )}
          <Field label="Teléfono / WhatsApp">
            <input style={inp} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="3001234567" />
          </Field>
          <Field label="Especialidad">
            <input style={inp} value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="Fades, Barbas, Diseños" />
          </Field>
          <Field label="Foto del barbero">
            <ImageUpload
              value={form.avatar_url || ""}
              onChange={url => setForm({ ...form, avatar_url: url })}
              folder="avatars"
              label="Subir foto del barbero"
              aspect="square"
              capture="user"
            />
          </Field>
          <Field label="Bio">
            <textarea style={{ ...inp, resize: "none" }} rows={2} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Breve descripción del barbero..." />
          </Field>

          {/* Modelo de pago */}
          <Field label="💰 Modelo de compensación">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { value: "independent", label: "Independiente", emoji: "💯", desc: "Se queda con todo" },
                { value: "percentage",  label: "Porcentaje",    emoji: "📊", desc: "% de cada servicio" },
                { value: "chair_rent",  label: "Arriendo silla",emoji: "🪑", desc: "Monto fijo periódico" },
                { value: "day_rate",    label: "Día trabajado",  emoji: "📅", desc: "Monto por día" },
              ].map(m => (
                <button key={m.value} type="button"
                  onClick={() => setForm({ ...form, payment_model: m.value })}
                  style={{
                    padding: "10px 8px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                    border: `1px solid ${(form.payment_model ?? "percentage") === m.value ? "var(--brand, #FF6B2C)" : "var(--border)"}`,
                    background: (form.payment_model ?? "percentage") === m.value ? "var(--brand-alpha)" : "var(--surface2)",
                  }}
                >
                  <p style={{ fontSize: 16 }}>{m.emoji}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{m.label}</p>
                  <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 1 }}>{m.desc}</p>
                </button>
              ))}
            </div>
          </Field>

          {/* Campos según el modelo */}
          {(form.payment_model ?? "independent") === "percentage" && (
            <Field label="Comisión para el barbero (%)">
              <input style={inp} type="number" min={0} max={100}
                value={form.commission_pct}
                onChange={e => setForm({ ...form, commission_pct: Number(e.target.value) })}
                placeholder="40" />
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                El barbero recibe este % de cada servicio. El resto es del local.
              </p>
            </Field>
          )}

          {(form.payment_model ?? "independent") === "chair_rent" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Monto arriendo">
                <input style={inp} type="number" min={0}
                  value={form.chair_rent_amount ?? 0}
                  onChange={e => setForm({ ...form, chair_rent_amount: Number(e.target.value) })}
                  placeholder="150000" />
              </Field>
              <Field label="Período">
                <select style={{ ...inp, cursor: "pointer" }}
                  value={form.chair_rent_period ?? "monthly"}
                  onChange={e => setForm({ ...form, chair_rent_period: e.target.value })}>
                  <option value="daily">Por día</option>
                  <option value="weekly">Por semana</option>
                  <option value="monthly">Por mes</option>
                </select>
              </Field>
            </div>
          )}

          {(form.payment_model ?? "independent") === "day_rate" && (
            <Field label="Monto por día trabajado">
              <input style={inp} type="number" min={0}
                value={form.day_rate_amount ?? 0}
                onChange={e => setForm({ ...form, day_rate_amount: Number(e.target.value) })}
                placeholder="20000" />
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                Se calcula automáticamente según los días que trabaje en el período.
              </p>
            </Field>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Radio domicilio (km)">
              <input style={inp} type="number" min={1} value={form.delivery_radius} onChange={e => setForm({ ...form, delivery_radius: Number(e.target.value) })} />
            </Field>
            <Field label="Intervalo de slots (min)">
              <select style={{ ...inp, cursor: "pointer" }} value={form.slot_duration_min ?? 30} onChange={e => setForm({ ...form, slot_duration_min: Number(e.target.value) })}>
                {[15, 20, 30, 45, 60, 90].map(v => (
                  <option key={v} value={v}>{v} min</option>
                ))}
              </select>
            </Field>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={form.does_delivery} onChange={e => setForm({ ...form, does_delivery: e.target.checked })} />
            <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Hace domicilios</span>
          </label>

          <Field label="🔔 CallMeBot API Key (WhatsApp automático)">
            <input style={inp} value={form.callmebot_key} onChange={e => setForm({ ...form, callmebot_key: e.target.value })}
              placeholder="ej: 1234567" />
            <div style={{ marginTop: 6, padding: "8px 10px", background: "var(--surface2)", borderRadius: 8, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
              El barbero envía <strong style={{ color: "var(--text)" }}>«I allow callmebot to send me messages»</strong> al{" "}
              <strong style={{ color: "var(--text)" }}>+34 644 33 79 97</strong> por WhatsApp →
              le responden su API Key → pégala aquí.
            </div>
          </Field>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            onClick={() => { if (form.full_name.trim()) onSave(form); }}
            disabled={loading || !form.full_name.trim()}
            style={{ flex: 1, padding: "12px", borderRadius: 10, background: "var(--brand)", border: "none", color: "var(--text)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1 }}
          >
            {loading && <Loader2 size={16} />}
            {barber ? "Guardar cambios" : "Crear barbero"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PortfolioEditor({ barberId }) {
  const qc       = useQueryClient();
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["barber-portfolio", barberId],
    queryFn:  () => getBarberPortfolio(barberId),
  });

  const deleteMut = useMutation({
    mutationFn: deletePortfolioPhoto,
    onSuccess:  () => { qc.invalidateQueries(["barber-portfolio", barberId]); toast.success("Foto eliminada"); },
    onError:    () => toast.error("Error al eliminar"),
  });

  async function handleFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Máx 5MB"); return; }
    setUploading(true);
    try {
      const url = await uploadImage(file, "portfolio");
      await addPortfolioPhoto(barberId, url);
      qc.invalidateQueries(["barber-portfolio", barberId]);
      toast.success("Foto agregada al portafolio");
    } catch { toast.error("Error al subir la foto"); }
    finally   { setUploading(false); }
  }

  return (
    <div style={{ borderTop: "1px solid var(--card-border)", padding: "16px 18px", background: "var(--sidebar-bg)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", letterSpacing: 1, textTransform: "uppercase" }}>
          Portafolio · {photos.length} fotos
        </p>
        <button
          onClick={() => inputRef.current.click()}
          disabled={uploading}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "var(--brand)", border: "none", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", opacity: uploading ? 0.6 : 1 }}
        >
          {uploading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={12} />}
          Agregar foto
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
      </div>

      {isLoading && <p style={{ fontSize: 12, color: "var(--text-faint)" }}>Cargando...</p>}

      {!isLoading && photos.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-faint)", fontSize: 13 }}>
          <Images size={24} style={{ margin: "0 auto 6px", opacity: 0.3 }} />
          <p>Sin fotos aún. Agrega trabajos del barbero.</p>
        </div>
      )}

      {photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
          {photos.map(p => (
            <div key={p.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "1" }}>
              <img src={p.image_url} alt="portfolio" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                onClick={() => deleteMut.mutate(p.id)}
                style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 6, background: "rgba(239,68,68,0.85)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

function IconBtn({ onClick, children, title, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: danger ? "#ef4444" : "#A0A0A0" }}
    >
      {children}
    </button>
  );
}
