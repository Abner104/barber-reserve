import { useEffect, useRef } from "react";

export default function BarberLoader({
  message  = "Preparando tu experiencia...",
  shopName = null,
  logoUrl  = null,
  color    = "#FF6B2C",
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext("2d");
    const W = canvas.width  = 200;
    const H = canvas.height = 220;
    let frame = 0;
    let raf;

    // Pelos que caen
    const hairs = Array.from({ length: 18 }, (_, i) => ({
      x:       30 + Math.random() * 140,
      y:       -Math.random() * 80,
      len:     4 + Math.random() * 10,
      speed:   0.8 + Math.random() * 1.4,
      angle:   (Math.random() - 0.5) * 0.6,
      opacity: 0.4 + Math.random() * 0.6,
      curve:   (Math.random() - 0.5) * 0.04,
    }));

    function drawClipper(shake, bladeOffset) {
      const cx = W / 2;
      const bodyX = cx - 22;
      const bodyW = 44;

      ctx.save();
      // Vibración sutil
      ctx.translate(cx + Math.sin(shake * 0.8) * 1.5, Math.cos(shake * 1.2) * 1);

      // Cuerpo
      ctx.beginPath();
      ctx.roundRect(bodyX, 20, bodyW, 95, [12, 12, 6, 6]);
      ctx.fillStyle = "#161616";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Display
      ctx.beginPath();
      ctx.roundRect(bodyX + 6, 27, bodyW - 12, 26, 4);
      ctx.fillStyle = "#0D0D0D";
      ctx.fill();
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Barras del display (animan)
      const barAlpha = 0.5 + 0.5 * Math.sin(frame * 0.08);
      [0, 7, 14].forEach((dy, i) => {
        const widths = [22, 14, 17];
        ctx.beginPath();
        ctx.roundRect(bodyX + 9, 31 + dy, widths[i], 3.5, 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = barAlpha * (1 - i * 0.25);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Botón power parpadeando
      const pwAlpha = frame % 30 < 15 ? 1 : 0.12;
      ctx.beginPath();
      ctx.arc(bodyX + bodyW - 9, 33, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bodyX + bodyW - 9, 33, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = pwAlpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Grip lateral izq
      [55, 65, 75].forEach(y => {
        ctx.beginPath();
        ctx.roundRect(bodyX - 4, y, 4, 7, 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Cabezal
      ctx.beginPath();
      ctx.roundRect(bodyX - 4, 112, bodyW + 8, 18, [3, 3, 5, 5]);
      ctx.fillStyle = "#111";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dientes fijos (arriba del cabezal)
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.roundRect(bodyX - 2 + i * 9, 110, 6, 5, 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      // Cuchillas móviles (se mueven horizontalmente)
      ctx.save();
      ctx.translate(bladeOffset, 0);
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.roundRect(bodyX - 2 + i * 9, 116, 6, 11, 2);
        ctx.fillStyle = i % 2 === 0 ? color : color + "aa";
        ctx.fill();
      }
      ctx.restore();

      // Chispas en la base de las cuchillas
      if (frame % 4 < 2) {
        for (let i = 0; i < 3; i++) {
          const sx = bodyX + 5 + Math.random() * (bodyW - 4);
          const sy = 128 + Math.random() * 4;
          ctx.beginPath();
          ctx.arc(sx, sy, 1 + Math.random(), 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.7 + Math.random() * 0.3;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Cable
      ctx.beginPath();
      ctx.moveTo(cx, 130);
      ctx.quadraticCurveTo(cx - 8, 145, cx - 20, 148);
      ctx.strokeStyle = "#1e1e1e";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.restore();
    }

    function drawHairs() {
      hairs.forEach(h => {
        h.y     += h.speed;
        h.angle += h.curve;

        if (h.y > H + 20) {
          h.y       = -20;
          h.x       = 50 + Math.random() * 100;
          h.opacity = 0.4 + Math.random() * 0.6;
          h.angle   = (Math.random() - 0.5) * 0.6;
        }

        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(h.len * 0.15, h.len * 0.5, 0, h.len);
        ctx.strokeStyle = "#888";
        ctx.globalAlpha = h.opacity * 0.6;
        ctx.lineWidth   = 0.8;
        ctx.lineCap     = "round";
        ctx.stroke();
        ctx.restore();
      });
    }

    function tick() {
      ctx.clearRect(0, 0, W, H);

      // Fondo sutil con gradiente
      const grad = ctx.createRadialGradient(W/2, H/2, 10, W/2, H/2, 100);
      grad.addColorStop(0, color + "08");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      frame++;
      const shake      = frame;
      const bladeOffset = Math.sin(frame * 0.25) * 3.5;

      drawHairs();
      drawClipper(shake, bladeOffset);

      raf = requestAnimationFrame(tick);
    }

    tick();
    return () => cancelAnimationFrame(raf);
  }, [color]);

  return (
    <div style={{
      minHeight: "100vh", width: "100%", background: "#0A0A0A",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
    }}>
      <style>{`
        @keyframes lb-blink { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes lb-bar   { 0%{transform:translateX(-100%)} 100%{transform:translateX(420%)} }
        .lb-txt { animation: lb-blink 1.5s ease-in-out infinite; }
        .lb-bar { animation: lb-bar   1.2s ease-in-out infinite; }
      `}</style>

      <canvas ref={canvasRef} style={{ display: "block" }} />

      {/* Logo / nombre */}
      <div style={{ marginTop: 8 }}>
        {logoUrl ? (
          <img src={logoUrl} alt={shopName ?? "logo"}
            style={{ height: 30, maxWidth: 130, objectFit: "contain", borderRadius: 6 }}
            onError={e => e.target.style.display = "none"}
          />
        ) : shopName ? (
          <p style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>{shopName}</p>
        ) : (
          <p style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>
            <span style={{ color: "#fff" }}>Barber</span>
            <span style={{ color }}>OS</span>
          </p>
        )}
      </div>

      <p className="lb-txt" style={{ color: "#333", fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", marginTop: 6 }}>
        {message}
      </p>

      <div style={{ width: 100, height: 2, background: "#1a1a1a", borderRadius: 1, marginTop: 16, overflow: "hidden" }}>
        <div className="lb-bar" style={{ width: "28%", height: "100%", background: color, borderRadius: 1 }}/>
      </div>
    </div>
  );
}
