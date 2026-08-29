# Connect helpmegetaround.com

**Last checked:** DNS for `helpmegetaround.com` returns **SERVFAIL** — nameservers point at Cloudflare but there is **no active zone** (lame delegation). The domain cannot load until Cloudflare + Namecheap nameservers match.

| Domain | Status |
|---|---|
| **helpmegetaround.com** | Broken DNS (no reachable authority). Fix Cloudflare zone + Namecheap NS first. |
| **yalkut.fyi** | Still on Cloudflare proxy; Namecheap hosting mail (jellyfish). Remove from hosting addon domains. |

---

## Fastest fix (recommended for this app)

This converter is **Node + Chrome on your desktop**. Namecheap shared hosting cannot run it.

On your Windows PC (`c:\AI\AElinkGenerator\`):

1. **Cloudflare:** https://dash.cloudflare.com → **Add a site** → `helpmegetaround.com` → Free plan.
2. **Namecheap:** Domain List → `helpmegetaround.com` → **Custom DNS** → paste Cloudflare’s two nameservers → Save.
3. Wait until Cloudflare shows **Active** (minutes to a few hours).
4. Double-click **`connect-helpmegetaround.bat`** — one browser click for Cloudflare tunnel login, then it starts the site and tunnel.

Public URL: **https://helpmegetaround.com** (keep both command windows open).

Check DNS anytime:

```
node scripts/diagnose-dns.js
```

---

## If you finished a static site (other AI) on Namecheap hosting

1. cPanel → **Addon Domains:** remove `yalkut.fyi`, add `helpmegetaround.com`.
2. Upload site files to that domain’s document root.
3. Copy cPanel **Shared IP Address** (SPF for yalkut.fyi showed `68.65.123.210` / `68.65.123.213` — confirm in cPanel).
4. Fix Cloudflare zone + Namecheap NS (steps 1–3 above).
5. Cloudflare **DNS:** A `@` → Shared IP (Proxied), CNAME `www` → `helpmegetaround.com` (Proxied). SSL **Full**.

Or run (with secrets in Cursor / `.env`):

```
set CLOUDFLARE_API_TOKEN=...
set NAMECHEAP_HOSTING_IP=...
node scripts/set-cloudflare-dns.js
```

---

## Disconnect yalkut.fyi

- **Hosting:** remove addon domain in cPanel.
- **DNS:** pause Cloudflare zone or remove A/CNAME; or Namecheap BasicDNS + redirect.

---

## Why the agent could not click “Do it for me”

Cloud Agent browser access hit the usage limit, and this environment has no `CLOUDFLARE_API_TOKEN` or Namecheap login. To finish from the cloud, add **Cursor environment secrets**:

- `CLOUDFLARE_API_TOKEN` — Edit zone DNS for `helpmegetaround.com`
- `NAMECHEAP_HOSTING_IP` — only if using static hosting

Then re-run the agent, or run `connect-helpmegetaround.bat` once on your PC (you only click Authorize in the browser).
