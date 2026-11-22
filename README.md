# OrchTrade — Marketing website

A lightweight, responsive **light-neumorphic** website for [orchtrade.com](https://orchtrade.com). This is a standalone static website, **not** the Flutter SaaS dashboard or a trading execution platform.

## Source of truth

Marketing feature descriptions and prices were audited against `thedeveloperyug/Orchtrade` on 2026-11-22:
- `apps/flutter_app/lib/features/account/billing_page.dart`
- `apps/flutter_app/lib/features/overview`
- `apps/flutter_app/lib/features/market_charts`
- `apps/flutter_app/lib/features/backtesting/README.md`
- `apps/flutter_app/lib/features/ai_insights/README.md`
- `docs/market-charts-ai.md`

Product examples use **illustrative sample data**. No live feed, broker authentication, or payment processing runs on this website. Feature availability depends on deployment and plan. The Pro ($12.99/month) and Advanced ($22.99/month) prices match the in-app UI; annual figures are 12 times those prices **without an implied discount**.

## Preview locally

Use a static web server from the repository root:

```sh
python3 -m http.server 8000
# visit http://127.0.0.1:8000
```

No package install, JavaScript framework, or build step required.

## Deploy through GitHub Pages

1. Repository **Settings → Pages** → **Build and deployment → Source: GitHub Actions**.
2. Set **Custom domain: `orchtrade.com`** in the same Pages settings (this is required for Actions deploys; the root CNAME file alone will not configure an Actions-published domain).
3. Confirm Actions can run in the repository. Every push to `main` triggers `.github/workflows/pages.yml`.
4. In **Wix → Domains → orchtrade.com → Domain Actions → Manage DNS Records**, replace conflicting parking-site records (do **not** delete MX/TXT mail records) and configure:

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | thedeveloperyug.github.io |

5. When DNS and Pages certificate are ready, select **Enforce HTTPS**. Verify both `https://orchtrade.com` and `https://www.orchtrade.com` (www should redirect to the primary domain). Check for conflicting AAAA/CAA and parking records if verification fails.

**Important:** Connecting a custom domain to a Pages deployment requires the repository Pages settings and the authoritative DNS zone; this repository cannot change Wix DNS for you. For domain-security protection, verify your domain in GitHub account settings under **Pages**.

## Update marketing details

- Edit `index.html` for copy, feature lists, prices, SEO metadata and contact email.
- Edit `styles.css` for colors, neumorphic shadows and layout.
- Edit `site.js` for the mobile menu and monthly/yearly pricing toggle.
- Early-access links currently open an email to `yogesh.pandey@orchstring.com`; change that to your dedicated OrchTrade email or working app/signup URL when ready.
- Edit `CNAME`, `sitemap.xml` and canonical URLs together if you change the domain.
- There is no form backend or live billing. Never collect payments or broker passwords on this GitHub Pages site.

## Files

`index.html`: semantic page, accessible navigation, example app UI and sections.
`styles.css`: mobile-first responsive neumorphic styling.
`site.js`: progressively-enhanced interactions.
`favicon.svg`: product mark.
`robots.txt` / `sitemap.xml`: search-engine discovery.
`.github/workflows/pages.yml`: Pages deployment.
`CNAME`: records the intended hostname; Pages custom-domain setting must also be configured.

## Marketing website → real trading dashboard

The nav **Sign in** link, top-right **Open Dashboard** button, hero **Open Dashboard** button, Free-plan button and footer now point to the **planned** address `https://app.orchtrade.com/`.

**Important:** This URL is **not live just because the website links to it**. The AWS deployment currently uses a CloudFront default domain, and its exact distribution domain name is not recorded in this repository. Before the buttons can work:

1. In AWS CloudFront, locate the existing `orchtrade-pilot` distribution, and copy its assigned `dXXXXXXXXXXXXX.cloudfront.net` hostname. Verify its default CloudFront hostname loads the Flutter login page.
2. In AWS Certificate Manager in **us-east-1** (N. Virginia), request a public TLS certificate for `app.orchtrade.com`, select **DNS validation**, and add the validation CNAME to the domain's *authoritative* DNS provider (Wix if your domain uses Wix nameservers).
3. In the **same existing** CloudFront distribution, add **Alternate domain name** `app.orchtrade.com`, attach the validated ACM certificate and keep the current app origin, WebSocket/API behavior, and HTTPS redirect intact. Do not create a replacement distribution or change the broker/MT5 workers.
4. In the Wix DNS panel (if Wix manages authoritative DNS), add `CNAME` **host** `app` → **value** `dXXXXXXXXXXXXX.cloudfront.net` (replace this placeholder with the real hostname). This is separate from the root `orchtrade.com` A records, which continue pointing to GitHub Pages.
5. Verify `https://app.orchtrade.com/` loads the login page, user sign-in works and the network requests/WebSockets remain same-origin (the deployed app uses `ORCHTRADE_API_URL=auto`). Then check all marketing CTA links.

If you need a working link **before** DNS/certificate validation, temporarily replace each `https://app.orchtrade.com/` with the verified `https://dXXXXXXXXXXXXX.cloudfront.net/` URL in `index.html` and push. Do not use `localhost:8080`, an EC2 private IP, or a local network address.

The marketing site is an ordinary public web page and must not handle MT5 broker credentials or dashboard sessions.

Documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-procedures.html
