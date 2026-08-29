#!/usr/bin/env node
"use strict";

/**
 * Sets Cloudflare DNS for helpmegetaround.com → Namecheap shared hosting.
 * Requires env: CLOUDFLARE_API_TOKEN, NAMECHEAP_HOSTING_IP
 */

const ZONE = "helpmegetaround.com";
const token = process.env.CLOUDFLARE_API_TOKEN;
const ip = process.env.NAMECHEAP_HOSTING_IP;

if (!token || !ip) {
  console.error("Set CLOUDFLARE_API_TOKEN and NAMECHEAP_HOSTING_IP.");
  process.exit(1);
}

async function api(path, opts) {
  const res = await fetch("https://api.cloudflare.com/client/v4" + path, {
    ...opts,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      ...(opts && opts.headers),
    },
  });
  const body = await res.json();
  if (!body.success) {
    throw new Error(JSON.stringify(body.errors || body));
  }
  return body.result;
}

async function main() {
  const zones = await api("/zones?name=" + ZONE);
  if (!zones.length) {
    throw new Error("Zone not found: " + ZONE);
  }
  const zoneId = zones[0].id;
  console.log("Zone:", ZONE, zoneId);

  const existing = await api("/zones/" + zoneId + "/dns_records?per_page=100");

  for (const rec of existing) {
    const name = rec.name.replace(/\.$/, "");
    if (
      (rec.type === "A" && (name === ZONE || name === "@" )) ||
      (rec.type === "CNAME" && name === "www." + ZONE) ||
      (rec.type === "CNAME" && rec.content && rec.content.includes("cfargotunnel.com"))
    ) {
      console.log("Deleting", rec.type, rec.name);
      await api("/zones/" + zoneId + "/dns_records/" + rec.id, { method: "DELETE" });
    }
  }

  console.log("Creating A @ →", ip);
  await api("/zones/" + zoneId + "/dns_records", {
    method: "POST",
    body: JSON.stringify({
      type: "A",
      name: "@",
      content: ip,
      proxied: true,
      ttl: 1,
    }),
  });

  console.log("Creating CNAME www →", ZONE);
  await api("/zones/" + zoneId + "/dns_records", {
    method: "POST",
    body: JSON.stringify({
      type: "CNAME",
      name: "www",
      content: ZONE,
      proxied: true,
      ttl: 1,
    }),
  });

  console.log("Done. Test https://" + ZONE + " in a few minutes.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
