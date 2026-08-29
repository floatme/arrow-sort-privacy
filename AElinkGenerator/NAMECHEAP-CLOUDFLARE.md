# Namecheap + Cloudflare for helpmegetaround.com

Domain is already registered: **helpmegetaround.com** (Namecheap).

This site is a Node app plus Chrome on your desktop. **Namecheap website hosting cannot run it.** Use Namecheap only as the registrar. Cloudflare Tunnel sends https://helpmegetaround.com to `http://127.0.0.1:3000` on your PC.

## 1. Namecheap — unlink yalkut.fyi

1. Sign in at https://ap.www.namecheap.com
2. **Domain List** → **yalkut.fyi**
3. If it is connected to hosting:
   - Open the hosting cPanel (or **Product List** → Stellar/hosting)
   - **Domains** / **Addon Domains** / **Aliases**
   - Remove **yalkut.fyi**
4. Back on **yalkut.fyi** domain → **Nameservers**: set to Namecheap BasicDNS or Parked if you are not using it.

Do not delete the hosting plan unless you want to cancel it. Just disconnect that domain from it.

## 2. Namecheap — do not attach helpmegetaround.com to that hosting

Skip “Add domain to cPanel” / “share hosting” for helpmegetaround.com.

**Domain List** → **helpmegetaround.com** → **Nameservers** → **Custom DNS**.

You will paste Cloudflare’s two nameservers here after step 3.

## 3. Cloudflare — add the site

In the Cloudflare tab:

1. **Add a domain** → `helpmegetaround.com` → **Free**
2. Copy the two nameservers (example: `ada.ns.cloudflare.com` and `bob.ns.cloudflare.com`)
3. Paste them into Namecheap Custom DNS for helpmegetaround.com → **Save**
4. Wait until Cloudflare says the site is **Active** (can take a few minutes to a few hours)

Leave SSL/TLS on **Full** (not Full Strict) until the tunnel is up.

## 4. On your PC — site + named tunnel

1. `c:\AI\AElinkGenerator\open.bat` (Portals signed in, http://localhost:3000 works)
2. `install-cloudflared.bat` if needed, new Command Prompt
3. Run `setup-named-tunnel.bat` and follow the prompts
4. Keep both windows open

Public URL: **https://helpmegetaround.com**

## 5. What “upload” means here

There is nothing to FTP into Namecheap. The website files stay in `c:\AI\AElinkGenerator\` and are served by `open.bat`. Cloudflare only publishes that to the domain.
