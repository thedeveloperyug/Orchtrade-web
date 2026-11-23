(function () {
  'use strict';
  var menuButton = document.querySelector('.menu-button');
  var menu = document.querySelector('#main-nav');
  if (menuButton && menu) {
    menuButton.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.classList.contains('open')) {
        menu.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open menu');
        menuButton.focus();
      }
    });
    document.addEventListener('click', function (event) {
      if (menu.classList.contains('open') && !menu.contains(event.target) && !menuButton.contains(event.target)) {
        menu.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open menu');
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1050 && menu.classList.contains('open')) {
        menu.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open menu');
      }
    });
    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        menu.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open menu');
      });
    });
  }
  document.querySelectorAll('[data-period]').forEach(function (button) {
    button.addEventListener('click', function () {
      var annual = button.dataset.period === 'annual';
      document.querySelectorAll('[data-period]').forEach(function (b) {
        var selected = b === button;
        b.classList.toggle('active', selected);
        b.setAttribute('aria-pressed', String(selected));
      });
      document.querySelectorAll('[data-monthly]').forEach(function (price) {
        price.textContent = annual ? price.dataset.annual : price.dataset.monthly;
      });
      document.querySelectorAll('[data-period-label]').forEach(function (label) {
        label.textContent = annual ? '/ year' : '/ month';
      });
      document.querySelectorAll('[data-checkout-link]').forEach(function (link) {
        var checkout = new URL(link.href);
        checkout.searchParams.set('period', button.dataset.period);
        link.href = checkout.href;
      });
    });
  });

  // No scroll listener or scroll hijacking. Pause slideshow offscreen or when tab is hidden.
  var showcase = document.querySelector('[data-showcase]');
  if (showcase) {
    var tabs = Array.from(showcase.querySelectorAll('[data-screen]'));
    var slides = Array.from(showcase.querySelectorAll('[data-slide]'));
    var labels = [["Live portfolio overview","Monitor account equity, floating P&L, monthly performance and upcoming economic releases."],["Four charts, one workspace","Compare broker-sourced instruments, switch timeframes and inspect watch-only trade research."],["Build, test and replay","Explore strategy rules, historical market data, simulated trades and candle-by-candle replay."],["Understand performance","Review equity, trade outcomes, drawdown and portfolio patterns with AI-assisted research."],["Review your trading process","Record pre-trade plans, post-trade reviews, emotions and execution checklists."],["Focus on a single market","Expand a chart and inspect entry, stop and risk/reward research levels."]];
    var current = 0, visible = false, timer = 0, manifest = {};
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var playing = !reduced.matches;
    var play = showcase.querySelector('[data-showcase-play]');
    var count = showcase.querySelector('[data-showcase-count]');
    var heading = showcase.querySelector('[data-showcase-heading]');
    var description = showcase.querySelector('[data-showcase-description]');
    function loadSlide(index) {
      var img = slides[index].querySelector('img');
      if (!img.getAttribute('src')) img.src = img.dataset.src;
      if (manifest[img.dataset.photo] && !img.dataset.photoLoaded) {
        var original = new Image();
        original.onload = function () {
          img.src = img.dataset.photo;
          img.dataset.photoLoaded = 'true';
          img.alt = 'OrchTrade demo screenshot: ' + tabs[index].textContent.trim();
          if (index === current) setDisclosure(index);
        };
        original.src = img.dataset.photo;
      }
    }
    function setDisclosure(index) {
      showcase.querySelector('[data-showcase-disclosure]').textContent = slides[index].querySelector('img').dataset.photoLoaded === 'true'
        ? 'Demo dashboard screenshot · Sample account data, not live results or investment advice.'
        : 'Illustrative product preview · Sample data, not live results or investment advice.';
    }
    function show(index) {
      current = (index + slides.length) % slides.length;
      loadSlide(current);
      slides.forEach(function (slide,i) { slide.classList.toggle('active', i === current); slide.setAttribute('aria-hidden', String(i !== current)); });
      tabs.forEach(function (tab,i) { tab.classList.toggle('active', i === current); tab.setAttribute('aria-pressed', String(i === current)); });
      count.textContent = String(current + 1).padStart(2,'0') + ' / ' + String(slides.length).padStart(2,'0');
      heading.textContent = labels[current][0];
      description.textContent = labels[current][1];
      setDisclosure(current);
    }
    function schedule() {
      clearTimeout(timer);
      if (playing && visible && !document.hidden && !reduced.matches)
        timer = setTimeout(function () { show(current + 1); schedule(); }, 6500);
    }
    function updatePlay() {
      play.textContent = playing ? 'Ⅱ' : '▷';
      play.setAttribute('aria-pressed',String(playing));
      play.setAttribute('aria-label',playing ? 'Pause automatic slideshow' : 'Play automatic slideshow');
      schedule();
    }
    tabs.forEach(function (tab,i) { tab.addEventListener('click',function () { playing = false; show(i); updatePlay(); }); });
    showcase.querySelector('[data-showcase-prev]').addEventListener('click',function () { playing = false; show(current-1); updatePlay(); });
    showcase.querySelector('[data-showcase-next]').addEventListener('click',function () { playing = false; show(current+1); updatePlay(); });
    play.addEventListener('click',function () { playing = !playing && !reduced.matches; updatePlay(); });
    document.addEventListener('visibilitychange',schedule);
    if (reduced.addEventListener) reduced.addEventListener('change',function () { if(reduced.matches) playing=false; updatePlay(); });
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries) { visible = entries[0].isIntersecting; schedule(); },{threshold:0.15});
      observer.observe(showcase);
    } else { visible = true; }
    fetch('/assets/showcase/manifest.json').then(function(response) { return response.ok ? response.json() : {}; }).then(function(data) { manifest = data || {}; loadSlide(current); }).catch(function () {});
    updatePlay();
  }

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
