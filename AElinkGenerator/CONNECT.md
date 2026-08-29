# Connect helpmegetaround.com (Namecheap hosting + Cloudflare)

Current status (checked from public DNS):

| Domain | Status |
|---|---|
| **helpmegetaround.com** | Nameservers are Cloudflare (`ray.ns.cloudflare.com`, `peaches.ns.cloudflare.com`). **No A/CNAME records** → site does not load. |
| **yalkut.fyi** | Still points at Cloudflare (`104.21.73.144` / `172.67.145.149`). Still on your hosting mail (jellyfish). |

You need three links: **domain (Namecheap)** → **Cloudflare DNS** → **Namecheap hosting files**.

---

## Step 1 — Namecheap hosting: swap domains

1. https://ap.www.namecheap.com → **Hosting List** → **Manage** (cPanel).
2. **Addon Domains** (or **Domains**):
   - **Remove** `yalkut.fyi`
   - **Add** `helpmegetaround.com` (document root is often `public_html` or `public_html/helpmegetaround.com`)
3. In cPanel home, copy **Shared IP Address** (example: `192.0.2.50`). You need this for Cloudflare.

Upload the finished site files (from your other AI) into that domain’s folder via **File Manager** or FTP.

Do **not** change helpmegetaround.com nameservers away from Cloudflare.

---

## Step 2 — Cloudflare DNS (fix the site)

1. https://dash.cloudflare.com → zone **helpmegetaround.com**
2. **DNS** → **Records**:
   - Delete any broken `CNAME` to a tunnel if the tunnel is not running.
   - Add **A** `@` → **your Namecheap Shared IP** → **Proxied** (orange cloud)
   - Add **CNAME** `www` → `helpmegetaround.com` → **Proxied**
3. **SSL/TLS** → **Full** (not Full Strict until you have a valid cert on hosting)

Wait 2–5 minutes, then open https://helpmegetaround.com

---

## Step 3 — Disconnect yalkut.fyi

**Hosting:** already removed in Step 1.

**DNS (pick one):**

- If `yalkut.fyi` has its own Cloudflare zone: **DNS** → remove A/CNAME records, or **Overview** → pause site.
- If it only used Namecheap: **Domain List** → `yalkut.fyi` → **Nameservers** → **Namecheap BasicDNS** → **Redirect** or parking.

---

## Optional — let the agent set Cloudflare DNS automatically

Add secrets:

- `CLOUDFLARE_API_TOKEN` — Cloudflare → My Profile → API Tokens → Edit zone DNS (zone: helpmegetaround.com)
- `NAMECHEAP_HOSTING_IP` — the Shared IP from cPanel

Then run:

```
node scripts/set-cloudflare-dns.js
```

---

## If your finished app is the desktop Node converter (not static hosting)

Namecheap shared hosting **cannot** run it. Use Cloudflare **Tunnel** from your PC instead of Step 2 A records. See `setup-named-tunnel.bat`.
