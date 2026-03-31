(function () {
  'use strict';

  if (window.__speedUpLoaded) return;
  window.__speedUpLoaded = true;

  const STEP = 0.25;
  const MIN_SPEED = 0.1;
  const MAX_SPEED = 16;
  const MIN_SIZE = 80;

  const tracked = new WeakSet();

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function fmt(v) {
    return v.toFixed(2) + 'x';
  }

  function makeController(video) {
    if (tracked.has(video)) return;
    if (!video.parentNode) return;
    tracked.add(video);

    const wrap = document.createElement('div');
    wrap.className = 'su-wrap';
    wrap.innerHTML =
      '<button class="su-btn su-minus" title="Slow down (,)">−</button>' +
      '<span class="su-val" title="Reset (R)">1.00x</span>' +
      '<button class="su-btn su-plus" title="Speed up (.)">+</button>';

    document.body.appendChild(wrap);

    const valEl = wrap.querySelector('.su-val');

    function setSpeed(speed) {
      speed = clamp(Math.round(speed * 100) / 100, MIN_SPEED, MAX_SPEED);
      video.playbackRate = speed;
      valEl.textContent = fmt(speed);
    }

    wrap.querySelector('.su-minus').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      setSpeed(video.playbackRate - STEP);
    });

    wrap.querySelector('.su-plus').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      setSpeed(video.playbackRate + STEP);
    });

    valEl.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      setSpeed(1);
    });

    // Sync with external speed changes
    video.addEventListener('ratechange', () => {
      valEl.textContent = fmt(video.playbackRate);
    });

    // Keyboard shortcuts — active when hovering
    let hovered = false;
    const onEnter = () => { hovered = true; };
    const onLeave = () => { hovered = false; };
    video.addEventListener('mouseenter', onEnter);
    video.addEventListener('mouseleave', onLeave);
    wrap.addEventListener('mouseenter', onEnter);
    wrap.addEventListener('mouseleave', onLeave);

    document.addEventListener('keydown', (e) => {
      if (!hovered) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if (e.key === ',' || e.key === '<') { e.preventDefault(); setSpeed(video.playbackRate - STEP); }
      if (e.key === '.' || e.key === '>') { e.preventDefault(); setSpeed(video.playbackRate + STEP); }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); setSpeed(1); }
    });

    //Positioning
    let rafId = null;

    function updatePos() {
      rafId = null;

      if (!document.contains(video)) {
        wrap.remove();
        ro.disconnect();
        return;
      }

      const r = video.getBoundingClientRect();

      if (r.width < MIN_SIZE || r.height < MIN_SIZE) {
        wrap.style.visibility = 'hidden';
        return;
      }

      wrap.style.visibility = '';
      wrap.style.transform = `translate(${r.left + 8}px, ${r.top + 8}px)`;
    }

    function scheduleUpdate() {
      if (rafId) return;
      rafId = requestAnimationFrame(updatePos);
    }

    updatePos();

    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(video);
    ro.observe(document.documentElement);

    window.addEventListener('scroll', scheduleUpdate, { passive: true, capture: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
  }

  // Search for videos

  function scanVideos() {
    document.querySelectorAll('video').forEach(makeController);
  }

  scanVideos();

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === 'VIDEO') {
          makeController(node);
        } else {
          node.querySelectorAll('video').forEach(makeController);
        }
      }
    }
  });

  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
