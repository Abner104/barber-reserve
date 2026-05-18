import { useEffect, useRef, useState } from "react";

/**
 * Pantalla de intro animada que aparece 1.5s antes del wizard.
 * Se monta DESPUÉS de tener el shop — así el color es siempre correcto.
 */
export default function ShopIntro({ shopName, logoUrl, color = "#FF6B2C", onDone }) {
  const canvasRef = useRef(null);
  const [fading, setFading] = useState(false);

  // Timer para cerrar
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1200);
    const t2 = setTimeout(() => onDone(), 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Animación canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width  = 160;
    const H = canvas.height = 190;
    let frame = 0;
    let raf;

    // Leer colores del tema actual
    const cs        = getComputedStyle(document.documentElement);
    const tBg       = cs.getPropertyValue("--bg").trim()       || "#0A0A0A";
    const tCard     = cs.getPropertyValue("--card-bg").trim()  || "#141414";
    const tSurface  = cs.getPropertyValue("--surface2").trim() || "#1E1E1E";
    const tBorder   = cs.getPropertyValue("--border").trim()   || "#2A2A2A";
    const isDark    = tBg.includes("0A") || tBg.includes("10") || tBg === "#0A0A0A";

    const hairs = Array.from({ length: 14 }, () => ({
      x: 30 + Math.random() * 100,
      y: -Math.random() * 60,
      len: 5 + Math.random() * 9,
      speed: 0.9 + Math.random() * 1.2,
      angle: (Math.random() - 0.5) * 0.5,
      curve: (Math.random() - 0.5) * 0.03,
      opacity: 0.3 + Math.random() * 0.5,
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Glow fondo
      const g = ctx.createRadialGradient(W/2, H/2, 5, W/2, H/2, 80);
      g.addColorStop(0, color + "12");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      frame++;
      const bx = W / 2 - 18;
      const bw = 36;
      const shake = Math.sin(frame * 0.9) * 1.2;
      const blade = Math.sin(frame * 0.28) * 3;

      ctx.save();
      ctx.translate(W/2 + shake, 0);

      // Cuerpo
      ctx.beginPath();
      ctx.roundRect(bx, 15, bw, 78, [10, 10, 5, 5]);
      ctx.fillStyle = tCard;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Display
      ctx.beginPath();
      ctx.roundRect(bx+5, 22, bw-10, 22, 3);
      ctx.fillStyle = tSurface;
      ctx.fill();

      // Barras display
      const ba = 0.5 + 0.5 * Math.sin(frame * 0.09);
      [[18, 2.8],[11, 2.8],[15, 2.8]].forEach(([w, h], i) => {
        ctx.beginPath();
        ctx.roundRect(bx+8, 26 + i*7, w, h, 1.5);
        ctx.fillStyle = color;
        ctx.globalAlpha = ba * (1 - i * 0.28);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Power (parpadea)
      const pw = frame % 28 < 14 ? 1 : 0.1;
      ctx.beginPath();
      ctx.arc(bx + bw - 7, 28, 4.5, 0, Math.PI*2);
      ctx.fillStyle = tSurface; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx + bw - 7, 28, 2.5, 0, Math.PI*2);
      ctx.fillStyle = color; ctx.globalAlpha = pw; ctx.fill(); ctx.globalAlpha = 1;

      // Grip izquierdo
      [52,61,70].forEach(y => {
        ctx.beginPath();
        ctx.roundRect(bx-4, y, 3.5, 6, 1.8);
        ctx.fillStyle = color; ctx.globalAlpha = 0.45; ctx.fill(); ctx.globalAlpha = 1;
      });

      // Cabezal
      ctx.beginPath();
      ctx.roundRect(bx-4, 91, bw+8, 15, [3,3,5,5]);
      ctx.fillStyle = tSurface; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.stroke();

      // Dientes fijos
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.roundRect(bx - 2 + i * 9, 89, 6, 4.5, 2);
        ctx.fillStyle = color; ctx.fill();
      }

      // Cuchillas móviles
      ctx.save();
      ctx.translate(blade, 0);
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.roundRect(bx - 2 + i * 9, 94, 6, 10, 2);
        ctx.fillStyle = i%2===0 ? color : color+"99";
        ctx.fill();
      }
      ctx.restore();

      // Chispas
      if (frame % 3 < 2) {
        for (let i = 0; i < 2; i++) {
          const sx = bx + 2 + Math.random() * (bw - 4);
          ctx.beginPath();
          ctx.arc(sx, 104 + Math.random()*3, 1 + Math.random(), 0, Math.PI*2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.6 + Math.random()*0.4;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Cable
      ctx.beginPath();
      ctx.moveTo(W/2, 106); ctx.quadraticCurveTo(W/2-6, 118, W/2-16, 120);
      ctx.strokeStyle = tBorder; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.stroke();

      ctx.restore();

      // Pelos cayendo
      hairs.forEach(h => {
        h.y += h.speed; h.angle += h.curve;
        if (h.y > H + 15) { h.y = -15; h.x = 25 + Math.random()*110; h.angle = (Math.random()-0.5)*0.5; }
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.angle);
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.quadraticCurveTo(h.len*0.12, h.len*0.5, 0, h.len);
        ctx.strokeStyle = "#777";
        ctx.globalAlpha = h.opacity * 0.55;
        ctx.lineWidth = 0.7;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
      });

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, [color]);

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg, #0A0A0A)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      opacity: fading ? 0 : 1, transition: "opacity 0.5s ease",
    }}>
      <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto 20px" }} />

      {logoUrl ? (
        <img src={logoUrl} alt={shopName} style={{ height: 28, maxWidth: 120, objectFit: "contain", marginBottom: 8, borderRadius: 6 }} onError={e => e.target.style.display="none"} />
      ) : (
        <p style={{ fontSize: 18, fontWeight: 900, color: "var(--text, #fff)", marginBottom: 6, letterSpacing: -0.5 }}>
          {shopName || <><span style={{ color: "var(--text, #fff)" }}>Barber</span><span style={{ color }}>OS</span></>}
        </p>
      )}

      <style>{`@keyframes si-bar{0%{transform:translateX(-100%)}100%{transform:translateX(420%)}}`}</style>
      <div style={{ width: 90, height: 2, background: "#1a1a1a", borderRadius: 1, marginTop: 14, overflow: "hidden" }}>
        <div style={{ width:"28%", height:"100%", background: color, borderRadius:1, animation:"si-bar 1s ease-in-out infinite" }} />
      </div>
    </div>
  );
}
