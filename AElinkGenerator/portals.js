"use strict";

const GENERATOR_URL =
  "https://portals.aliexpress.com/affiportals/web/link_generator.htm";
const CLICK_LINK_RE = /https?:\/\/s\.click\.aliexpress\.com\/[^\s"'<>\\]+/gi;

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
    new Set((String(text || "").match(CLICK_LINK_RE) || []).map((link) => link.replace(/[),.;]+$/, "")))
  );
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

  async function openGenerator() {
    const current = await ensurePage();
    if (!/link_generator/i.test(current.url())) {
      await current.goto(GENERATOR_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    }
    return current;
  }

  async function isLoggedIn(current) {
    const bodyText = (await current.locator("body").innerText().catch(() => "")) || "";
    const url = current.url();
    if (/login\.aliexpress|passport\.aliexpress|signin/i.test(url)) return false;
    if (/sign in|log in|please login/i.test(bodyText) && !/get tracking link|link generator/i.test(bodyText)) {
      return false;
    }
    return true;
  }

  async function refresh() {
    return mutex(async () => {
      const current = await ensurePage();
      await current.goto(GENERATOR_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    });
  }

  async function getStatus() {
    try {
      const current = await openGenerator();
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
        const current = await openGenerator();
        if (!(await isLoggedIn(current))) {
          lastError =
            "Portals is logged out in the app Chrome window. Sign in there (not in your normal Chrome), then retry.";
          throw new Error(lastError);
        }

        const labeled = current.getByLabel(/url/i);
        const placeholder = current.getByPlaceholder(/url|http|aliexpress/i);
        const fallback = current.locator(
          'input[type="text"], input[type="url"], textarea, .next-input input'
        );
        const urlBox = (await labeled.count())
          ? labeled.first()
          : (await placeholder.count())
            ? placeholder.first()
            : fallback.first();
        await urlBox.waitFor({ state: "visible", timeout: 15000 });
        await urlBox.fill(productUrl);

        const namedButton = current.getByRole("button", { name: /get tracking link|generate/i });
        const button = (await namedButton.count())
          ? namedButton.first()
          : current.locator("button").filter({ hasText: /get tracking link|generate/i }).first();
        const before = extractClickLinks(await current.content());
        await button.click();

        const deadline = Date.now() + 25000;
        while (Date.now() < deadline) {
          const html = await current.content();
          const text = await current.locator("body").innerText().catch(() => "");
          const found = extractClickLinks(html + "\n" + text).filter((link) => !before.includes(link));
          if (found.length) {
            lastError = null;
            return { ok: true, affiliateUrl: found[found.length - 1], productUrl: productUrl };
          }
          if (/not in (the )?affiliate program|cannot promote|failed to generate/i.test(text)) {
            lastError = "AliExpress did not generate a link for this product.";
            throw new Error(lastError);
          }
          await current.waitForTimeout(250);
        }
        lastError = "Timed out waiting for Portals to generate a tracking link.";
        throw new Error(lastError);
      } catch (err) {
        lastError = friendlyLaunchError(err);
        throw new Error(lastError);
      }
    });
  }

  async function start() {
    await openGenerator();
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
