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

  async function ensurePage() {
    if (page && !page.isClosed()) return page;
    if (!context) {
      context = await playwright.chromium.launchPersistentContext(profileDir, {
        headless: headless,
        channel: options.channel || "chrome",
        viewport: { width: 1280, height: 900 },
        args: ["--disable-blink-features=AutomationControlled"],
      });
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

  async function refresh() {
    return mutex(async () => {
      const current = await ensurePage();
      await current.goto(GENERATOR_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    });
  }

  async function generate(productUrl) {
    return mutex(async () => {
      const current = await openGenerator();
      const bodyText = (await current.locator("body").innerText().catch(() => "")) || "";
      if (/sign in|log in|please login/i.test(bodyText) && !/get tracking link/i.test(bodyText)) {
        throw new Error("Portals is logged out. Sign in on the Chrome window this server opened, then retry.");
      }

      const labeled = current.getByLabel(/url/i);
      const placeholder = current.getByPlaceholder(/url|http|aliexpress/i);
      const fallback = current.locator('input[type="text"], input[type="url"], textarea, .next-input input');
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
          return { ok: true, affiliateUrl: found[found.length - 1], productUrl: productUrl };
        }
        if (/not in (the )?affiliate program|cannot promote|failed to generate/i.test(text)) {
          throw new Error("AliExpress did not generate a link for this product.");
        }
        await current.waitForTimeout(250);
      }
      throw new Error("Timed out waiting for Portals to generate a tracking link.");
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
  };
}

module.exports = {
  GENERATOR_URL,
  extractClickLinks,
  createPortalsGenerator,
};
