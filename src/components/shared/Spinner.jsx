export default function Spinner({ size = 32, color = "var(--brand, #FF6B2C)" }) {
  const s = size;
  const blade = s * 0.28;

  return (
    <svg
      width={s} height={s} viewBox="0 0 100 100"
      style={{ animation: "scissors-spin 0.8s linear infinite", flexShrink: 0 }}
    >
      <style>{`@keyframes scissors-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Blade 1 */}
      <g transform="rotate(-20 50 50)">
        <ellipse cx="50" cy="28" rx="6" ry="22" fill={color} opacity="0.9" />
        <circle cx="50" cy="54" r="8" fill="none" stroke={color} strokeWidth="5" opacity="0.9" />
      </g>

      {/* Blade 2 */}
      <g transform="rotate(20 50 50)">
        <ellipse cx="50" cy="28" rx="6" ry="22" fill={color} opacity="0.7" />
        <circle cx="50" cy="54" r="8" fill="none" stroke={color} strokeWidth="5" opacity="0.7" />
      </g>

      {/* Pivot */}
      <circle cx="50" cy="50" r="5" fill={color} />
    </svg>
  );
}

export function FullPageSpinner() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg, #0A0A0A)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Spinner size={48} />
    </div>
  );
}
