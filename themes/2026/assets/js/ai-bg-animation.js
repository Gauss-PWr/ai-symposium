"use strict";

(function () {
  const canvas = document.getElementById("bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W = 0,
    H = 0,
    t = 0;
  let DPR = 1;

  // ── palette ────────────────────────────────────────────────
  const C = {
    bg: "#00000e",
    cyan: "#00d4ff",
    purple: "#8800ee",
    magenta: "#cc00cc",
    white: "#ffffff",
  };

  // ── wave lines (declared early — resize() depends on initWaves) ──
  let waves = [];

  function initWaves() {
    const waveCount = W < 760 ? 6 : 9;
    waves = Array.from({ length: waveCount }, () => ({
      yBase: Math.random() * H,
      amp: 18 + Math.random() * 52,
      freq: 0.0022 + Math.random() * 0.0038,
      phase: Math.random() * Math.PI * 2,
      speed: (0.22 + Math.random() * 0.55) * (Math.random() > 0.5 ? 1 : -1),
      color: Math.random() > 0.5 ? C.cyan : C.purple,
      alpha: 0.04 + Math.random() * 0.12,
      lw: 0.4 + Math.random() * 0.9,
    }));
  }

  // ── particles state (declared early — resize() depends on initParticles) ──
  let particles = [];
  let connectionLimit = 88;
  let connectionLimitSquared = connectionLimit * connectionLimit;

  function initParticles() {
    const isMobile = W < 760;
    const particleCount = isMobile
      ? Math.min(56, Math.max(24, Math.floor((W * H) / 14000)))
      : Math.min(90, Math.max(45, Math.floor((W * H) / 7000)));

    connectionLimit = isMobile ? 72 : 88;
    connectionLimitSquared = connectionLimit * connectionLimit;

    particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * (W || 800),
      y: Math.random() * (H || 600),
      vx: (Math.random() - 0.5) * 0.32,
      vy: (Math.random() - 0.5) * 0.32,
      r: Math.random() * 1.7 + 0.5,
      alpha: Math.random() * 0.6 + 0.2,
      hue: Math.random() > 0.5 ? C.cyan : C.purple,
    }));
  }

  // ── resize ─────────────────────────────────────────────────
  let resizeTimer;
  let stableMobileHeight = 0;
  function resize() {
    const prevW = W;
    const nextW = window.innerWidth;
    const nextH = window.innerHeight;
    const isMobile = nextW < 760;

    W = nextW;
    if (isMobile && stableMobileHeight > 0 && nextW === prevW) {
      H = stableMobileHeight;
    } else {
      H = nextH;
    }

    const dprCap = W < 760 ? 1.75 : 2;
    DPR = Math.min(window.devicePixelRatio || 1, dprCap);

    canvas.width = Math.max(1, Math.floor(W * DPR));
    canvas.height = Math.max(1, Math.floor(H * DPR));
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (isMobile) {
      stableMobileHeight = H;
    }

    initWaves();
    initParticles();
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
  }
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 80);
  });
  resize();

  // ── perspective grid ───────────────────────────────────────
  const GC = 24,
    GR = 15;
  const GW = 3.2,
    GD = 2.8;
  const CAM_Y = 1.25,
    CAM_Z = -0.25,
    FOCAL = 1.25;

  function project(gx, gy, gz) {
    const rz = gz - CAM_Z;
    if (rz < 0.001) return null;
    const sc = FOCAL / rz;
    const half = W * 0.44;
    return {
      x: W * 0.5 + gx * sc * half,
      y: H * 0.74 - (gy - CAM_Y) * sc * half,
    };
  }

  function drawGrid() {
    ctx.save();
    ctx.lineWidth = 0.5;

    for (let r = 0; r <= GR; r++) {
      const gz = (r / GR) * GD + 0.18;
      const depth = (gz - 0.18) / GD;
      if (depth < 0.01) continue;
      ctx.globalAlpha = depth * depth * 0.55;
      ctx.strokeStyle = C.purple;
      ctx.beginPath();
      let started = false;
      for (let c = 0; c <= GC; c++) {
        const gx = (c / GC - 0.5) * GW;
        const wave = Math.sin(gx * 2.4 + gz * 1.7 - t * 0.0012) * 0.065;
        const p = project(gx, wave, gz);
        if (!p) continue;
        if (!started) {
          ctx.moveTo(p.x, p.y);
          started = true;
        } else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    for (let c = 0; c <= GC; c++) {
      const gx = (c / GC - 0.5) * GW;
      const edgeFade = 1 - Math.abs(gx / (GW * 0.5)) * 0.9;
      if (edgeFade <= 0) continue;
      ctx.globalAlpha = edgeFade * 0.22;
      ctx.strokeStyle = C.cyan;
      ctx.beginPath();
      let started = false;
      for (let r = 0; r <= GR; r++) {
        const gz = (r / GR) * GD + 0.18;
        const wave = Math.sin(gx * 2.4 + gz * 1.7 - t * 0.0012) * 0.065;
        const p = project(gx, wave, gz);
        if (!p) continue;
        if (!started) {
          ctx.moveTo(p.x, p.y);
          started = true;
        } else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── neural network ─────────────────────────────────────────
  const NN = {
    layers: [
      [
        {
          x: 0,
          y: 0,
          activation: 0,
          activationStart: 0,
          activationDuration: 0,
          nextActivation: 0,
        },
        {
          x: 0,
          y: 0,
          activation: 0,
          activationStart: 0,
          activationDuration: 0,
          nextActivation: 0,
        },
      ],
      [
        {
          x: 0,
          y: 0,
          activation: 0,
          activationStart: 0,
          activationDuration: 0,
          nextActivation: 0,
        },
        {
          x: 0,
          y: 0,
          activation: 0,
          activationStart: 0,
          activationDuration: 0,
          nextActivation: 0,
        },
        {
          x: 0,
          y: 0,
          activation: 0,
          activationStart: 0,
          activationDuration: 0,
          nextActivation: 0,
        },
      ],
      [
        {
          x: 0,
          y: 0,
          activation: 0,
          activationStart: 0,
          activationDuration: 0,
          nextActivation: 0,
        },
        {
          x: 0,
          y: 0,
          activation: 0,
          activationStart: 0,
          activationDuration: 0,
          nextActivation: 0,
        },
      ],
    ],
  };

  const NODE_STAGGER = 180;
  let activationCycleEnd = 0;
  let activationCycleRestartAt = 0;

  function scheduleNodeActivationCycle(startTime) {
    const allNodes = NN.layers.flat();

    allNodes.forEach((node, index) => {
      node.activationStart = 0;
      node.activation = 0;
      node.nextActivation = startTime + index * NODE_STAGGER;
    });

    const maxDuration = Math.max(
      ...allNodes.map((node) => node.activationDuration)
    );
    activationCycleEnd =
      startTime + (allNodes.length - 1) * NODE_STAGGER + maxDuration + 900;
    activationCycleRestartAt = activationCycleEnd + 2500 + Math.random() * 1800;
  }

  function initNodeActivations() {
    const allNodes = NN.layers.flat();
    allNodes.forEach((node) => {
      node.activationStart = 0;
      node.activationDuration = 600 + Math.random() * 400; // 600-1000ms
      node.nextActivation = 0;
    });

    scheduleNodeActivationCycle(t + 1400 + Math.random() * 800);
  }
  initNodeActivations();

  function updateNNPositions() {
    const cx = W * 0.5;
    const cy = H * 0.4;
    const s = Math.min(W * 0.21, H * 0.24, 190);
    const horizontalGap = s * 0.90; // Gap between layers (now horizontal) - reduced

    // Layer 0 (input) - 2 nodes centered vertically on the left
    NN.layers[0][0] = {
      ...NN.layers[0][0],
      x: cx - horizontalGap,
      y: cy - s * 0.3,
    };
    NN.layers[0][1] = {
      ...NN.layers[0][1],
      x: cx - horizontalGap,
      y: cy + s * 0.3,
    };

    // Layer 1 (hidden) - 3 nodes centered vertically in the middle
    NN.layers[1][0] = { ...NN.layers[1][0], x: cx, y: cy - s * 0.55 };
    NN.layers[1][1] = { ...NN.layers[1][1], x: cx, y: cy };
    NN.layers[1][2] = { ...NN.layers[1][2], x: cx, y: cy + s * 0.65 };

    // Layer 2 (output) - 2 nodes centered vertically on the right
    NN.layers[2][0] = {
      ...NN.layers[2][0],
      x: cx + horizontalGap,
      y: cy - s * 0.25,
    };
    NN.layers[2][1] = {
      ...NN.layers[2][1],
      x: cx + horizontalGap,
      y: cy + s * 0.25,
    };
  }

  function updateNNActivations() {
    const allNodes = NN.layers.flat();

    const allInactive = allNodes.every((node) => node.activation === 0);
    if (allInactive && t >= activationCycleRestartAt) {
      scheduleNodeActivationCycle(t + 5000 + Math.random() * 2000);
    }

    allNodes.forEach((node) => {
      // Check if it's time to activate this node
      if (t >= node.nextActivation && node.activation === 0) {
        node.activationStart = t;
      }

      // Calculate activation decay
      const timeSinceActivation = t - node.activationStart;
      if (
        timeSinceActivation >= 0 &&
        timeSinceActivation < node.activationDuration
      ) {
        // Smooth activation curve: rise quickly, decay slowly
        const progress = timeSinceActivation / node.activationDuration;
        node.activation = Math.exp(-progress * 2.5) * 0.45; // Max 0.45 activation
      } else {
        node.activation = 0;
      }
    });

    // If the current wave has completed and every node is inactive, prepare the next run.
    if (t >= activationCycleEnd && allNodes.every((node) => node.activation === 0)) {
      activationCycleRestartAt = Math.max(
        activationCycleRestartAt,
        t + 2200 + Math.random() * 4200
      );
    }
  }

  function drawNeuralNet() {
    updateNNPositions();
    updateNNActivations();
    ctx.save();

    const viewportScale = Math.sqrt((W / 1920) * (H / 1080));
    const nodeRadius = Math.max(16, Math.min(36, 30 * viewportScale));
    const edgeLineBase = Math.max(3, nodeRadius * 0.27);
    const borderLineBase = Math.max(4, nodeRadius * 0.33);

    // Draw edges - always visible but subtly brightened on activation
    for (let l = 0; l < NN.layers.length - 1; l++) {
      for (const nodeA of NN.layers[l]) {
        for (const nodeB of NN.layers[l + 1]) {
          // Edge brightness based on activation of both nodes
          const edgeActivation = Math.sqrt(nodeA.activation * nodeB.activation);

          ctx.globalAlpha = 1 + edgeActivation * 0.4; // More visible edges
          ctx.strokeStyle = C.white;
          ctx.lineWidth = edgeLineBase + edgeActivation * 1.2; // Thicker edges
          // ctx.shadowColor = C.cyan;
          // ctx.shadowBlur = 2 + edgeActivation * 4;

          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.hypot(dx, dy) || 1;
          const ux = dx / distance;
          const uy = dy / distance;

          const startX = nodeA.x + ux * nodeRadius;
          const startY = nodeA.y + uy * nodeRadius;
          const endX = nodeB.x - ux * nodeRadius;
          const endY = nodeB.y - uy * nodeRadius;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    // ctx.shadowBlur = 0;
    const allNodes = NN.layers.flat();
    for (const node of allNodes) {
      const baseRadius = nodeRadius; // Much bigger nodes
      const activation = Math.max(0, Math.min(1, node.activation));
      const glowRadius = baseRadius + activation * (baseRadius * 0.27);

      // Glow layers
      for (let g = 2; g >= 1; g--) {
        ctx.globalAlpha = activation * 0.08 * g;
        ctx.fillStyle = C.white;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius + g * (baseRadius * 0.1), 0, Math.PI * 2);
        ctx.fill();
      }

      // Core
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff00";
      ctx.beginPath();
      ctx.arc(node.x, node.y, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Border - always white, brighter on activation
      ctx.globalAlpha = 0.9 + activation * 0.3;
      ctx.strokeStyle = C.white;
      ctx.lineWidth = borderLineBase + activation * 1.5;
      // ctx.shadowColor = C.white;
      // ctx.shadowBlur = 4 + activation * 8;
      ctx.beginPath();
      ctx.arc(node.x, node.y, baseRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── particles ──────────────────────────────────────────────

  function updateParticles() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
      if (p.y < -5) p.y = H + 5;
      if (p.y > H + 5) p.y = -5;
    }
  }

  function drawParticles() {
    ctx.save();
    ctx.lineWidth = 0.4;
    // ctx.shadowBlur = 0;

    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        if (Math.abs(dx) > connectionLimit) continue;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < connectionLimitSquared) {
          ctx.globalAlpha = (1 - d2 / connectionLimitSquared) * 0.13;
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
      ctx.fillStyle = p.hue;
      // ctx.shadowColor = p.hue;
      // ctx.shadowBlur = 6;
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
      x:
        (slot / N_DROPS) * (window.innerWidth || 800) +
        (Math.random() - 0.5) * 60,
      y: Math.random() * (window.innerHeight || 600),
      speed: 0.12 + Math.random() * 0.42,
      chars: Array.from({ length: 5 + Math.floor(Math.random() * 9) }, () =>
        Math.random() > 0.5 ? "1" : "0"
      ),
      alpha: 0.08 + Math.random() * 0.28,
      size: 10 + Math.floor(Math.random() * 5),
      tick: 0,
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
      if (d.y > H + 220) {
        drops[i] = makeDropAt(i);
        continue;
      }
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
      w.phase += w.speed * 0.01;
      ctx.globalAlpha = w.alpha;
      ctx.strokeStyle = w.color;
      ctx.lineWidth = w.lw;
      // ctx.shadowColor = w.color;
      // ctx.shadowBlur = 3;
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
    const cx = W * 0.5,
      cy = H * 0.4;
    const r = Math.min(W, H) * 0.38;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.0006);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(28, 0, 80,  ${0.14 + pulse * 0.06})`);
    g.addColorStop(0.45, `rgba(0,  18, 55, ${0.07 + pulse * 0.03})`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ── floating hand image ───────────────────────────────────
  const handImage = new Image();
  handImage.src = window.__HAND_IMAGE_URL__ || "/hand.png";

  function drawFloatingHand() {
    if (!handImage.complete || handImage.naturalWidth === 0) return;

    const floatY = Math.sin(t * 0.00115) * 8;
    const sway = Math.sin(t * 0.00062) * 0.04;
    const targetWidth = Math.min(W * 0.60, 980);
    const aspect = handImage.naturalHeight / handImage.naturalWidth;
    const targetHeight = targetWidth * aspect;

    ctx.save();
    ctx.translate(W * 0.52, H * 0.6 + floatY);
    // ctx.rotate(-0.34 + sway);
    ctx.globalAlpha = 0.34;
    // ctx.shadowColor = C.cyan;
    // ctx.shadowBlur = 16;
    ctx.drawImage(
      handImage,
      -targetWidth * 0.58,
      -targetHeight * 0.47,
      targetWidth,
      targetHeight
    );

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
    drawFloatingHand();
    drawNeuralNet();
    requestAnimationFrame(frame);
  }

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  requestAnimationFrame(frame);
})();
