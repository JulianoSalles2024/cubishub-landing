/* Movimento da página, sem biblioteca:
   1) rolagem com inércia (a página "desliza" em vez de saltar a cada giro do mouse);
   2) blocos entram ao rolar, em sequência;
   3) as telas das soluções andam um pouco mais devagar que a página (profundidade).
   Respeita "reduzir movimento" e não mexe na rolagem de toque (celular), que já é nativa. */
(function () {
  'use strict';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* ---------- 1) rolagem com inércia ---------- */
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (!reduced && !coarse) {
    root.classList.add('smooth-js');
    var target = window.pageYOffset, current = target, raf = 0, EASE = 0.09;
    var limit = function () { return Math.max(0, root.scrollHeight - window.innerHeight); };
    var clamp = function (v) { return Math.max(0, Math.min(limit(), v)); };
    var step = function () {
      var diff = target - current;
      if (Math.abs(diff) < 0.5) { current = target; window.scrollTo(0, current); raf = 0; return; }
      current += diff * EASE;
      window.scrollTo(0, current);
      raf = requestAnimationFrame(step);
    };
    var go = function (y) { target = clamp(y); if (!raf) raf = requestAnimationFrame(step); };
    // elemento com rolagem própria (lista, modal): deixa o navegador cuidar
    var ownScroll = function (el) {
      while (el && el !== document.body && el.nodeType === 1) {
        var oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
        el = el.parentNode;
      }
      return false;
    };
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.defaultPrevented) return;
      if (getComputedStyle(document.body).overflow === 'hidden' || document.querySelector('.lead-overlay.open')) return;
      if (ownScroll(e.target)) return;
      var dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 32; else if (e.deltaMode === 2) dy *= window.innerHeight;
      e.preventDefault();
      go((raf ? target : window.pageYOffset) + dy);
    }, { passive: false });
    // rolagem vinda de fora (barra lateral, teclado, scrollTo de outro script): acompanha
    window.addEventListener('scroll', function () {
      if (Math.abs(window.pageYOffset - current) > 2) { target = current = window.pageYOffset; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    }, { passive: true });
    // âncoras (#secao) deslizam em vez de pular
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.hasAttribute('data-slug') || a.hasAttribute('data-go')) return;
      var id = a.getAttribute('href').slice(1);
      var el = id && document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      if (history.replaceState) history.replaceState(null, '', '#' + id);
      go(el.getBoundingClientRect().top + window.pageYOffset - 72);
    });
  }

  /* ---------- 2) entrada dos blocos ---------- */
  var AUTO = [
    'section:not(#planos) > .wrap > :not(.reveal):not(.sg-body):not(script):not(style)',
    '.sg-head', '.sg-body .ftext', '.sg-body .fart', '.sg-cta', '.sg-more', '.sg-auto', '.auto-rail > li'
  ].join(',');
  var els = Array.prototype.slice.call(document.querySelectorAll(AUTO));
  els.forEach(function (e) { e.classList.add('reveal'); });
  var all = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  // atraso em sequência entre irmãos (no máximo 5 degraus)
  var seen = new Map();
  all.forEach(function (e) {
    var p = e.parentNode, n = seen.get(p) || 0;
    seen.set(p, n + 1);
    e.style.setProperty('--rd', Math.min(n, 5) * 0.08 + 's');
  });
  var settle = function (e) {
    var t = parseFloat(getComputedStyle(e).transitionDuration) || 0.9;
    setTimeout(function () { e.classList.add('done'); }, (t + 0.5) * 1000);
  };
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        settle(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -6% 0px' });
    all.forEach(function (e) { io.observe(e); });
  } else {
    all.forEach(function (e) { e.classList.add('in', 'done'); });
  }

  /* ---------- 3) profundidade nas telas das soluções ---------- */
  var arts = Array.prototype.slice.call(document.querySelectorAll('.fart-in'));
  if (arts.length && !reduced) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      arts.forEach(function (a) {
        var r = a.parentNode.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80 || r.height === 0) return;
        var d = (r.top + r.height / 2 - vh / 2) / vh;           // -1 (acima) .. 1 (abaixo)
        var y = Math.max(-16, Math.min(16, d * -22));
        a.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
      });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
})();
