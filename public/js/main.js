/* ============================================================================
   PREY: THE ESCAPE — site behaviour
   Vanilla JS, progressive enhancement. Every link, section and the APK download
   work without JavaScript. Nothing autoplays audio or video.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var doc = document;

  function hasFx() { return root.getAttribute('data-fx') !== 'off'; }
  function hasReducedMotion() { return reduceMotion.matches; }
  function scrollY() {
    return window.pageYOffset || doc.documentElement.scrollTop || 0;
  }

  /* ============================ PRELOAD ============================ */
  var preload = doc.getElementById('preload');
  var typeEl = doc.querySelector('.preload__type');
  var lines = [
    'PREY: THE ESCAPE',
    'v1.0.6 — ANDROID',
    'SHIVA × WEBLOOM',
    'INITIALISING THE NIGHT…',
    'Scanning the district…',
    'Finding a way out…',
    'Escape route: located.',
    'It is not as long as it looks.',
    '',
    'Press SPACE or click anywhere to continue.',
    'Or wait — the gates will open on their own.',
  ];
  var idx = 0;
  var timer = null;
  var done = false;

  function typeStep() {
    if (done) return;
    if (typeEl) typeEl.textContent = lines.slice(0, idx + 1).join('\n');
    idx++;
    if (idx >= lines.length) {
      done = true;
      setTimeout(function () { hidePreload(); }, 800);
      return;
    }
    timer = setTimeout(typeStep, 60 + Math.random() * 40);
  }

  var preloadClickHandler = null;

  function hidePreload() {
    if (!preload) return;
    /* Remove the skip controls in every exit path — auto-hide, SPACE, ENTER
       and click. Otherwise a stale keydown listener would keep swallowing
       the spacebar after the intro has already gone. */
    doc.removeEventListener('keydown', onPreloadKey);
    if (preloadClickHandler) {
      doc.removeEventListener('click', preloadClickHandler);
      preloadClickHandler = null;
    }
    preload.style.transition = 'opacity .8s ease';
    preload.style.opacity = '0';
    setTimeout(function () {
      if (preload) preload.style.display = 'none';
      if (doc.body) doc.body.classList.remove('is-locked');
    }, 800);
  }

  function onPreloadKey(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      hidePreload();
    }
  }

  function startPreload() {
    typeStep();
    doc.addEventListener('keydown', onPreloadKey);
    preloadClickHandler = function () { hidePreload(); };
    doc.addEventListener('click', preloadClickHandler);
  }

  if (preload && typeEl && !hasReducedMotion()) {
    if (doc.body) doc.body.classList.add('is-locked');
    startPreload();
  } else if (preload && typeEl) {
    typeEl.textContent = lines.join('\n');
    setTimeout(function () { hidePreload(); }, 1200);
  }

  /* ============================ PAGE LOCK ============================ */
  function releaseLock() {
    if (doc.body) doc.body.classList.remove('is-locked');
  }
  if (!preload) releaseLock();

  /* ============================ REDUCED MOTION ============================ */
  if (hasReducedMotion()) root.setAttribute('data-fx', 'off');

  /* ============================ SCROLLSPY ============================ */
  var nav = doc.getElementById('nav');
  var navLinks = [];
  if (nav) {
    var links = nav.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      if (href.charAt(0) === '#') navLinks.push({ el: links[i], id: href.slice(1) });
    }
  }

  function updateSpy() {
    if (!navLinks.length) return;
    var sections = [];
    for (var j = 0; j < navLinks.length; j++) {
      var sec = doc.getElementById(navLinks[j].id);
      if (sec) sections.push({ id: navLinks[j].id, el: sec, anchor: navLinks[j].el });
    }
    if (!sections.length) return;
    var offset = 130;
    var current = sections[0].id;
    for (var k = 0; k < sections.length; k++) {
      var rect = sections[k].el.getBoundingClientRect();
      if (rect.top - offset <= 0) current = sections[k].id;
    }
    for (var m = 0; m < navLinks.length; m++) {
      var active = navLinks[m].id === current;
      if (active !== navLinks[m].el.classList.contains('is-active')) {
        navLinks[m].el.classList.toggle('is-active', active);
      }
    }
  }
  if (nav) {
    window.addEventListener('scroll', updateSpy, { passive: true });
    window.addEventListener('resize', updateSpy);
    updateSpy();
  }

  /* ============================ SCROLL REVEALS ============================ */
  /* The .has-reveal class is added only when the API exists, so a browser
     without IntersectionObserver (or with JS disabled) still sees every
     chapter. Reduced-motion visitors skip the effect entirely. */
  var revealEls = doc.querySelectorAll('.reveal');
  if (revealEls.length) {
    if ('IntersectionObserver' in window && !hasReducedMotion()) {
      root.classList.add('has-reveal');
      var revealObserver = new IntersectionObserver(function (entries) {
        for (var r = 0; r < entries.length; r++) {
          if (entries[r].isIntersecting) {
            entries[r].target.classList.add('is-visible');
            revealObserver.unobserve(entries[r].target);
          }
        }
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

      for (var rv = 0; rv < revealEls.length; rv++) {
        revealObserver.observe(revealEls[rv]);
      }
    } else {
      for (var rv2 = 0; rv2 < revealEls.length; rv2++) {
        revealEls[rv2].classList.add('is-visible');
      }
    }
  }

  /* ============================ MOBILE NAV ============================ */
  var burger = doc.getElementById('burger');
  var navScrim = doc.getElementById('navScrim');

  function closeMobileNav() {
    if (burger) burger.setAttribute('aria-expanded', 'false');
    if (nav) nav.classList.remove('is-open');
    if (navScrim) { navScrim.hidden = true; doc.body.classList.remove('is-locked'); }
  }
  function openMobileNav() {
    if (burger) burger.setAttribute('aria-expanded', 'true');
    if (nav) nav.classList.add('is-open');
    if (navScrim) {
      navScrim.hidden = false;
      doc.body.classList.add('is-locked');
    }
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var exp = burger.getAttribute('aria-expanded') === 'true';
      if (exp) closeMobileNav(); else openMobileNav();
    });
  }
  if (navScrim) navScrim.addEventListener('click', closeMobileNav);
  if (nav) {
    nav.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (!link) return;
      var href = link.getAttribute('href');
      if (href && href.charAt(0) === '#' && nav.classList.contains('is-open')) {
        closeMobileNav();
      }
    });
  }
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) closeMobileNav();
  });

  /* ============================ SMOOTH SCROLL ============================ */
  doc.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    if (!href || href.charAt(0) !== '#') return;
    var target = doc.getElementById(href.slice(1));
    if (!target) return;
    e.preventDefault();
    var top = target.getBoundingClientRect().top + scrollY() - 70;
    window.scrollTo({ top: top, behavior: hasReducedMotion() ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', href);
  });

  /* ============================ FX / SOUND TOGGLE ============================ */
  var fxToggle = doc.getElementById('fxToggle');

  function syncFxChip() {
    if (!fxToggle) return;
    var on = hasFx();
    fxToggle.setAttribute('aria-pressed', String(on));
    root.setAttribute('data-crt', on ? 'on' : 'off');
  }

  if (fxToggle) {
    fxToggle.addEventListener('click', function () {
      var on = hasFx();
      root.setAttribute('data-fx', on ? 'off' : 'on');
      syncFxChip();
    });
    syncFxChip();
  }

  var soundToggle = doc.getElementById('soundToggle');
  var audioEl = null;
  var soundStarted = false;

  function ensureAudio() {
    if (audioEl) return audioEl;
    try {
      audioEl = doc.createElement('audio');
      audioEl.setAttribute('preload', 'none');
      audioEl.setAttribute('playsinline', '');
      audioEl.style.display = 'none';
      doc.body.appendChild(audioEl);
    } catch (e) { audioEl = null; }
    return audioEl;
  }

  function syncSoundChip() {
    if (!soundToggle) return;
    var on = root.getAttribute('data-sound') === 'on';
    soundToggle.setAttribute('aria-pressed', String(on));
  }

  if (soundToggle) {
    soundToggle.addEventListener('click', function () {
      var wantedOn = root.getAttribute('data-sound') !== 'on';
      if (wantedOn) {
        var a = ensureAudio();
        if (a) {
          a.volume = 0.45;
          var p = a.play();
          if (p !== undefined) p.catch(function () {});
          soundStarted = true;
        }
        root.setAttribute('data-sound', 'on');
      } else {
        if (audioEl) audioEl.pause();
        root.removeAttribute('data-sound');
      }
      syncSoundChip();
    });
    syncSoundChip();
  }

  /* ============================ CURSOR GLOW ============================ */
  var cursorGlow = doc.getElementById('cursorGlow');
  if (cursorGlow) {
    function shouldGlow() {
      return hasFx() && !hasReducedMotion() &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    }
    function showGlow() {
      if (shouldGlow()) cursorGlow.classList.add('is-on');
    }
    function hideGlow() { cursorGlow.classList.remove('is-on'); }
    doc.addEventListener('mousemove', function (e) {
      cursorGlow.style.transform = 'translate(' + e.clientX + 'px, ' + e.clientY + 'px)';
      showGlow();
    }, { passive: true });
    showGlow();
    window.addEventListener('blur', hideGlow);
  }

  /* ============================ LIGHTBOX ============================ */
  var gallery = doc.getElementById('gallery');
  var lightbox = doc.getElementById('lightbox');
  var lbImg = doc.getElementById('lightboxImg');
  var lbCap = doc.getElementById('lightboxCap');
  var lbPrev = doc.getElementById('lbPrev');
  var lbNext = doc.getElementById('lbNext');
  var lbClose = doc.getElementById('lbClose');

  var items = [];
  if (gallery) {
    var shots = gallery.querySelectorAll('.shot');
    for (var s = 0; s < shots.length; s++) {
      items.push({
        src: shots[s].getAttribute('data-full') || '',
        caption: shots[s].getAttribute('data-caption') || ''
      });
    }
  }

  var currentShot = 0;

  function openLightbox(index) {
    if (!lightbox || !items.length) return;
    var it = items[index];
    if (!it) return;
    currentShot = index;
    lbImg.setAttribute('src', it.src);
    lbImg.setAttribute('alt', it.caption);
    lbCap.textContent = it.caption;
    lightbox.hidden = false;
    doc.body.classList.add('is-locked');
    if (lbPrev) lbPrev.focus();
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    doc.body.classList.remove('is-locked');
    if (gallery) {
      var first = gallery.querySelector('.shot');
      if (first) first.focus();
    }
  }
  function moveLightbox(delta) {
    if (!items.length) return;
    var next = (currentShot + delta + items.length) % items.length;
    openLightbox(next);
  }

  if (gallery) {
    var allShots = gallery.querySelectorAll('.shot');
    for (var s = 0; s < allShots.length; s++) {
      (function (btn, idx) {
        btn.addEventListener('click', function () { openLightbox(idx); });
        btn.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(idx); }
        });
      })(allShots[s], s);
    }
  }
  if (lbPrev) lbPrev.addEventListener('click', function () { moveLightbox(-1); });
  if (lbNext) lbNext.addEventListener('click', function () { moveLightbox(1); });
  if (lbClose) lbClose.addEventListener('click', closeLightbox);

  var closeTargets = [lightbox];
  if (lightbox) closeTargets.push(lightbox.querySelector('[data-close]'));
  for (var c = 0; c < closeTargets.length; c++) {
    (function (t) {
      t.addEventListener('click', function (e) {
        if (e.target === t || t.hasAttribute('data-close')) closeLightbox();
      });
    })(closeTargets[c]);
  }
  doc.addEventListener('keydown', function (e) {
    if (!lightbox || lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') moveLightbox(-1);
    else if (e.key === 'ArrowRight') moveLightbox(1);
  });
  window.addEventListener('resize', function () {
    if (lightbox && !lightbox.hidden) {
      lbImg.style.maxHeight = Math.min(window.innerHeight * 0.78, 900) + 'px';
    }
  });

  /* ============================ FAQ ============================ */
  var faqList = doc.getElementById('faqList');
  if (faqList) {
    var faqItems = faqList.querySelectorAll('.faq__item');
    for (var f = 0; f < faqItems.length; f++) {
      (function (item) {
        var btn = item.querySelector('.faq__q');
        var panel = item.querySelector('.faq__a');
        if (!btn || !panel) return;
        btn.addEventListener('click', function () {
          var exp = btn.getAttribute('aria-expanded') === 'true';
          if (exp) {
            btn.setAttribute('aria-expanded', 'false');
            panel.hidden = true;
          } else {
            btn.setAttribute('aria-expanded', 'true');
            panel.hidden = false;
          }
        });
      })(faqItems[f]);
    }
  }

  /* ============================ DOWNLOAD ============================ */
  var sizeEl = doc.getElementById('apkSize');

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  }

  /* The SHA-256 is published in the markup beside the button, so the page only
     needs the served file size here — it asks for headers, not the 55 MB body. */
  var apkUrl = 'downloads/PREY_THE_ESCAPE_v1.0.6_RELEASE.apk';

  function checkDownload() {
    if (!window.fetch || !sizeEl) return;
    fetch(apkUrl, { method: 'HEAD', cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var len = Number(r.headers.get('content-length') || 0);
        if (len > 0) {
          sizeEl.textContent = formatBytes(len) + ' (' + len.toLocaleString('en-US') + ' bytes)';
        }
      })
      .catch(function () {
        /* Opened from file:// or offline: keep the published values in the markup. */
      });
  }

  if (sizeEl) checkDownload();

  var downloadButtons = doc.querySelectorAll('[data-download]');
  for (var d = 0; d < downloadButtons.length; d++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        if (btn.classList) btn.classList.add('is-loading');
        setTimeout(function () {
          if (btn.classList) btn.classList.remove('is-loading');
        }, 900);
      });
    })(downloadButtons[d]);
  }

  /* ============================ KEYBOARD SHORTCUT ============================ */
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox && !lightbox.hidden) closeLightbox();
  });
})();
