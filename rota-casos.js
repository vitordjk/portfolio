/* Rota dos casos: paradas com hover, resumo animado e casos completos por etapas.
   Sem dependências. Carregar com <script src="rota-casos.js" defer></script>.
   Sem JS, tudo fica visível em sequência (resumos e casos completos). */
(function () {
  var root = document.querySelector('.rt');
  if (!root) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, el) { return (el || root).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || root).querySelectorAll(sel)); };

  var scene = $('.rt-scene-in');
  var stops = $$('[data-rt-stop]');
  var sums = $$('[data-rt-sum]');
  var intro = $('[data-rt-intro]');
  var cases = $$('[data-rt-case]');
  var dots = $$('.rt-dots i');
  var seenTxt = $('[data-rt-seen]');
  var seen = [false, false, false, false];
  var active = -1;
  var openIdx = -1;
  var stepIdx = [0, 0, 0, 0];
  var frames = [];

  /* ---------- contadores ---------- */
  function fmt(n, dec) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function write(el, v) { el.textContent = (el.dataset.prefix || '') + fmt(v, parseInt(el.dataset.dec || '0', 10)) + (el.dataset.suffix || ''); }
  function count(scope) {
    $$('[data-count]', scope).forEach(function (el) {
      var to = parseFloat(el.dataset.count), from = parseFloat(el.dataset.from || '0');
      if (reduce) { write(el, to); return; }
      var dur = parseInt(el.dataset.dur || '1100', 10), start = null;
      write(el, from);
      function step(now) {
        if (start === null) start = now;
        var x = Math.min(1, (now - start) / dur);
        write(el, from + (to - from) * (1 - Math.pow(1 - x, 3)));
        if (x < 1) frames.push(requestAnimationFrame(step));
      }
      frames.push(requestAnimationFrame(step));
    });
  }
  function replay(el) {
    el.classList.remove('rt-on');
    void el.offsetWidth;
    el.classList.add('rt-on');
    count(el);
  }

  /* ---------- paradas ---------- */
  function paintStops() {
    var next = seen.indexOf(false);
    stops.forEach(function (s, i) {
      s.classList.toggle('is-on', i === active);
      s.classList.toggle('is-seen', seen[i]);
      s.classList.toggle('is-next', i === next && i !== active);
    });
    dots.forEach(function (d, i) { d.classList.toggle('is-on', i === active); d.classList.toggle('is-seen', seen[i]); });
    var n = seen.filter(Boolean).length;
    seenTxt.textContent = n + ' de 4 paradas vistas';
    if (active >= 0) scene.setAttribute('data-active', ''); else scene.removeAttribute('data-active');
  }
  function setStop(i) {
    if (i === active) return;
    active = i;
    seen[i] = true;
    intro.hidden = true;
    sums.forEach(function (s, k) { s.hidden = k !== i; });
    paintStops();
    replay(sums[i]);
  }

  stops.forEach(function (s, i) {
    s.addEventListener('mouseenter', function () { setStop(i); });
    var b = $('.rt-hot', s);
    b.addEventListener('focus', function () { setStop(i); });
    b.addEventListener('click', function () { setStop(i); });
  });
  $$('[data-rt-go]').forEach(function (b) {
    b.addEventListener('click', function () { setStop(parseInt(b.dataset.rtGo, 10)); $('.rt-scene').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }); });
  });

  /* ---------- casos completos ---------- */
  function showStep(ci, si) {
    var c = cases[ci];
    var tabs = $$('[data-rt-tab]', c), steps = $$('[data-rt-step]', c);
    stepIdx[ci] = si;
    tabs.forEach(function (t, k) {
      t.setAttribute('aria-selected', k === si ? 'true' : 'false');
      t.tabIndex = k === si ? 0 : -1;
    });
    steps.forEach(function (s, k) { s.hidden = k !== si; });
    replay(steps[si]);
    var prev = $('[data-rt-prev]', c), next = $('[data-rt-next]', c);
    prev.disabled = si === 0;
    var last = si === steps.length - 1;
    next.textContent = last ? (ci === 3 ? 'Voltar à rota' : 'Próximo caso') : 'Próxima etapa';
  }
  function openCase(i, opts) {
    openIdx = i;
    cases.forEach(function (c, k) { c.hidden = k !== i; });
    setStop(i);
    showStep(i, 0);
    count($('.rt-case-head', cases[i]));
    if (history.replaceState) history.replaceState(null, '', '#caso-0' + (i + 1));
    if (!opts || !opts.noScroll) cases[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    var first = $('[data-rt-tab]', cases[i]);
    if (first && (!opts || !opts.noFocus)) first.focus({ preventScroll: true });
  }
  function closeCase() {
    if (openIdx < 0) return;
    cases[openIdx].hidden = true;
    var back = stops[openIdx] && $('.rt-hot', stops[openIdx]);
    openIdx = -1;
    if (history.replaceState) history.replaceState(null, '', '#casos');
    $('.rt-scene').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    if (back) back.focus({ preventScroll: true });
  }

  $$('[data-rt-open]').forEach(function (b) { b.addEventListener('click', function () { openCase(parseInt(b.dataset.rtOpen, 10)); }); });
  $$('[data-rt-close]').forEach(function (b) { b.addEventListener('click', closeCase); });

  cases.forEach(function (c, ci) {
    var tabs = $$('[data-rt-tab]', c);
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { showStep(ci, k); });
      t.addEventListener('keydown', function (ev) {
        var d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        ev.preventDefault();
        var n = (k + d + tabs.length) % tabs.length;
        showStep(ci, n); tabs[n].focus();
      });
    });
    $('[data-rt-prev]', c).addEventListener('click', function () { if (stepIdx[ci] > 0) showStep(ci, stepIdx[ci] - 1); });
    $('[data-rt-next]', c).addEventListener('click', function () {
      var total = tabs.length;
      if (stepIdx[ci] < total - 1) showStep(ci, stepIdx[ci] + 1);
      else if (ci < 3) openCase(ci + 1);
      else closeCase();
    });
    // pipeline do caso 04: acende até a etapa atual
    $$('.rt-pipe', c).forEach(function (p) {
      var on = parseInt(p.dataset.on || '-1', 10);
      $$('span', p).forEach(function (s, k) { s.classList.toggle('is-done', k < on); s.classList.toggle('is-now', k === on); });
    });
  });

  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && openIdx >= 0) closeCase(); });

  /* ---------- estado inicial ---------- */
  root.classList.add('rt-js');
  sums.concat($$('[data-rt-step]')).forEach(function (el) { el.classList.add('rt-anim'); });
  sums.forEach(function (s) { s.hidden = true; });
  cases.forEach(function (c) { c.hidden = true; });
  intro.hidden = false;
  paintStops();

  // links diretos: .../#caso-02 abre o caso 02
  var m = /^#caso-0([1-4])$/.exec(location.hash);
  if (m) openCase(parseInt(m[1], 10) - 1, { noFocus: true });
  window.addEventListener('hashchange', function () {
    var h = /^#caso-0([1-4])$/.exec(location.hash);
    if (h) openCase(parseInt(h[1], 10) - 1);
  });
})();
