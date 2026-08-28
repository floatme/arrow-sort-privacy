# AElinkGenerator

Public website: anyone pastes an AliExpress product URL. The server generates the affiliate link with **your** AliExpress Portals account and returns it to the page.

Local folder: `c:\AI\AElinkGenerator\`

## Run the website

```
cd c:\AI\AElinkGenerator
npm install
npm start
```

Or double-click `open.bat`.

Open http://localhost:3000

On first start, Chrome opens the official generator:

https://portals.aliexpress.com/affiportals/web/link_generator.htm

Sign in with your affiliate account once. The server keeps that tab/session alive by refreshing it every 25 minutes.

Visitors never see Portals. They only use your website.

## Host it for anyone

The site is this Node app, not a static page. Keep the process running on a machine that can stay signed in to Portals (your PC, a VPS with Chrome, etc.). Point a domain at port 3000 if you want a public URL.

For 24/7 hosting without Chrome, create AliExpress Affiliate API credentials in Portals and put them in `.env`:

```
ALIEXPRESS_APP_KEY=...
ALIEXPRESS_APP_SECRET=...
ALIEXPRESS_TRACKING_ID=...
```

Then `npm start` uses the official API instead of the browser.

## Tests

```
npm test
```
