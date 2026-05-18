/**
 * Selector de hora con intervalos de 30min.
 * Usa <select> en vez de <input type="time"> para evitar
 * limitaciones del browser en ciertos sistemas operativos.
 */
const HOURS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

export default function TimeSelect({ value, onChange, style = {} }) {
  return (
    <select
      value={value ?? "09:00"}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: "5px 8px",
        borderRadius: 8,
        background: "var(--surface2, #1E1E1E)",
        border: "1px solid var(--border, #2A2A2A)",
        color: "var(--text, #fff)",
        fontSize: 13,
        cursor: "pointer",
        outline: "none",
        ...style,
      }}
    >
      {HOURS.map(h => (
        <option key={h} value={h}>{h}</option>
      ))}
    </select>
  );
}
