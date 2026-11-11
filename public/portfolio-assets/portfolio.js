toolsTrack = [{"id":"1","name":"Workflow Automator","duration":2.4},{"id":"2","name":"Ticketing System","duration":3.59},{"id":"3","name":"Funnel Builder","duration":7},{"id":"4","name":"AI Agent","duration":4.79},{"id":"5","name":"KapeAI Bot","duration":2.4},{"id":"6","name":"Ticketing System","duration":3.59},{"id":"7","name":"Funnel Builder","duration":7},{"id":"8","name":"AI Agent","duration":4.79},{"id":"9","name":"KapeAI Bot","duration":2.4},{"id":"10","name":"Workflow Automator","duration":3.59},{"id":"11","name":"Funnel Builder","duration":7},{"id":"12","name":"AI Agent","duration":4.79}]
;
/* all other scripts preserved verbatim */
;

/* ===== Accessibility widget logic (ported from live bundle) ===== */
(function () {
  'use strict';

  var STORAGE_KEY = 'kv-a11y';
  var EVENT_NAME = 'a11ychange';
  var OPEN_EVENT = 'a11y:open';
  var DEFAULTS = { text: 'md', contrast: false, motion: false, links: false };

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      var parsed = JSON.parse(raw);
      return {
        text: (parsed.text === 'lg' || parsed.text === 'xl') ? parsed.text : 'md',
        contrast: !!parsed.contrast,
        motion: !!parsed.motion,
        links: !!parsed.links
      };
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function applyState(state) {
    var ds = document.documentElement.dataset;
    if (state.text === 'md') delete ds.a11yText; else ds.a11yText = state.text;
    if (state.contrast) ds.a11yContrast = 'true'; else delete ds.a11yContrast;
    if (state.motion) ds.a11yMotion = 'true'; else delete ds.a11yMotion;
    if (state.links) ds.a11yLinks = 'true'; else delete ds.a11yLinks;
  }

  function saveState(state) {
    applyState(state);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: state }));
  }

  // Apply persisted state on load
  applyState(loadState());

  var widget = document.querySelector('.a11y');
  if (!widget) return;

  var panel = widget.querySelector('.a11y__panel');
  var button = widget.querySelector('.a11y__button');
  var closeBtn = widget.querySelector('.a11y__close');
  var resetBtn = widget.querySelector('.a11y__reset');
  var sizeBtns = Array.prototype.slice.call(widget.querySelectorAll('.a11y__size'));
  var switchBtns = Array.prototype.slice.call(widget.querySelectorAll('.a11y__switch'));

  var state = loadState();
  var isOpen = false;
  var lastFocus = null;

  function hasChanges() {
    return state.text !== 'md' || state.contrast || state.motion || state.links;
  }

  function render() {
    widget.classList.toggle('is-open', isOpen);
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if ('inert' in panel) panel.inert = !isOpen;
    else panel.setAttribute('inert', isOpen ? '' : '');

    sizeBtns.forEach(function (btn) {
      var on = state.text === btn.getAttribute('data-value');
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    switchBtns.forEach(function (btn) {
      var on = !!state[btn.getAttribute('data-key')];
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    resetBtn.disabled = !hasChanges();
  }

  function open(trigger) {
    lastFocus = trigger || document.activeElement;
    isOpen = true;
    render();
    if (panel.focus) panel.focus();
  }

  function close(reason) {
    isOpen = false;
    render();
    if (reason !== 'outside' && lastFocus && lastFocus.isConnected && lastFocus.focus) {
      lastFocus.focus();
    }
  }

  button.addEventListener('click', function () {
    if (isOpen) close('button'); else open();
  });

  closeBtn.addEventListener('click', function () { close('button'); });

  resetBtn.addEventListener('click', function () {
    state = Object.assign({}, DEFAULTS);
    saveState(state);
    render();
  });

  sizeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state = Object.assign({}, state, { text: btn.getAttribute('data-value') });
      saveState(state);
      render();
    });
  });

  switchBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-key');
      var next = Object.assign({}, state);
      next[key] = !next[key];
      state = next;
      saveState(state);
      render();
    });
  });

  document.addEventListener('pointerdown', function (e) {
    if (isOpen && !widget.contains(e.target)) close('outside');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) close('escape');
  });

  window.addEventListener(OPEN_EVENT, function (e) {
    open(e.detail);
  });

  render();
})();


;

