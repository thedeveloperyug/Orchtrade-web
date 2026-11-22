/**
 * Viewport-level static-site checks. Runs with Chrome on a GitHub-hosted runner.
 * No screenshot cloud, network, login, or production endpoint is required.
 */
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

const widths = [320, 360, 375, 390, 414, 540, 600, 720, 768, 820, 1024, 1280];
const fileUrl = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async function () {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox']
  });
  try {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 860 }, deviceScaleFactor: 1 });
      try {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
        await page.locator('.dashboard').waitFor();
        const state = await page.evaluate(() => {
          const rect = (selector) => {
            const e = document.querySelector(selector);
            const b = e.getBoundingClientRect();
            return { x: b.x, right: b.right, width: b.width, height: b.height };
          };
          const mainNav = document.querySelector('#main-nav');
          return {
            viewport: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            dashboard: rect('.dashboard'),
            hero: rect('.hero-copy'),
            pricingCards: Array.from(document.querySelectorAll('.price-card')).map(e => e.getBoundingClientRect().width),
            navDisplay: getComputedStyle(mainNav).display,
            menuDisplay: getComputedStyle(document.querySelector('.menu-button')).display,
            heroVisualHeight: rect('.hero-visual').height,
            features: Array.from(document.querySelectorAll('.feature-card')).map(e => e.getBoundingClientRect().width)
          };
        });
        assert.equal(state.viewport, width, 'Viewport not applied at ' + width);
        assert.ok(state.scrollWidth <= width + 1, 'Horizontal document overflow at ' + width + ': ' + JSON.stringify(state));
        assert.ok(state.features.every(w => w > 0), 'Collapsed feature card at ' + width);
        assert.ok(state.pricingCards.every(w => w >= 245), 'Cramped pricing card at ' + width + ': ' + state.pricingCards);
        if (width <= 720) {
          assert.ok(state.dashboard.x >= -1 && state.dashboard.right <= width + 1,
            'Clipped mobile dashboard at ' + width + ': ' + JSON.stringify(state.dashboard));
          assert.ok(state.dashboard.width >= width - 55, 'Dashboard shrank instead of reflowing at ' + width);
          assert.ok(state.heroVisualHeight >= 260, 'Collapsed illustration at ' + width);
        }
        if (width <= 1050) {
          assert.equal(state.navDisplay, 'none', 'Desktop navigation visible on narrow screen at ' + width);
          assert.notEqual(state.menuDisplay, 'none', 'Menu button missing at ' + width);
          const menuButton = page.locator('.menu-button');
          await menuButton.click();
          assert.equal(await menuButton.getAttribute('aria-expanded'), 'true');
          assert.equal(await page.locator('#main-nav').evaluate(e => getComputedStyle(e).display), 'flex');
          await page.keyboard.press('Escape');
          assert.equal(await menuButton.getAttribute('aria-expanded'), 'false');
          assert.equal(await page.locator('#main-nav').evaluate(e => getComputedStyle(e).display), 'none');
        } else {
          assert.equal(state.menuDisplay, 'none', 'Menu button should not show on desktop at ' + width);
          assert.equal(state.navDisplay, 'flex', 'Desktop nav hidden at ' + width);
        }
        const annual = page.locator('[data-period="annual"]');
        await annual.click();
        assert.equal((await page.locator('[data-monthly="$12.99"]').textContent()).trim(), '$155.88');
        assert.deepEqual(errors, [], 'Browser JS errors at ' + width);
        console.log('PASS ' + width + 'px — nav, pricing, dashboard, no horizontal overflow');
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
