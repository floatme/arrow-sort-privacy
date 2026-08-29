# Connect helpmegetaround.com

**Status (2026-08-29):** LIVE

| Check | Result |
|---|---|
| https://helpmegetaround.com | **200 OK** |
| https://www.helpmegetaround.com | **200 OK** |
| `/api/health` | `{"ok":true,"mode":"portals"}` |
| Cloudflare zone | Active (`austin.ns.cloudflare.com`, `jule.ns.cloudflare.com`) |
| DNS | CNAME `@` + `www` → Cloudflare Tunnel |

The converter runs on your desktop (Portals + Node) and is published via Cloudflare Tunnel. Namecheap is registrar only.

---

## Keep it online

On your Windows PC (`c:\AI\AElinkGenerator\`):

1. Keep **`open.bat`** (or the converter server) running, Portals signed in.
2. Keep **`cloudflared tunnel run …`** running.

After a reboot, start both again (or use `connect-helpmegetaround.bat`).

If `/api/convert` returns “link generator is unavailable”, re-open Portals Chrome and sign in again.

---

## Disconnect yalkut.fyi (optional cleanup)

- Namecheap cPanel → remove `yalkut.fyi` addon domain if still attached.
- Cloudflare zone for `yalkut.fyi`: pause or remove A records.

---

## Agent notes

DNS was fixed once the Cloudflare zone became **Active** and the desktop tunnel was already routing traffic. A DNS-edit API token can manage records; creating tunnels needs Tunnel permissions or `cloudflared tunnel login` on the PC.