/* ===== Theme toggle logic (ported from live bundle) ===== */
(function () {
  'use strict';

  var STORAGE_KEY = 'kv-theme';

  function getTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function setTheme(theme) {
    var root = document.documentElement;
    root.dataset.theme = theme;
    var cream = getComputedStyle(root).getPropertyValue('--cream').trim();
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', cream);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  }

  function toggleTheme(el) {
    var next = getTheme() === 'dark' ? 'light' : 'dark';
    var rect = el ? el.getBoundingClientRect() : null;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.a11yMotion === 'true';

    if (!document.startViewTransition || reduceMotion || getTheme() === next) {
      setTheme(next);
      return;
    }

    var x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    var y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    var root = document.documentElement;
    root.style.setProperty('--sweep-x', x + 'px');
    root.style.setProperty('--sweep-y', y + 'px');
    root.style.setProperty('--sweep-r', radius + 'px');
    root.dataset.themeSweep = 'on';

    document.startViewTransition(function () { setTheme(next); }).finished.finally(function () {
      delete root.dataset.themeSweep;
    });
  }

  /* ---- init (runs first, before paint) ---- */
  (function () {
    var phone = window.matchMedia('(max-width: 1099px)').matches;
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    document.documentElement.dataset.theme =
      saved === 'dark' || saved === 'light' ? saved : phone ? 'dark' : 'light';
    if (document.documentElement.dataset.theme === 'dark') {
      var bar = document.querySelector('meta[name="theme-color"]');
      if (bar) bar.setAttribute('content', '#070B14');
    }
  })();

  /* ---- button ---- */
  var btn = document.querySelector('.theme-fab');
  if (!btn) return;

  function render() {
    var theme = getTheme();
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    var icon = btn.querySelector('.tg');
    if (icon) icon.setAttribute('data-theme', theme);
  }

  btn.addEventListener('click', function () {
    toggleTheme(btn);
    render();
  });

  window.addEventListener('themechange', render);
  render();
})();


;

/* Automation Workflow — dot flow animation + flow scaling.
   Ported from the live site's ServicesView chunk (GSAP motionPath → vanilla rAF).
   Matches: 11 cables ↔ 11 signal circles, duration clamp(2.4, P/95, 7)s,
   delay -(i%6)*0.42s, flow-scale = min(w/1000, h/388, 1). */
(function () {
  'use strict';

  var ap = document.querySelector('.autopilot');
  if (!ap) return;

  var flow = ap.querySelector('.autopilot__flow');
  var fit = ap.querySelector('.autopilot__fit');
  var cables = ap.querySelector('.autopilot__cables');
  var signals = ap.querySelector('.autopilot__signals');
  if (!flow || !fit || !cables || !signals) return;

  var paths = Array.prototype.slice.call(cables.querySelectorAll('path'));
  var circles = Array.prototype.slice.call(signals.querySelectorAll('circle'));
  if (!paths.length || !circles.length) return;

  var DESIGN_W = 1000;
  var DESIGN_H = 388;
  var MAX_SCALE = 1;

  /* ---------- flow scaling ---------- */
  function applyScale() {
    var w = fit.clientWidth;
    var h = fit.clientHeight;
    if (!w || !h) return;
    var s = Math.min(w / DESIGN_W, h / DESIGN_H, MAX_SCALE);
    flow.style.setProperty('--flow-scale', String(s > 0 ? s : 1));
  }

  applyScale();

  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () { applyScale(); });
    ro.observe(fit);
  } else {
    window.addEventListener('resize', applyScale);
  }

  /* ---------- dot flow ---------- */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var a11yReduce = document.documentElement.getAttribute('data-a11y-motion') === 'true';
  if (reduced || a11yReduce) return;

  var rafId = null;
  var start = null;
  var tickCount = 0;

  function tick(now) {
    if (start === null) start = now;
    var elapsed = (now - start) / 1000;
    var n = Math.min(circles.length, paths.length);
    for (var i = 0; i < n; i++) {
      var path = paths[i];
      var circle = circles[i];
      var len = path.getTotalLength();
      var duration = Math.min(7, Math.max(2.4, len / 95));
      var delay = -((i % 6) * 0.42);
      var t = (((elapsed + delay) % duration) + duration) % duration / duration;
      var pt = path.getPointAtLength(t * len);
      circle.setAttribute('transform', 'translate(' + pt.x + ',' + pt.y + ')');
    }
    tickCount++;
    rafId = requestAnimationFrame(tick);
  }

  function startAnim() {
    if (rafId === null) {
      start = null;
      rafId = requestAnimationFrame(tick);
    }
  }

  function stopAnim() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible) startAnim(); else stopAnim();
    }, { threshold: 0 });
    io.observe(ap);
  } else {
    startAnim();
  }
})();
