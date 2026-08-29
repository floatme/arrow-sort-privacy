# AElinkGenerator (desktop)

Run this on your Windows PC. The website uses your signed-in AliExpress Portals Link Generator and returns affiliate links to anyone who opens the page.

Put the files in `c:\AI\AElinkGenerator\`.

Full walkthrough (including Cloudflare): see **[PLAN.md](PLAN.md)**.  
Connect **helpmegetaround.com**: run **`connect-helpmegetaround.bat`** or see **[CONNECT.md](CONNECT.md)**.

## Once

1. Install Node.js LTS from https://nodejs.org (leave the PATH checkbox on).
2. Confirm Google Chrome is installed.
3. Copy this folder to `c:\AI\AElinkGenerator\`.

## Every time / auto-start

**One-time:** double-click **`install-autostart.bat`**. After that, Windows sign-in starts the converter and Cloudflare tunnel automatically.

**Manual:** double-click **`start-all.bat`** (or `open.bat` for the converter only).

1. Leave the minimized windows running.
2. Sign in to Portals in Chrome if it asks.
3. Site: http://localhost:3000 and https://helpmegetaround.com

The script stops the PC from sleeping while it runs. Plug the PC in and set **Sleep → Never** for overnight.

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
