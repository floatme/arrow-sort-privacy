#!/usr/bin/env node
"use strict";

/**
 * Cloudflare DNS for helpmegetaround.com.
 *
 * Static hosting (Namecheap):
 *   CLOUDFLARE_API_TOKEN, NAMECHEAP_HOSTING_IP
 *
 * Cloudflare Tunnel (desktop Node app):
 *   CLOUDFLARE_API_TOKEN, CLOUDFLARE_TUNNEL_ID  (uuid from cloudflared tunnel list)
 */

const ZONE = "helpmegetaround.com";
const token = process.env.CLOUDFLARE_API_TOKEN;
const ip = process.env.NAMECHEAP_HOSTING_IP;
const tunnelId = process.env.CLOUDFLARE_TUNNEL_ID;

if (!token) {
  console.error("Set CLOUDFLARE_API_TOKEN (Edit zone DNS for " + ZONE + ").");
  process.exit(1);
}
if (!ip && !tunnelId) {
  console.error("Set NAMECHEAP_HOSTING_IP (static hosting) OR CLOUDFLARE_TUNNEL_ID (tunnel).");
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
    throw new Error(
      "Zone not found in this Cloudflare account: " +
        ZONE +
        ". Add the site at https://dash.cloudflare.com first."
    );
  }
  const zoneId = zones[0].id;
  console.log("Zone:", ZONE, zoneId);

  const existing = await api("/zones/" + zoneId + "/dns_records?per_page=100");

  for (const rec of existing) {
    const name = rec.name.replace(/\.$/, "");
    const isRoot = name === ZONE;
    const isWww = name === "www." + ZONE;
    const isTunnel =
      rec.type === "CNAME" && rec.content && rec.content.includes("cfargotunnel.com");
    if (isRoot || isWww || isTunnel) {
      console.log("Deleting", rec.type, rec.name);
      await api("/zones/" + zoneId + "/dns_records/" + rec.id, { method: "DELETE" });
    }
  }

  if (tunnelId) {
    const target = tunnelId + ".cfargotunnel.com";
    console.log("Creating CNAME @ →", target);
    await api("/zones/" + zoneId + "/dns_records", {
      method: "POST",
      body: JSON.stringify({
        type: "CNAME",
        name: "@",
        content: target,
        proxied: true,
        ttl: 1,
      }),
    });
    console.log("Creating CNAME www →", target);
    await api("/zones/" + zoneId + "/dns_records", {
      method: "POST",
      body: JSON.stringify({
        type: "CNAME",
        name: "www",
        content: target,
        proxied: true,
        ttl: 1,
      }),
    });
  } else {
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
  }

  console.log("Done. Test https://" + ZONE + " in a few minutes.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
