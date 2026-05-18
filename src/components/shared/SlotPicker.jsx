/**
 * Selector visual de slots de tiempo disponibles.
 * El barbero toca cada hora para activarla/desactivarla.
 * Genera slots de 30 en 30 min de 07:00 a 23:00.
 */
const ALL_SLOTS = Array.from({ length: 32 }, (_, i) => {
  const totalMin = 7 * 60 + i * 30; // empieza 07:00
  const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const m = totalMin % 60 === 0 ? "00" : "30";
  return `${h}:${m}`;
}); // 07:00 → 22:30

export default function SlotPicker({ selected = [], onChange }) {
  function toggle(slot) {
    if (selected.includes(slot)) {
      onChange(selected.filter(s => s !== slot));
    } else {
      onChange([...selected, slot].sort());
    }
  }

  // Agrupar por hora para mostrar en filas de 2 (HH:00 y HH:30)
  const hours = [];
  for (let i = 0; i < ALL_SLOTS.length; i += 2) {
    hours.push([ALL_SLOTS[i], ALL_SLOTS[i + 1]].filter(Boolean));
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {ALL_SLOTS.map(slot => {
          const active = selected.includes(slot);
          return (
            <button
              key={slot}
              onClick={() => toggle(slot)}
              style={{
                padding: "8px 4px",
                borderRadius: 8,
                border: `1px solid ${active ? "var(--brand, #FF6B2C)" : "var(--border)"}`,
                background: active ? "var(--brand-alpha)" : "var(--card-bg)",
                color: active ? "var(--brand, #FF6B2C)" : "var(--text-muted)",
                fontWeight: active ? 700 : 400,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {slot}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
          {selected.length} slot{selected.length > 1 ? "s" : ""} seleccionado{selected.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
