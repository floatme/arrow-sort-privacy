"use strict";

const os = require("os");
const path = require("path");
const express = require("express");
const affiliate = require("./converter.js");
const { generateWithAffiliateApi } = require("./affiliate-api.js");
const { createPortalsGenerator } = require("./portals.js");

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

function createRateLimiter(windowMs, maxHits) {
  const hits = new Map();
  return function check(key) {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((ts) => now - ts < windowMs);
    if (recent.length >= maxHits) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

function createApp(options) {
  const generate = options.generate;
  const getStatus = options.getStatus || (async () => ({ ok: true }));
  const allowOrigin = options.corsOrigin || "*";
  const limiter = createRateLimiter(options.rateWindowMs || 60 * 1000, options.rateMax || 12);

  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });
  app.use(express.json({ limit: "16kb" }));
  app.use(express.static(path.join(__dirname, "public")));

  app.get("/api/health", async (_req, res) => {
    try {
      const status = await getStatus();
      res.json({
        ok: status.ok !== false,
        mode: status.mode || options.mode || "unknown",
        loggedIn: status.loggedIn,
        detail: status.detail,
        lastError: status.lastError || undefined,
      });
    } catch (err) {
      res.status(503).json({ ok: false, error: String((err && err.message) || "unavailable") });
    }
  });

  app.get("/api/progress", (_req, res) => {
    const goalNis = Number(options.goalNis || process.env.GOAL_NIS || 40000);
    const earnedNis = Number(options.earnedNis || process.env.EARNED_NIS || 0);
    const remainingNis = Math.max(0, goalNis - earnedNis);
    const percentage = goalNis > 0 ? Math.min(100, Math.round((earnedNis / goalNis) * 100)) : 0;
    res.json({
      ok: true,
      earnedNis,
      goalNis,
      remainingNis,
      percentage,
    });
  });

  app.post("/api/convert", async (req, res) => {
    if (!limiter(clientIp(req))) {
      return res.status(429).json({ ok: false, error: "Too many requests. Please wait a moment." });
    }
    const raw = req.body && (req.body.url || req.body.link);
    const prepared = affiliate.prepareSourceUrl(raw);
    if (!prepared.ok) {
      return res.status(400).json({ ok: false, error: prepared.error });
    }
    try {
      const generated = await generate(prepared.productUrl);
      if (!generated || !generated.ok || !generated.affiliateUrl) {
        return res.status(502).json({
          ok: false,
          error: (generated && generated.error) || "Could not generate a link right now.",
        });
      }
      return res.json({
        ok: true,
        affiliateUrl: generated.affiliateUrl,
        productUrl: prepared.productUrl,
        productId: prepared.productId,
      });
    } catch (err) {
      console.error("convert failed:", err.message);
      const detail = String((err && err.message) || "").trim();
      if (detail === "NOT_AFFILIATE" || /not.?affiliate|not in (the )?affiliate program/i.test(detail)) {
        return res.status(422).json({
          ok: false,
          code: "not_affiliate",
          error:
            "This product isn’t in the AliExpress affiliate program, so it can’t be converted. Thank you for trying :)",
        });
      }
      return res.status(503).json({
        ok: false,
        error:
          detail ||
          "The link generator is unavailable. Try again in a minute.",
      });
    }
  });

  return app;
}

function hasApiCredentials(env) {
  return Boolean(env.ALIEXPRESS_APP_KEY && env.ALIEXPRESS_APP_SECRET && env.ALIEXPRESS_TRACKING_ID);
}

async function createGenerator(env) {
  if (env.MOCK_GENERATOR === "1") {
    return {
      mode: "mock",
      generate: async (productUrl) => ({
        ok: true,
        affiliateUrl: "https://s.click.aliexpress.com/e/_DemoAffiliate",
        productUrl: productUrl,
      }),
      getStatus: async () => ({ mode: "mock" }),
      start: async () => {},
      stop: async () => {},
    };
  }

  if (hasApiCredentials(env)) {
    return {
      mode: "api",
      generate: (productUrl) => generateWithAffiliateApi(productUrl, env),
      getStatus: async () => ({ mode: "api" }),
      start: async () => {},
      stop: async () => {},
    };
  }

  const portals = await createPortalsGenerator({
    profileDir: path.join(__dirname, "profile"),
    keepAliveMs: Number(env.KEEP_ALIVE_MS || 25 * 60 * 1000),
    headless: env.PORTALS_HEADLESS === "1",
  });
  return portals;
}

async function start(env) {
  const config = env || process.env;
  const generator = await createGenerator(config);
  if (generator.start) await generator.start();
  const app = createApp({
    generate: (url) => generator.generate(url),
    getStatus: generator.getStatus || (async () => ({ mode: generator.mode })),
    mode: generator.mode,
    corsOrigin: config.CORS_ORIGIN || "*",
  });
  const port = Number(config.PORT || 3000);
  const server = app.listen(port, "0.0.0.0", () => {
    console.log("Website on this PC: http://localhost:" + port);
    lanAddresses().forEach((ip) => {
      console.log("Same Wi-Fi:        http://" + ip + ":" + port);
    });
    if (generator.mode === "portals") {
      console.log("IMPORTANT: A separate Chrome window will open for Portals.");
      console.log("Sign in THERE (your normal Chrome login does not count).");
      console.log("Leave this window and that Chrome profile running. It refreshes every 25 minutes.");
      console.log("Keep the PC awake (plugged in, sleep set to Never).");
    } else {
      console.log("Using AliExpress Affiliate API credentials.");
    }
  });
  return { app, server, generator };
}

if (require.main === module) {
  start(process.env).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

function lanAddresses() {
  const out = [];
  const ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach((name) => {
    (ifaces[name] || []).forEach((iface) => {
      const family = iface.family === 4 || iface.family === "IPv4";
      if (family && !iface.internal) out.push(iface.address);
    });
  });
  return out;
}

module.exports = { createApp, start, hasApiCredentials };
