(function () {
  'use strict';

  const FRAME_COUNT = 240;
  const FRAME_PREFIX = 'frames/frame_';
  const FRAME_PAD = 6;
  const FRAME_EXT = '.png';
  const LERP_FACTOR = 0.15; // Silky smooth 60-120fps dampening

  // DOM Elements
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');
  const loader = document.getElementById('loader');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const scrollPrompt = document.getElementById('scroll-prompt');

  // Animation State
  const images = new Array(FRAME_COUNT);
  let loadedCount = 0;
  let targetFrame = 0;
  let currentFrame = 0;
  let lastRenderedIndex = -1;

  // Format frame filename: frames/frame_000000.png
  function getFrameUrl(index) {
    const padded = String(index).padStart(FRAME_PAD, '0');
    return `${FRAME_PREFIX}${padded}${FRAME_EXT}`;
  }

  // Set up canvas dimensions with DPR scaling for crisp visuals
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.scale(dpr, dpr);

    // Force redraw current frame after resize
    const drawIndex = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(currentFrame)));
    drawFrame(drawIndex, true);
  }

  // Draw frame with aspect-ratio cover positioning and nearest-loaded fallback
  function drawFrame(index, force = false) {
    if (!force && index === lastRenderedIndex) return;

    let img = images[index];

    // Fallback to nearest loaded frame if target frame is still downloading
    if (!img || !img.complete || img.naturalWidth === 0) {
      for (let i = index - 1; i >= 0; i--) {
        if (images[i] && images[i].complete && images[i].naturalWidth > 0) {
          img = images[i];
          break;
        }
      }
    }

    if (!img || !img.complete || img.naturalWidth === 0) return;

    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    // Aspect cover math
    const hRatio = canvasWidth / imgWidth;
    const vRatio = canvasHeight / imgHeight;
    const ratio = Math.max(hRatio, vRatio);

    const renderWidth = imgWidth * ratio;
    const renderHeight = imgHeight * ratio;
    const offsetX = (canvasWidth - renderWidth) / 2;
    const offsetY = (canvasHeight - renderHeight) / 2;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, 0, 0, imgWidth, imgHeight, offsetX, offsetY, renderWidth, renderHeight);

    lastRenderedIndex = index;
  }

  // Calculate target frame from current scroll position
  function updateScrollTarget() {
    const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const docHeight = Math.max(
      document.body.scrollHeight, document.documentElement.scrollHeight,
      document.body.offsetHeight, document.documentElement.offsetHeight,
      document.body.clientHeight, document.documentElement.clientHeight
    );
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const maxScroll = Math.max(1, docHeight - windowHeight);
    const scrollFraction = Math.max(0, Math.min(1, scrollTop / maxScroll));

    targetFrame = scrollFraction * (FRAME_COUNT - 1);

    // Hide scroll prompt on scroll
    if (scrollTop > 40 && scrollPrompt && !scrollPrompt.classList.contains('fade-out')) {
      scrollPrompt.classList.add('fade-out');
    } else if (scrollTop <= 40 && scrollPrompt && scrollPrompt.classList.contains('fade-out')) {
      scrollPrompt.classList.remove('fade-out');
    }

    // Active Navbar link update
    updateActiveNavLink();
  }

  // Active link highlighter
  function updateActiveNavLink() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = (window.scrollY || document.documentElement.scrollTop) + 200;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  // Continuous animation loop using lerp for buttery smooth scrolling
  function animationLoop() {
    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.001) {
      currentFrame += diff * LERP_FACTOR;
    } else {
      currentFrame = targetFrame;
    }

    const frameIndex = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(currentFrame)));
    drawFrame(frameIndex);

    requestAnimationFrame(animationLoop);
  }

  // Preload all 240 frames into memory
  function preloadImages() {
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        const percent = Math.floor((loadedCount / FRAME_COUNT) * 100);

        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) progressText.innerText = `${percent}%`;

        // Render frame 0 immediately as soon as loaded
        if (i === 0) {
          drawFrame(0, true);
        }

        if (loadedCount === FRAME_COUNT) {
          onAllImagesLoaded();
        }
      };

      img.onerror = () => {
        console.warn(`Failed to load frame ${i}: ${getFrameUrl(i)}`);
        loadedCount++;
        if (loadedCount === FRAME_COUNT) {
          onAllImagesLoaded();
        }
      };

      img.src = getFrameUrl(i);
      images[i] = img;
    }
  }

  // Called when all images have finished preloading
  function onAllImagesLoaded() {
    updateScrollTarget();
    drawFrame(0, true);

    setTimeout(() => {
      if (loader) {
        loader.classList.add('hidden');
      }
    }, 300);
  }

  // Event Listeners
  window.addEventListener('scroll', updateScrollTarget, { passive: true });
  window.addEventListener('wheel', updateScrollTarget, { passive: true });
  window.addEventListener('touchmove', updateScrollTarget, { passive: true });
  window.addEventListener('resize', resizeCanvas, { passive: true });

  // Initialization
  function init() {
    resizeCanvas();
    preloadImages();
    updateScrollTarget();
    requestAnimationFrame(animationLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
