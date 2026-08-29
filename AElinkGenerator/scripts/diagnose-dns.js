#!/usr/bin/env node
"use strict";

const DOMAIN = "helpmegetaround.com";

async function doh(name, type) {
  const url =
    "https://cloudflare-dns.com/dns-query?name=" +
    encodeURIComponent(name) +
    "&type=" +
    type;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  return res.json();
}

async function main() {
  console.log("DNS diagnosis for", DOMAIN);
  console.log("=".repeat(50));

  const ns = await doh(DOMAIN, "NS");
  const a = await doh(DOMAIN, "A");
  const www = await doh("www." + DOMAIN, "CNAME");

  if (ns.Status === 2) {
    console.log("\nPROBLEM: No working nameservers (SERVFAIL / lame delegation).");
    console.log("The domain points at Cloudflare NS but there is no active zone,");
    console.log("or Namecheap Custom DNS does not match your Cloudflare account.");
    if (ns.Comment) console.log("\nDetail:", ns.Comment);
    console.log("\nFix:");
    console.log("  1. https://dash.cloudflare.com → Add site →", DOMAIN);
    console.log("  2. Copy the two nameservers Cloudflare gives you.");
    console.log("  3. Namecheap → Domain List →", DOMAIN, "→ Custom DNS → paste → Save.");
    console.log("  4. Wait until Cloudflare shows Active, then run connect-helpmegetaround.bat");
    process.exit(1);
  }

  if (ns.Answer && ns.Answer.length) {
    console.log("\nNameservers:");
    for (const r of ns.Answer) console.log(" ", r.data);
  } else {
    console.log("\nNo NS records returned.");
  }

  if (a.Answer && a.Answer.length) {
    console.log("\nA records (@):");
    for (const r of a.Answer) console.log(" ", r.data);
  } else {
    console.log("\nNo A records for @ — site will not load via A record.");
  }

  if (www.Answer && www.Answer.length) {
    console.log("\nwww CNAME:");
    for (const r of www.Answer) console.log(" ", r.data);
  } else {
    console.log("\nNo www CNAME.");
  }

  const hasTunnel = [a, www].some(
    (r) => r.Answer && r.Answer.some((x) => String(x.data).includes("cfargotunnel.com"))
  );

  console.log("\n" + "=".repeat(50));
  if (hasTunnel) {
    console.log("DNS looks set for Cloudflare Tunnel.");
    console.log("Run open.bat + cloudflared tunnel run aelinkgenerator on your PC.");
  } else if (a.Answer && a.Answer.length) {
    console.log("DNS points at hosting IP(s). Good for static files on Namecheap.");
    console.log("Note: the Node converter cannot run on Namecheap shared hosting.");
  } else {
    console.log("DNS is incomplete. Run connect-helpmegetaround.bat on your Windows PC,");
    console.log("or set CLOUDFLARE_API_TOKEN and run scripts/set-cloudflare-dns.js");
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
