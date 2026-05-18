export function playBookingSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    function note(freq, start, duration, vol = 0.35) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    }

    note(880,  0,    0.25);
    note(1320, 0.18, 0.35);

    setTimeout(() => ctx.close(), 1000);
  } catch {}
}
