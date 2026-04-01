"use strict";

(function () {
  const canvas = document.getElementById("bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0, t = 0;

  // ── palette ────────────────────────────────────────────────
  const C = {
    bg:      "#00000e",
    cyan:    "#00d4ff",
    purple:  "#8800ee",
    magenta: "#cc00cc",
    white:   "#ffffff",
  };

  // ── wave lines (declared early — resize() depends on initWaves) ──
  let waves = [];

  function initWaves() {
    waves = Array.from({ length: 9 }, () => ({
      yBase: Math.random() * H,
      amp:   18 + Math.random() * 52,
      freq:  0.0022 + Math.random() * 0.0038,
      phase: Math.random() * Math.PI * 2,
      speed: (0.22 + Math.random() * 0.55) * (Math.random() > 0.5 ? 1 : -1),
      color: Math.random() > 0.5 ? C.cyan : C.purple,
      alpha: 0.04 + Math.random() * 0.12,
      lw:    0.4 + Math.random() * 0.9,
    }));
  }

  // ── resize ─────────────────────────────────────────────────
  let resizeTimer;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initWaves();
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
  }
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 80);
  });
  resize();

  // ── perspective grid ───────────────────────────────────────
  const GC = 24, GR = 15;
  const GW = 3.2, GD = 2.8;
  const CAM_Y = 1.25, CAM_Z = -0.25, FOCAL = 1.25;

  function project(gx, gy, gz) {
    const rz = gz - CAM_Z;
    if (rz < 0.001) return null;
    const sc = FOCAL / rz;
    const half = W * 0.44;
    return {
      x: W * 0.5  + gx * sc * half,
      y: H * 0.74 - (gy - CAM_Y) * sc * half,
    };
  }

  function drawGrid() {
    ctx.save();
    ctx.lineWidth = 0.5;

    for (let r = 0; r <= GR; r++) {
      const gz    = (r / GR) * GD + 0.18;
      const depth = (gz - 0.18) / GD;
      if (depth < 0.01) continue;
      ctx.globalAlpha = depth * depth * 0.55;
      ctx.strokeStyle = C.purple;
      ctx.beginPath();
      let started = false;
      for (let c = 0; c <= GC; c++) {
        const gx   = (c / GC - 0.5) * GW;
        const wave = Math.sin(gx * 2.4 + gz * 1.7 - t * 0.0012) * 0.065;
        const p    = project(gx, wave, gz);
        if (!p) continue;
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else            ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    for (let c = 0; c <= GC; c++) {
      const gx       = (c / GC - 0.5) * GW;
      const edgeFade = 1 - Math.abs(gx / (GW * 0.5)) * 0.9;
      if (edgeFade <= 0) continue;
      ctx.globalAlpha = edgeFade * 0.22;
      ctx.strokeStyle = C.cyan;
      ctx.beginPath();
      let started = false;
      for (let r = 0; r <= GR; r++) {
        const gz   = (r / GR) * GD + 0.18;
        const wave = Math.sin(gx * 2.4 + gz * 1.7 - t * 0.0012) * 0.065;
        const p    = project(gx, wave, gz);
        if (!p) continue;
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else            ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── neural network ─────────────────────────────────────────
  function nnLayers() {
    const cx  = W * 0.5;
    const cy  = H * 0.40;
    const s   = Math.min(W * 0.21, H * 0.24, 190);
    const bob = Math.sin(t * 0.0007) * s * 0.042;
    return [
      [{ x: cx,             y: cy - s * 0.95 + bob }],
      [
        { x: cx - s * 0.63, y: cy - s * 0.22 + bob },
        { x: cx,            y: cy - s * 0.22 + bob },
        { x: cx + s * 0.63, y: cy - s * 0.22 + bob },
      ],
      [
        { x: cx - s * 0.63, y: cy + s * 0.42 + bob },
        { x: cx,            y: cy + s * 0.42 + bob },
        { x: cx + s * 0.63, y: cy + s * 0.42 + bob },
      ],
    ];
  }

  function drawNeuralNet() {
    const layers = nnLayers();
    ctx.save();

    for (let l = 0; l < layers.length - 1; l++) {
      for (const a of layers[l]) {
        for (const b of layers[l + 1]) {
          const phase = a.x * 0.021 + b.y * 0.014;
          const pulse = 0.10 + 0.22 * (0.5 + 0.5 * Math.sin(t * 0.0014 + phase));
          ctx.globalAlpha = pulse;
          ctx.strokeStyle = C.white;
          ctx.lineWidth   = 0.7;
          ctx.shadowColor = C.cyan;
          ctx.shadowBlur  = 5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    const all = layers.flat();
    ctx.shadowBlur = 0;
    for (const nd of all) {
      const phase = nd.x * 0.024;
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.0018 + phase);
      const R     = 8 + pulse * 3.5;

      for (let g = 3; g >= 1; g--) {
        ctx.globalAlpha = 0.032 * pulse * g;
        ctx.fillStyle   = C.cyan;
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, R + g * 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.95;
      ctx.fillStyle   = "#000018";
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.85 + 0.15 * pulse;
      ctx.strokeStyle = C.white;
      ctx.lineWidth   = 1.8;
      ctx.shadowColor = C.cyan;
      ctx.shadowBlur  = 14;
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, R, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── particles ──────────────────────────────────────────────
  const N_PART  = Math.min(90, Math.max(45, Math.floor((screen.width * screen.height) / 7000)));
  const CONN_D2 = 88 * 88;

  const particles = Array.from({ length: N_PART }, () => ({
    x:     Math.random() * (window.innerWidth  || 800),
    y:     Math.random() * (window.innerHeight || 600),
    vx:    (Math.random() - 0.5) * 0.32,
    vy:    (Math.random() - 0.5) * 0.32,
    r:     Math.random() * 1.7 + 0.5,
    alpha: Math.random() * 0.6 + 0.2,
    hue:   Math.random() > 0.5 ? C.cyan : C.purple,
  }));

  function updateParticles() {
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -5)    p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
      if (p.y < -5)    p.y = H + 5;
      if (p.y > H + 5) p.y = -5;
    }
  }

  function drawParticles() {
    ctx.save();
    ctx.lineWidth  = 0.4;
    ctx.shadowBlur = 0;

    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b  = particles[j];
        const dx = a.x - b.x;
        if (Math.abs(dx) > 88) continue;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < CONN_D2) {
          ctx.globalAlpha = (1 - d2 / CONN_D2) * 0.13;
          ctx.strokeStyle = C.cyan;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const p of particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = p.hue;
      ctx.shadowColor = p.hue;
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ── binary rain ────────────────────────────────────────────
  const N_DROPS = 20;

  function makeDropAt(slot) {
    return {
      x:     (slot / N_DROPS) * (window.innerWidth || 800) + (Math.random() - 0.5) * 60,
      y:     Math.random() * (window.innerHeight || 600),
      speed: 0.12 + Math.random() * 0.42,
      chars: Array.from({ length: 5 + Math.floor(Math.random() * 9) }, () =>
               Math.random() > 0.5 ? "1" : "0"),
      alpha: 0.08 + Math.random() * 0.28,
      size:  10 + Math.floor(Math.random() * 5),
      tick:  0,
    };
  }

  const drops = Array.from({ length: N_DROPS }, (_, i) => makeDropAt(i));

  function drawBinary() {
    ctx.save();
    ctx.fillStyle = C.magenta;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.y += d.speed;
      d.tick++;
      if (d.y > H + 220) { drops[i] = makeDropAt(i); continue; }
      if (d.tick % (50 + Math.floor(Math.random() * 70)) === 0) {
        d.chars[Math.floor(Math.random() * d.chars.length)] =
          Math.random() > 0.5 ? "1" : "0";
      }
      ctx.font = `${d.size}px 'Courier New', monospace`;
      for (let k = 0; k < d.chars.length; k++) {
        const fade = 1 - k / d.chars.length;
        ctx.globalAlpha = d.alpha * fade * fade;
        ctx.fillText(d.chars[k], d.x, d.y + k * (d.size + 3));
      }
    }
    ctx.restore();
  }

  // ── wave lines ─────────────────────────────────────────────
  function drawWaves() {
    ctx.save();
    const step = W > 800 ? 10 : 7;
    for (const w of waves) {
      w.phase += w.speed * 0.010;
      ctx.globalAlpha = w.alpha;
      ctx.strokeStyle = w.color;
      ctx.lineWidth   = w.lw;
      ctx.shadowColor = w.color;
      ctx.shadowBlur  = 3;
      ctx.beginPath();
      for (let x = 0; x <= W; x += step) {
        const y = w.yBase + Math.sin(x * w.freq + w.phase) * w.amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── ambient centre glow ────────────────────────────────────
  function drawGlow() {
    const cx    = W * 0.5, cy = H * 0.40;
    const r     = Math.min(W, H) * 0.38;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.0006);
    const g     = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0,    `rgba(28, 0, 80,  ${0.14 + pulse * 0.06})`);
    g.addColorStop(0.45, `rgba(0,  18, 55, ${0.07 + pulse * 0.03})`);
    g.addColorStop(1,    "rgba(0, 0, 0, 0)");
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ── main loop ──────────────────────────────────────────────
  function frame(now) {
    t = now;
    ctx.fillStyle = "rgba(0, 0, 14, 0.23)";
    ctx.fillRect(0, 0, W, H);
    drawGlow();
    drawGrid();
    drawWaves();
    drawBinary();
    updateParticles();
    drawParticles();
    drawNeuralNet();
    requestAnimationFrame(frame);
  }

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  requestAnimationFrame(frame);
})();
