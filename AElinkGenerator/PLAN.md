# Plan: run AElinkGenerator on your desktop, including Cloudflare

Goal: your Windows PC hosts the website. Visitors paste an AliExpress URL. Your signed-in Portals Link Generator creates the affiliate link. Cloudflare gives the site a public HTTPS URL without opening router ports.

Work through the phases in order. Do not skip Portals login.

## Phase 1 — Put the project on the PC

1. Create `c:\AI\` if it does not exist.
2. Copy the `AElinkGenerator` folder to `c:\AI\AElinkGenerator\` so these files exist:
   - `c:\AI\AElinkGenerator\open.bat`
   - `c:\AI\AElinkGenerator\server.js`
   - `c:\AI\AElinkGenerator\public\index.html`
3. Keep using that folder from here on.

## Phase 2 — Install what the PC needs

1. Install Node.js LTS from https://nodejs.org  
   Leave **Add to PATH** checked. Close and reopen any Command Prompt after install.
2. Confirm Chrome is installed (the same Chrome you already use for Portals).
3. In a new Command Prompt:

   ```
   node -v
   ```

   You want v18 or newer.

4. Install Cloudflare’s tunnel tool:

   Double-click `install-cloudflared.bat`,  
   or in Command Prompt:

   ```
   winget install --id Cloudflare.cloudflared -e
   ```

5. Close that Command Prompt and open a new one, then run:

   ```
   cloudflared --version
   ```

## Phase 3 — First local run and Portals login

1. Plug the PC in.
2. Windows Settings → System → Power → **Sleep = Never** while plugged in (or while you want the site live).
3. Double-click `c:\AI\AElinkGenerator\open.bat`.
4. Leave that window open.
5. A Chrome window should open the official generator:  
   https://portals.aliexpress.com/affiportals/web/link_generator.htm
6. Sign in with your AliExpress affiliate account if asked.
7. Confirm you can see the **Get Tracking Link** form (not a login wall).

If Chrome does not open, Node or Chrome is missing. Fix Phase 2 and run `open.bat` again.

## Phase 4 — Prove the website on this PC

1. Open http://localhost:3000
2. Paste a real AliExpress product URL.
3. Click **Get affiliate link**.
4. Confirm you get an `s.click.aliexpress.com` URL and that it opens the product.

Do not go to Cloudflare until this works. If it fails, the public URL will fail too.

Optional: on your phone (same Wi-Fi), open the `http://192.168.x.x:3000` address printed in the `open.bat` window.

## Phase 5 — Keep it running on the desktop

While the site should be live:

- Do not close the `open.bat` window.
- Do not close the Chrome profile it launched (the Portals tab).
- Do not let the PC sleep or hibernate.
- After a reboot, run `open.bat` again, then the Cloudflare step again (unless you later install a named tunnel as a service).

`open.bat` already asks Windows not to sleep while that window is open. Still set Sleep to Never if you want it overnight.

## Phase 6 — Public URL (quick Cloudflare tunnel)

This is the first public version. No domain required. The URL changes every time you restart the tunnel.

1. Leave `open.bat` running so http://localhost:3000 still works.
2. Double-click `start-public.bat`.
3. Wait until it prints an `https://….trycloudflare.com` URL.
4. Open that URL on your phone with cellular data (not Wi-Fi) and convert a link.

Share that URL. When you close `start-public.bat`, the public URL dies. Next start gets a **new** trycloudflare URL.

## Phase 7 — Stable public URL (named tunnel + your domain)

Do this when you want one address that does not change.

1. Get a domain (any registrar).
2. Add the domain to a free Cloudflare account and switch the domain’s nameservers to Cloudflare.
3. In Command Prompt:

   ```
   cloudflared tunnel login
   ```

   Approve access for that domain.

4. Create the tunnel:

   ```
   cloudflared tunnel create aelinkgenerator
   ```

   Note the tunnel id it prints.

5. Copy `cloudflare-config.example.yml` to `%USERPROFILE%\.cloudflared\config.yml`.
6. Edit that file:
   - Put the tunnel id
   - Put the full path to the credentials JSON (same folder, named `<tunnel-id>.json`)
   - Put your hostname, e.g. `links.yourdomain.com`
7. Point DNS at the tunnel:

   ```
   cloudflared tunnel route dns aelinkgenerator links.yourdomain.com
   ```

8. With `open.bat` already running:

   ```
   cloudflared tunnel run aelinkgenerator
   ```

9. Open `https://links.yourdomain.com` and test a conversion.

Optional later: install as a Windows service (`cloudflared service install`) so the tunnel starts at boot. You still need `open.bat` (or a startup shortcut to it) so Portals Chrome is logged in.

## Phase 8 — After every reboot (checklist)

1. PC plugged in, sleep Never.
2. `open.bat` → sign in to Portals if needed → http://localhost:3000 works.
3. `start-public.bat` **or** `cloudflared tunnel run aelinkgenerator`.
4. Test one product URL on the public HTTPS address.

## What success looks like

- You paste a product URL on the public site.
- The desktop Chrome Portals tab fills and clicks **Get Tracking Link**.
- The site shows an affiliate link from **your** account.
- Visitors never see Portals and never use their own affiliate login.

## If something breaks

| Symptom | Fix |
|---|---|
| `node` is not recognized | Reinstall Node.js LTS, new Command Prompt |
| Site loads, convert fails | Portals Chrome logged out — sign in again |
| trycloudflare URL 502 | `open.bat` is not running, or still starting |
| Named tunnel 1033 / 502 | `config.yml` hostname/service wrong, or site not on port 3000 |
| Captcha / AliExpress blocks | Complete it in the Portals Chrome window, then retry |
| PC slept overnight | Sleep Never + keep `open.bat` open |

## Order of work (short)

1. Copy to `c:\AI\AElinkGenerator\`  
2. Install Node.js + cloudflared  
3. `open.bat` + Portals login  
4. Test http://localhost:3000  
5. `start-public.bat` for a temporary public URL  
6. Named tunnel + domain when you want a permanent address  
