(function () {
  'use strict';

  // ─── DOM Elements ────────────────────────────────────────────────────────────
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');
  const loader = document.getElementById('loader');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const scrollPrompt = document.getElementById('scroll-prompt');

  // ─── State ───────────────────────────────────────────────────────────────────
  let width, height, dpr;
  let scrollProgress = 0;   // 0-1
  let targetProgress = 0;
  let animFrame;

  // ─── Particle System ─────────────────────────────────────────────────────────
  const PARTICLE_COUNT = 120;
  const particles = [];

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function createParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      baseX: 0,
      baseY: 0,
      vx: randomRange(-0.15, 0.15),
      vy: randomRange(-0.25, -0.05),
      radius: randomRange(0.8, 2.8),
      alpha: randomRange(0.1, 0.55),
      baseAlpha: 0,
      hue: randomRange(15, 35),      // orange-amber family
      life: Math.random(),           // 0-1 phase offset
      speed: randomRange(0.002, 0.006),
    };
  }

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = createParticle();
      p.baseAlpha = p.alpha;
      particles.push(p);
    }
  }

  // ─── Orb / Aurora Layer ──────────────────────────────────────────────────────
  const orbs = [
    { cx: 0.18, cy: 0.35, rx: 0.42, ry: 0.55, hue: 22,  sat: 90,  lit: 50, a: 0.28 },
    { cx: 0.78, cy: 0.65, rx: 0.38, ry: 0.45, hue: 200, sat: 80,  lit: 50, a: 0.14 },
    { cx: 0.50, cy: 0.20, rx: 0.55, ry: 0.38, hue: 280, sat: 60,  lit: 35, a: 0.10 },
    { cx: 0.85, cy: 0.15, rx: 0.30, ry: 0.30, hue: 30,  sat: 100, lit: 55, a: 0.18 },
  ];

  let time = 0;

  // ─── Canvas Resize ────────────────────────────────────────────────────────────
  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = width  + 'px';
    canvas.style.height = height + 'px';

    ctx.scale(dpr, dpr);
    initParticles();
  }

  // ─── Draw Functions ───────────────────────────────────────────────────────────

  function drawBackground() {
    // Deep dark base — morphs subtly with scroll
    const t = scrollProgress;

    // Gradient shifts from deep navy-black → near-black purple as user scrolls
    const grad = ctx.createLinearGradient(0, 0, width * 0.6, height);
    grad.addColorStop(0,   `hsl(240, 18%, ${4 + t * 3}%)`);
    grad.addColorStop(0.5, `hsl(250, 14%, ${3 + t * 2}%)`);
    grad.addColorStop(1,   `hsl(260, 20%, ${2 + t * 2}%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function drawOrbs() {
    const t = time * 0.00045;
    const s = scrollProgress;

    orbs.forEach((orb, i) => {
      const pulse = Math.sin(t * (1.2 + i * 0.3) + i * 1.4) * 0.07;
      const cx = (orb.cx + Math.sin(t * 0.7 + i) * 0.04 - s * 0.08 * (i % 2 === 0 ? 1 : -1)) * width;
      const cy = (orb.cy + Math.cos(t * 0.5 + i) * 0.03 + s * 0.06) * height;
      const rx = (orb.rx + pulse) * width;
      const ry = (orb.ry + pulse) * height;

      const alpha = orb.a * (0.7 + s * 0.5) + Math.sin(t + i) * 0.03;
      const lit   = orb.lit + s * 12;

      const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      radGrad.addColorStop(0,   `hsla(${orb.hue}, ${orb.sat}%, ${lit}%, ${alpha})`);
      radGrad.addColorStop(0.5, `hsla(${orb.hue}, ${orb.sat}%, ${lit * 0.6}%, ${alpha * 0.5})`);
      radGrad.addColorStop(1,   `hsla(${orb.hue}, ${orb.sat}%, ${lit * 0.3}%, 0)`);

      // Draw as an ellipse
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
      ctx.fillStyle = radGrad;
      ctx.fill();
      ctx.restore();
    });
  }

  function drawParticles() {
    const t = time * 0.001;
    const s = scrollProgress;

    particles.forEach(p => {
      // Drift upward, wrap at top
      p.x += p.vx;
      p.y += p.vy * (1 + s * 1.8);  // particles speed up as user scrolls

      if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
      if (p.x < -10) { p.x = width + 10; }
      if (p.x > width + 10) { p.x = -10; }

      // Pulsing alpha
      p.life = (p.life + p.speed) % 1;
      const pAlpha = p.baseAlpha * (0.5 + Math.sin(p.life * Math.PI * 2) * 0.5) * (0.5 + s * 0.7);

      // Orange glow dot
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
      grd.addColorStop(0,   `hsla(${p.hue}, 95%, 70%, ${pAlpha})`);
      grd.addColorStop(1,   `hsla(${p.hue}, 90%, 55%, 0)`);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    });
  }

  function drawScanlines() {
    // Very subtle horizontal scan-line texture
    const lineSpacing = 4;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.018)';
    for (let y = 0; y < height; y += lineSpacing) {
      ctx.fillRect(0, y, width, 1);
    }
  }

  function drawScrollOverlay() {
    // As user scrolls down, dark overlay gently deepens (content sections darken bg)
    const alpha = scrollProgress * 0.45;
    ctx.fillStyle = `rgba(7, 7, 9, ${alpha})`;
    ctx.fillRect(0, 0, width, height);
  }

  // ─── Noise Overlay (subtle grain) ────────────────────────────────────────────
  function drawGrain() {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const intensity = 8;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() * 2 - 1) * intensity;
      data[i] = data[i + 1] = data[i + 2] = noise;
      data[i + 3] = 14;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // ─── Main Render Loop ─────────────────────────────────────────────────────────
  let lastGrainTime = 0;

  function render(timestamp) {
    time = timestamp;

    // Smooth scroll lerp
    scrollProgress += (targetProgress - scrollProgress) * 0.07;

    drawBackground();
    drawOrbs();
    drawParticles();
    drawScanlines();
    drawScrollOverlay();

    // Grain every ~100ms to avoid performance hit of per-frame pixel writes
    if (timestamp - lastGrainTime > 100) {
      drawGrain();
      lastGrainTime = timestamp;
    }

    animFrame = requestAnimationFrame(render);
  }

  // ─── Scroll Handler ───────────────────────────────────────────────────────────
  function updateScroll() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const docHeight  = Math.max(
      document.body.scrollHeight, document.documentElement.scrollHeight,
      document.body.offsetHeight, document.documentElement.offsetHeight
    );
    const winHeight = window.innerHeight;
    const maxScroll = Math.max(1, docHeight - winHeight);
    targetProgress  = Math.min(1, Math.max(0, scrollTop / maxScroll));

    // Scroll prompt
    if (scrollPrompt) {
      if (scrollTop > 40) scrollPrompt.classList.add('fade-out');
      else scrollPrompt.classList.remove('fade-out');
    }

    // Active nav link
    updateActiveNavLink();
  }

  function updateActiveNavLink() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = (window.scrollY || 0) + 200;

    sections.forEach(section => {
      const top  = section.offsetTop;
      const btm  = top + section.offsetHeight;
      const id   = section.getAttribute('id');
      if (scrollPos >= top && scrollPos < btm) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) link.classList.add('active');
        });
      }
    });
  }

  // ─── Fake Loading Progress (since no images to load) ─────────────────────────
  function fakeProgress() {
    let pct = 0;
    const interval = setInterval(() => {
      pct += randomRange(8, 20);
      if (pct >= 100) {
        pct = 100;
        clearInterval(interval);
        if (progressBar)  progressBar.style.width = '100%';
        if (progressText) progressText.innerText  = '100%';
        setTimeout(() => {
          if (loader) loader.classList.add('hidden');
        }, 350);
      } else {
        if (progressBar)  progressBar.style.width = `${pct}%`;
        if (progressText) progressText.innerText  = `${Math.floor(pct)}%`;
      }
    }, 60);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    resizeCanvas();
    updateScroll();
    fakeProgress();
    requestAnimationFrame(render);

    window.addEventListener('scroll',    updateScroll,  { passive: true });
    window.addEventListener('wheel',     updateScroll,  { passive: true });
    window.addEventListener('touchmove', updateScroll,  { passive: true });
    window.addEventListener('resize',    () => {
      cancelAnimationFrame(animFrame);
      resizeCanvas();
      requestAnimationFrame(render);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
