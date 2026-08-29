# AElinkGenerator (desktop)

Run this on your Windows PC. The website uses your signed-in AliExpress Portals Link Generator and returns affiliate links to anyone who opens the page.

Put the files in `c:\AI\AElinkGenerator\`.

Full walkthrough (including Cloudflare): see **[PLAN.md](PLAN.md)**.  
Namecheap domain **helpmegetaround.com**: see **[NAMECHEAP-CLOUDFLARE.md](NAMECHEAP-CLOUDFLARE.md)**.

## Once

1. Install Node.js LTS from https://nodejs.org (leave the PATH checkbox on).
2. Confirm Google Chrome is installed.
3. Copy this folder to `c:\AI\AElinkGenerator\`.

## Every time you want the site live

1. Double-click `open.bat`.
2. Leave that black window open.
3. In the Chrome window that opens, sign in to Portals if it asks.
4. Open http://localhost:3000 and paste an AliExpress product URL.

The script stops the PC from sleeping while it runs. Still plug the PC in, and in Windows set **Sleep → Never** when you want it on overnight.

If the PC reboots, run `open.bat` again. You usually stay logged in.

## Other devices on your Wi-Fi

The console prints a `http://192.168.x.x:3000` address. Phones on the same network can use that.

## Anyone on the internet

Your desktop is not public by default. Easiest free option: [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/). While `open.bat` is running:

```
cloudflared tunnel --url http://localhost:3000
```

Share the `https://...trycloudflare.com` URL it prints.

## Tests

```
npm test
```
