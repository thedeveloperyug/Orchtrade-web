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
      document.querySelectorAll('[data-annual-note]').forEach(function (note) {
        if (note.closest('.price-card').querySelector('h3').textContent === 'Free') {
          note.textContent = 'Core tools, no AI features';
        } else {
          note.textContent = annual ? 'USD · Billed yearly · Checkout coming soon' : 'USD · Checkout coming soon';
        }
      });
    });
  });
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
