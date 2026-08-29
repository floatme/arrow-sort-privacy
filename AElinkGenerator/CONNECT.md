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

## Keep it online (auto-start)

On your Windows PC (`c:\AI\AElinkGenerator\`):

1. Double-click **`install-autostart.bat`** once.
2. It registers a Task Scheduler job that runs **`start-all.bat`** at Windows sign-in (+30s).
3. Optionally installs the **cloudflared Windows service** (more reliable tunnel).

After that, reboot once and confirm https://helpmegetaround.com still loads.

Manual start anytime: **`start-all.bat`**  
Remove auto-start: **`uninstall-autostart.bat`**

If `/api/convert` returns “link generator is unavailable”, sign in to Portals in the Chrome window that opens.

---

## Disconnect yalkut.fyi (optional cleanup)

- Namecheap cPanel → remove `yalkut.fyi` addon domain if still attached.
- Cloudflare zone for `yalkut.fyi`: pause or remove A records.

---

## Agent notes

DNS was fixed once the Cloudflare zone became **Active** and the desktop tunnel was already routing traffic. A DNS-edit API token can manage records; creating tunnels needs Tunnel permissions or `cloudflared tunnel login` on the PC.
