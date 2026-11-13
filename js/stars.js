// js/stars.js — AEGIS background starfield
// Three parallax layers drifting slowly to the right, with per-star twinkle.
// Respects prefers-reduced-motion: pauses animation if the user opts out.

(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────────────────────
  const LAYERS = [
    // { count, speedX, speedY, minR, maxR, baseAlpha }
    { count: 180, speedX: 0.012, speedY: 0.004, minR: 0.3, maxR: 0.8, baseAlpha: 0.35 }, // distant
    { count: 90,  speedX: 0.030, speedY: 0.010, minR: 0.6, maxR: 1.3, baseAlpha: 0.55 }, // mid
    { count: 35,  speedX: 0.060, speedY: 0.020, minR: 1.0, maxR: 2.0, baseAlpha: 0.75 }, // close
  ];

  // A small handful of stars get the neon accent tint (#B6F23A at low opacity)
  const ACCENT_RATIO   = 0.04; // 4 % of stars
  const TWINKLE_SPEED  = 0.008;
  const TWINKLE_DEPTH  = 0.30; // ± 30 % of baseAlpha

  // ── Reduced-motion check ─────────────────────────────────────────────────────
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion  = motionQuery.matches;
  motionQuery.addEventListener("change", (e) => { reducedMotion = e.matches; });

  // ── Canvas setup ─────────────────────────────────────────────────────────────
  const canvas = document.getElementById("star-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  window.addEventListener("resize", resize);
  resize();

  // ── Star pool ────────────────────────────────────────────────────────────────
  const stars = [];

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function createStar(layer, x, y) {
    const isAccent = Math.random() < ACCENT_RATIO;
    return {
      layer,
      x:            x  !== undefined ? x  : rand(0, W),
      y:            y  !== undefined ? y  : rand(0, H),
      r:            rand(layer.minR, layer.maxR),
      baseAlpha:    layer.baseAlpha,
      alpha:        layer.baseAlpha,
      twinklePhase: rand(0, Math.PI * 2),
      isAccent,
    };
  }

  LAYERS.forEach((layer) => {
    for (let i = 0; i < layer.count; i++) {
      stars.push(createStar(layer));
    }
  });

  // ── Render loop ───────────────────────────────────────────────────────────────
  let lastTime = 0;

  function tick(ts) {
    const dt = Math.min(ts - lastTime, 50); // cap at 50 ms to handle tab-hidden spikes
    lastTime = ts;

    ctx.clearRect(0, 0, W, H);

    stars.forEach((s) => {
      const layer = s.layer;

      // Movement (skip if reduced motion)
      if (!reducedMotion) {
        s.x += layer.speedX * dt * 0.1;
        s.y += layer.speedY * dt * 0.1;
        s.twinklePhase += TWINKLE_SPEED * dt * 0.1;

        // Wrap horizontally; wrap vertically
        if (s.x > W + 2) s.x = -2;
        if (s.y > H + 2) s.y = -2;
      }

      // Twinkle
      const twinkle = Math.sin(s.twinklePhase) * TWINKLE_DEPTH;
      s.alpha = Math.max(0.05, s.baseAlpha + twinkle * s.baseAlpha);

      // Draw
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);

      if (s.isAccent) {
        // Neon lime glow — very faint
        ctx.fillStyle = `rgba(182, 242, 58, ${s.alpha * 0.7})`;
        // soft halo
        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3);
        grd.addColorStop(0, `rgba(182, 242, 58, ${s.alpha * 0.25})`);
        grd.addColorStop(1, "rgba(182, 242, 58, 0)");
        ctx.fillStyle = grd;
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.fill();
        // core dot
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(182, 242, 58, ${s.alpha * 0.9})`;
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
      }

      ctx.fill();
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame((ts) => {
    lastTime = ts;
    requestAnimationFrame(tick);
  });
})();
