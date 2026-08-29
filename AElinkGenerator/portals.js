"use strict";

const fs = require("fs");
const path = require("path");

const GENERATOR_URL =
  "https://portals.aliexpress.com/affiportals/web/link_generator.htm";
const CLICK_LINK_RE =
  /https?:\/\/(?:s\.click\.aliexpress\.com|a\.aliexpress\.com)\/[^\s"'<>\\\]]+/gi;

function createMutex() {
  let queue = Promise.resolve();
  return function run(fn) {
    const next = queue.then(fn, fn);
    queue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  };
}

function extractClickLinks(text) {
  return Array.from(
    new Set(
      (String(text || "").match(CLICK_LINK_RE) || []).map((link) =>
        link.replace(/[),.;]+$/, "").replace(/&amp;/g, "&")
      )
    )
  );
}

function writeDebug(profileDir, name, body) {
  try {
    const dir = path.join(path.dirname(profileDir), "logs");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), body, "utf8");
  } catch (_err) {
    /* ignore */
  }
}

async function createPortalsGenerator(options) {
  const playwright = options.playwright || require("playwright-core");
  const profileDir = options.profileDir;
  const keepAliveMs = options.keepAliveMs || 25 * 60 * 1000;
  const headless = Boolean(options.headless);
  const mutex = createMutex();
  let context;
  let page;
  let timer;
  let lastError = null;

  function friendlyLaunchError(err) {
    const message = String((err && err.message) || err || "");
    if (/user data directory is already in use|SingletonLock|ProcessSingleton/i.test(message)) {
      return (
        "The Portals Chrome profile is locked. Close other AElinkGenerator Chrome windows " +
        "(and any leftover chrome.exe using the profile folder), then restart open.bat / start-all.bat. " +
        "Signing in to your normal Chrome does not count — this app uses its own Chrome window."
      );
    }
    if (/Executable doesn't exist|Failed to launch|browserType\.launch/i.test(message)) {
      return "Could not launch Google Chrome for Portals. Install Chrome, then restart the converter.";
    }
    return message || "Portals automation failed.";
  }

  async function ensurePage() {
    if (page && !page.isClosed()) return page;
    if (!context) {
      try {
        context = await playwright.chromium.launchPersistentContext(profileDir, {
          headless: headless,
          channel: options.channel || "chrome",
          viewport: { width: 1280, height: 900 },
          args: ["--disable-blink-features=AutomationControlled"],
        });
      } catch (err) {
        lastError = friendlyLaunchError(err);
        throw new Error(lastError);
      }
    }
    page = context.pages()[0] || (await context.newPage());
    return page;
  }

  async function openGenerator(forceReload) {
    const current = await ensurePage();
    const onGenerator = /link_generator/i.test(current.url());
    if (forceReload || !onGenerator) {
      await current.goto(GENERATOR_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
      await current.waitForTimeout(800);
    }
    return current;
  }

  async function isLoggedIn(current) {
    const bodyText = (await current.locator("body").innerText().catch(() => "")) || "";
    const url = current.url();
    if (/login\.aliexpress|passport\.aliexpress|signin/i.test(url)) return false;
    if (
      /sign in|log in|please login|login \/ register/i.test(bodyText) &&
      !/get tracking link|link generator|tracking link/i.test(bodyText)
    ) {
      return false;
    }
    return true;
  }

  async function findUrlBox(current) {
    const candidates = [
      current.getByLabel(/url|product|link/i),
      current.getByPlaceholder(/url|http|aliexpress|paste|product/i),
      current.locator("textarea"),
      current.locator('input[type="url"]'),
      current.locator('input[type="text"]'),
      current.locator(".next-input input"),
      current.locator('[contenteditable="true"]'),
    ];
    for (const locator of candidates) {
      const count = await locator.count().catch(() => 0);
      for (let i = 0; i < count; i += 1) {
        const item = locator.nth(i);
        if (await item.isVisible().catch(() => false)) return item;
      }
    }
    return null;
  }

  async function findGenerateButton(current) {
    const named = current.getByRole("button", {
      name: /get tracking link|generate|get link|create|获取|生成/i,
    });
    if (await named.count()) return named.first();
    const byText = current.locator("button, a, [role='button'], .next-btn").filter({
      hasText: /get tracking link|generate|get link|tracking|获取|生成/i,
    });
    if (await byText.count()) return byText.first();
    return null;
  }

  async function collectLinks(current) {
    const html = await current.content();
    const text = (await current.locator("body").innerText().catch(() => "")) || "";
    const fromDom = extractClickLinks(html + "\n" + text);
    const inputValues = await current
      .locator("input, textarea")
      .evaluateAll((nodes) => nodes.map((n) => n.value || n.textContent || "").join("\n"))
      .catch(() => "");
    return extractClickLinks(fromDom.join("\n") + "\n" + inputValues);
  }

  async function refresh() {
    return mutex(async () => {
      await openGenerator(true);
    });
  }

  async function getStatus() {
    try {
      const current = await openGenerator(false);
      const loggedIn = await isLoggedIn(current);
      return {
        mode: "portals",
        loggedIn,
        url: current.url(),
        lastError: lastError,
        ok: loggedIn,
        detail: loggedIn
          ? "Portals Chrome is open and signed in."
          : "Portals Chrome is open but not signed in. Use the Chrome window opened by this app (not your normal Chrome), sign in, then retry.",
      };
    } catch (err) {
      lastError = friendlyLaunchError(err);
      return {
        mode: "portals",
        loggedIn: false,
        ok: false,
        lastError: lastError,
        detail: lastError,
      };
    }
  }

  async function generate(productUrl) {
    return mutex(async () => {
      try {
        const current = await openGenerator(true);
        if (!(await isLoggedIn(current))) {
          lastError =
            "Portals is logged out in the app Chrome window. Sign in there (not in your normal Chrome), then retry.";
          writeDebug(profileDir, "last-convert-error.txt", lastError + "\nURL: " + current.url());
          throw new Error(lastError);
        }

        const urlBox = await findUrlBox(current);
        if (!urlBox) {
          lastError =
            "Could not find the URL box on the Portals Link Generator page. Make sure that tab shows the link generator (not another Portals page).";
          writeDebug(
            profileDir,
            "last-convert-error.txt",
            lastError + "\nURL: " + current.url() + "\n\n" + (await current.locator("body").innerText().catch(() => ""))
          );
          throw new Error(lastError);
        }

        await urlBox.click({ timeout: 5000 }).catch(() => {});
        await urlBox.fill("");
        await urlBox.fill(productUrl);
        await current.waitForTimeout(200);

        const button = await findGenerateButton(current);
        const before = await collectLinks(current);
        if (button) {
          await button.click({ timeout: 10000 });
        } else {
          await urlBox.press("Enter").catch(() => {});
        }

        const deadline = Date.now() + 45000;
        while (Date.now() < deadline) {
          const found = (await collectLinks(current)).filter((link) => !before.includes(link));
          if (found.length) {
            lastError = null;
            writeDebug(profileDir, "last-convert-error.txt", "OK: " + found[found.length - 1]);
            return { ok: true, affiliateUrl: found[found.length - 1], productUrl: productUrl };
          }
          const text = (await current.locator("body").innerText().catch(() => "")) || "";
          if (
            /not in (the )?affiliate program|cannot promote|failed to generate|no commission|not support|not eligible|does not support/i.test(
              text
            )
          ) {
            lastError = "NOT_AFFILIATE";
            writeDebug(profileDir, "last-convert-error.txt", "NOT_AFFILIATE\n\n" + text.slice(0, 2000));
            throw new Error(lastError);
          }
          await current.waitForTimeout(300);
        }

        const snippet = ((await current.locator("body").innerText().catch(() => "")) || "").slice(0, 1500);
        lastError = "NOT_AFFILIATE";
        writeDebug(
          profileDir,
          "last-convert-error.txt",
          "NOT_AFFILIATE (timeout / no tracking link)\nURL: " +
            current.url() +
            "\nProduct: " +
            productUrl +
            "\n\n" +
            snippet
        );
        throw new Error(lastError);
      } catch (err) {
        lastError = friendlyLaunchError(err);
        writeDebug(profileDir, "last-convert-error.txt", lastError);
        throw new Error(lastError);
      }
    });
  }

  async function start() {
    await openGenerator(true);
    timer = setInterval(() => {
      refresh().catch((err) => console.warn("Portals keep-alive failed:", err.message));
    }, keepAliveMs);
    if (typeof timer.unref === "function") timer.unref();
  }

  async function stop() {
    if (timer) clearInterval(timer);
    if (context) await context.close();
    context = null;
    page = null;
  }

  return {
    mode: "portals",
    start,
    stop,
    refresh,
    generate,
    getStatus,
  };
}

module.exports = {
  GENERATOR_URL,
  extractClickLinks,
  createPortalsGenerator,
};
