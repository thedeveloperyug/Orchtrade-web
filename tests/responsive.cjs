/**
 * Viewport-level static-site checks. Runs with Chrome on a GitHub-hosted runner.
 * No screenshot cloud, network, login, or production endpoint is required.
 */
const path = require('path');
const fs = require('fs');
const http = require('http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

const widths = [320, 360, 375, 390, 414, 540, 600, 720, 768, 820, 1024, 1280];
const root = path.resolve(__dirname, '..');
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/site.js', ['site.js', 'text/javascript; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
  ['/terms-and-conditions/', ['terms-and-conditions/index.html', 'text/html; charset=utf-8']],
  ['/disclaimer/', ['disclaimer/index.html', 'text/html; charset=utf-8']]
]);
(async function () {
  const server = http.createServer((request, response) => {
    const item = files.get(new URL(request.url, 'http://localhost').pathname);
    if (!item) {
      const urlPath = new URL(request.url, 'http://localhost').pathname;
      if (/^\/assets\/showcase\/[a-z-]+\.(svg|webp|json)$/.test(urlPath)) {
        const asset = path.join(root, urlPath);
        if (fs.existsSync(asset)) {
          response.writeHead(200, { 'Content-Type': urlPath.endsWith('.svg') ? 'image/svg+xml' : urlPath.endsWith('.webp') ? 'image/webp' : 'application/json' });
          return response.end(fs.readFileSync(asset));
        }
      }
      response.writeHead(404); return response.end();
    }
    const [file, type] = item;
    response.writeHead(200, { 'Content-Type': type });
    response.end(fs.readFileSync(path.join(root, file)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const siteUrl = 'http://127.0.0.1:' + server.address().port + '/';
  let browser;
  try {
    browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox']
  });
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 860 }, deviceScaleFactor: 1 });
      try {
        await page.route('https://fonts.googleapis.com/**', r => r.abort());
        await page.route('https://fonts.gstatic.com/**', r => r.abort());
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(siteUrl, { waitUntil: 'domcontentloaded' });
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
        const showcase = page.locator('[data-showcase]');
        assert.equal(await showcase.locator('[data-screen]').count(), 6);
        await showcase.locator('[data-screen="5"]').click();
        assert.equal(await showcase.locator('[data-screen="5"]').getAttribute('aria-pressed'), 'true');
        assert.equal(await showcase.locator('[data-slide="5"]').getAttribute('aria-hidden'), 'false');
        await showcase.locator('[data-slide="5"] img').evaluate(img => img.decode());
        await showcase.locator('[data-showcase-next]').click();
        assert.equal(await showcase.locator('[data-screen="0"]').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.topbar')).backdropFilter), 'none');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        const comparison = page.locator('.plan-table');
        assert.equal(await comparison.locator('tbody tr').count(), 17);
        const access = async name => comparison.locator('tbody tr').filter({has:page.getByRole('rowheader',{name,exact:true})}).locator('td').evaluateAll(cells => cells.map(cell => ['trial','limit'].includes(cell.dataset.access) ? cell.textContent.trim() : cell.dataset.access));
        assert.deepEqual(await access('Connected MT5 accounts'), ['1','2','2']);
        assert.deepEqual(await access('Priority customer care'), ['excluded','included','included']);
        assert.deepEqual(await access('Real-time charts with AI scan'), ['excluded','excluded','included']);
        assert.deepEqual(await access('Ultra-low-latency sync'), ['excluded','included','included']);
        assert.ok((await page.locator('.price-card.highlighted .plan-list').textContent()).includes('Ultra-low-latency sync'));
        assert.deepEqual(await access('Backtests'), ['1 day','3 days','included']);
        assert.deepEqual(await access('AI Insights'), ['1 day','included','included']);
        assert.deepEqual(await access('Economic News'), ['included','included','included']);
        assert.deepEqual(await access('Market Charts'), ['excluded','excluded','included']);
        assert.deepEqual(await access('Signals'), ['excluded','excluded','included']);
        for (const name of ['AI Backtesting & Strategy Assistant','AI Signals (watch-only)','AI Trade Scan / Setup Analysis','AI Journal Coach']) assert.deepEqual(await access(name), ['excluded','excluded','included']);
        assert.equal(await comparison.getByRole('rowheader',{name:'Profile',exact:true}).count(),0);
        assert.equal(await comparison.getByRole('rowheader',{name:'Billing',exact:true}).count(),0);
        assert.ok(await comparison.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;}));
        for(const [offer,original] of [['$12','$20'],['$25','$32']]) {
          assert.equal((await page.locator('strong[data-monthly="'+offer+'"]').textContent()).trim(),offer);
          assert.equal((await page.locator('del[data-monthly="'+original+'"]').textContent()).trim(),original);
        }
        const annual = page.locator('[data-period="annual"]');
        await annual.click();
        assert.equal((await page.locator('strong[data-monthly="$12"]').textContent()).trim(), '$144');
        assert.equal((await page.locator('del[data-monthly="$20"]').textContent()).trim(), '$240');
        assert.equal((await page.locator('strong[data-monthly="$25"]').textContent()).trim(), '$300');
        assert.equal((await page.locator('del[data-monthly="$32"]').textContent()).trim(), '$384');
        assert.equal(await page.getByRole('link', { name: 'Choose Pro ↗' }).getAttribute('href'),
          'https://app.orchtrade.com/?plan=pro&period=annual');
        assert.equal(await page.getByRole('link', { name: 'Choose Advanced ↗' }).getAttribute('href'),
          'https://app.orchtrade.com/?plan=advanced&period=annual');
        assert.equal(await page.getByRole('link', { name: 'Open free dashboard ↗' }).getAttribute('href'),
          'https://app.orchtrade.com/');
        assert.equal((await page.locator('[data-monthly="$0"]').textContent()).trim(), '$0');
        await page.locator('[data-period="monthly"]').click();
        assert.equal((await page.locator('strong[data-monthly="$12"]').textContent()).trim(),'$12');
        assert.equal((await page.locator('del[data-monthly="$20"]').textContent()).trim(),'$20');
        assert.equal((await page.locator('strong[data-monthly="$25"]').textContent()).trim(),'$25');
        assert.equal((await page.locator('del[data-monthly="$32"]').textContent()).trim(),'$32');
        assert.equal(await page.getByRole('link', { name: 'Choose Pro ↗' }).getAttribute('href'),
          'https://app.orchtrade.com/?plan=pro&period=monthly');
        assert.deepEqual(errors, [], 'Browser JS errors at ' + width);
        console.log('PASS ' + width + 'px — nav, pricing, dashboard, no horizontal overflow');
      } finally {
        await page.close();
      }
    }
    for (const width of [320, 390, 768, 1024]) {
      for (const slug of ['terms-and-conditions', 'disclaimer']) {
        const page = await browser.newPage({ viewport: { width, height: 860 }, deviceScaleFactor: 1 });
        try {
          await page.goto(siteUrl + slug + '/', { waitUntil: 'domcontentloaded' });
          const layout = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            viewport: innerWidth,
            heading: document.querySelector('h1')?.textContent,
            sections: document.querySelectorAll('.legal-content section').length
          }));
          assert.ok(layout.heading && layout.sections >= 10, 'Legal content missing: ' + slug);
          assert.ok(layout.scrollWidth <= width + 1, 'Legal horizontal overflow: ' + slug + ' ' + width + 'px');
          console.log('PASS ' + slug + ' ' + width + 'px');
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
