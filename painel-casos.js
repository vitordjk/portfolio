/* Painel de casos ("O que mudou"): contadores, barras e filtro.
   Sem dependências. Carregar com <script src="painel-casos.js" defer></script>. */
(function () {
  var section = document.querySelector('.pc');
  if (!section) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var counters = Array.prototype.slice.call(section.querySelectorAll('[data-count]'));
  var frames = [];

  function fmt(n, dec) {
    return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function text(el, v) {
    var dec = parseInt(el.dataset.dec || '0', 10);
    el.textContent = (el.dataset.prefix || '') + fmt(v, dec) + (el.dataset.suffix || '');
  }
  function ease(x) { return 1 - Math.pow(1 - x, 3); }

  function resetCounters() {
    frames.forEach(cancelAnimationFrame);
    frames = [];
    counters.forEach(function (el) { text(el, parseFloat(el.dataset.from || '0')); });
  }

  function runCounters() {
    counters.forEach(function (el) {
      var from = parseFloat(el.dataset.from || '0');
      var to = parseFloat(el.dataset.count);
      var delay = parseInt(el.dataset.delay || '0', 10);
      var dur = parseInt(el.dataset.dur || '1100', 10);
      var start = null;
      function step(now) {
        if (start === null) start = now + delay;
        var x = Math.max(0, Math.min(1, (now - start) / dur));
        text(el, from + (to - from) * ease(x));
        if (x < 1) frames.push(requestAnimationFrame(step));
      }
      frames.push(requestAnimationFrame(step));
    });
  }

  function play() {
    section.classList.remove('pc-on');
    resetCounters();
    void section.offsetWidth; // reinicia as transições
    section.classList.add('pc-on');
    runCounters();
  }

  // Filtro por caso
  var grid = section.querySelector('.pc-grid');
  section.querySelectorAll('[data-pc-focus]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      grid.setAttribute('data-focus', chip.dataset.pcFocus);
      section.querySelectorAll('[data-pc-focus]').forEach(function (c) {
        c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
      });
    });
  });

  // Sem animação: deixa tudo no valor final e só mantém o filtro
  if (reduce) {
    var replayBtn = section.querySelector('[data-pc-replay]');
    if (replayBtn) replayBtn.hidden = true;
    return;
  }

  section.classList.add('pc-js');
  resetCounters();

  section.querySelector('[data-pc-replay]').addEventListener('click', play);

  // Anima quando o topo do painel passa de 80% da altura da tela (uma vez).
  // Limiar por área não serve: o painel tem várias telas de altura e, no
  // celular, 25% dele nunca cabe na tela ao mesmo tempo.
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { play(); io.disconnect(); }
    }, { threshold: 0, rootMargin: '0px 0px -20% 0px' });
    io.observe(section.querySelector('.pc-panel'));
  } else {
    play();
  }
})();
