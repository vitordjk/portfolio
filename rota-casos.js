/* Rota dos casos: paradas com hover, resumo animado e casos completos por etapas.
   Sem dependências. Carregar com <script src="rota-casos.js" defer></script>.
   Sem JS, tudo fica visível em sequência (resumos e casos completos).
   O número de paradas e de casos vem do HTML; cada caso diz a que parada
   pertence em data-rt-parada. Qualquer [data-rt-go] da página abre uma parada. */
(function () {
  var root = document.querySelector('.rt');
  if (!root) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, el) { return (el || root).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || root).querySelectorAll(sel)); };

  var scene = $('.rt-scene-in');
  var fill = $('.rt-route-fill');
  var stops = $$('[data-rt-stop]');
  var sums = $$('[data-rt-sum]');
  var intro = $('[data-rt-intro]');
  var cases = $$('[data-rt-case]');
  var dots = $$('.rt-dots i');
  var seenTxt = $('[data-rt-seen]');
  var total = stops.length;
  var seen = stops.map(function () { return false; });
  var active = -1;
  var openIdx = -1;
  var stepIdx = cases.map(function () { return 0; });
  var caseStop = cases.map(function (c, k) { return parseInt(c.dataset.rtParada || String(k), 10); });

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
        if (x < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
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
    seenTxt.textContent = n + ' de ' + total + ' paradas vistas';
    // a trilha acende até a parada mais adiante já vista
    var far = seen.lastIndexOf(true);
    if (fill) fill.style.setProperty('--fill', (far <= 0 ? 0 : far / (total - 1) * 100) + '%');
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
  function goStop(i) {
    setStop(i);
    $('.rt-scene').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  stops.forEach(function (s, i) {
    s.addEventListener('mouseenter', function () { setStop(i); });
    var b = $('.rt-hot', s);
    b.addEventListener('focus', function () { setStop(i); });
    b.addEventListener('click', function () { setStop(i); });
  });
  // vale para a faixa de destaques, fora da seção
  Array.prototype.slice.call(document.querySelectorAll('[data-rt-go]')).forEach(function (b) {
    b.addEventListener('click', function (ev) {
      ev.preventDefault();
      if (openIdx >= 0) closeCase(true);
      goStop(parseInt(b.dataset.rtGo, 10));
    });
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
    next.textContent = last ? (ci === cases.length - 1 ? 'Voltar às paradas' : 'Próximo caso') : 'Próxima etapa';
  }
  function openCase(i, opts) {
    openIdx = i;
    cases.forEach(function (c, k) { c.hidden = k !== i; });
    setStop(caseStop[i]);
    showStep(i, 0);
    count($('.rt-case-head', cases[i]));
    if (history.replaceState) history.replaceState(null, '', '#' + cases[i].id);
    if (!opts || !opts.noScroll) cases[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    var first = $('[data-rt-tab]', cases[i]);
    if (first && (!opts || !opts.noFocus)) first.focus({ preventScroll: true });
  }
  function closeCase(quiet) {
    if (openIdx < 0) return;
    cases[openIdx].hidden = true;
    var back = stops[caseStop[openIdx]] && $('.rt-hot', stops[caseStop[openIdx]]);
    openIdx = -1;
    if (history.replaceState) history.replaceState(null, '', '#casos');
    if (quiet) return;
    $('.rt-scene').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    if (back) back.focus({ preventScroll: true });
  }

  $$('[data-rt-open]').forEach(function (b) { b.addEventListener('click', function () { openCase(parseInt(b.dataset.rtOpen, 10)); }); });
  $$('[data-rt-close]').forEach(function (b) { b.addEventListener('click', function () { closeCase(); }); });

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
      if (stepIdx[ci] < tabs.length - 1) showStep(ci, stepIdx[ci] + 1);
      else if (ci < cases.length - 1) openCase(ci + 1);
      else closeCase();
    });
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

  // links diretos: .../#caso-02 abre o caso da parada 2
  function fromHash(h, opts) {
    var k = cases.findIndex(function (c) { return '#' + c.id === h; });
    if (k >= 0) openCase(k, opts);
  }
  fromHash(location.hash, { noFocus: true });
  window.addEventListener('hashchange', function () { fromHash(location.hash); });
})();
