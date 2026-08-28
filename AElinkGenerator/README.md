# AElinkGenerator

Local folder: `c:\AI\AElinkGenerator\`

This is a Chrome extension. It uses the official AliExpress Portals page you already have open:

https://portals.aliexpress.com/affiportals/web/link_generator.htm

It fills that page, clicks **Get Tracking Link**, and copies the affiliate URL. It also refreshes that tab every 25 minutes so Portals does not log you out.

## Install

1. Copy this folder to `c:\AI\AElinkGenerator\`
2. In Chrome open `chrome://extensions`
3. Enable **Developer mode**
4. **Load unpacked** → select `c:\AI\AElinkGenerator\`
5. Keep the Link Generator tab open and logged in
6. Click the AElinkGenerator toolbar icon, paste a product URL, Convert

Or run `open.bat`.

## Notes

- The first load does not need a Tracking ID field here. Portals already knows your account from the logged-in tab.
- If Chrome was already on the generator, you do not need to log in again.
- If a convert fails, refresh the Portals tab once and retry.
