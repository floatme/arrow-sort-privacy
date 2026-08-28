const GENERATOR_URL =
  "https://portals.aliexpress.com/affiportals/web/link_generator.htm";
const KEEP_ALIVE_MINUTES = 25;
const ALARM_NAME = "ae-portals-keepalive";

chrome.runtime.onInstalled.addListener(() => {
  startKeepAlive();
});

chrome.runtime.onStartup.addListener(() => {
  startKeepAlive();
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});

function startKeepAlive() {
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: KEEP_ALIVE_MINUTES,
    periodInMinutes: KEEP_ALIVE_MINUTES,
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  const busy = await chrome.storage.session.get("generating");
  if (busy.generating) return;
  const tab = await findGeneratorTab();
  if (!tab) return;
  try {
    await chrome.tabs.reload(tab.id);
    await chrome.storage.local.set({ lastRefresh: Date.now() });
  } catch (err) {
    console.warn("Keep-alive refresh failed", err);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String(err && err.message ? err.message : err) }));
  return true;
});

async function handleMessage(message) {
  if (message.type === "status") return status();
  if (message.type === "openGenerator") return openGenerator();
  if (message.type === "generate") return generate(message.url);
  return { ok: false, error: "Unknown message." };
}

function isGeneratorUrl(url) {
  if (!url) return false;
  return /portals\.aliexpress\.com/i.test(url) && /link_generator/i.test(url);
}

async function findGeneratorTab() {
  const tabs = await chrome.tabs.query({
    url: ["https://portals.aliexpress.com/*", "https://star.aliexpress.com/*"],
  });
  return (
    tabs.find((tab) => isGeneratorUrl(tab.url)) ||
    tabs.find((tab) => /portals\.aliexpress\.com/i.test(tab.url || "")) ||
    null
  );
}

async function status() {
  const tab = await findGeneratorTab();
  const stored = await chrome.storage.local.get(["lastRefresh"]);
  return {
    ok: true,
    connected: Boolean(tab),
    tabTitle: tab ? tab.title : null,
    tabUrl: tab ? tab.url : null,
    lastRefresh: stored.lastRefresh || null,
    keepAliveMinutes: KEEP_ALIVE_MINUTES,
    generatorUrl: GENERATOR_URL,
  };
}

async function openGenerator() {
  const existing = await findGeneratorTab();
  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId) await chrome.windows.update(existing.windowId, { focused: true });
    return { ok: true, reused: true };
  }
  await chrome.tabs.create({ url: GENERATOR_URL, active: true });
  return { ok: true, reused: false };
}

async function generate(url) {
  const tab = await findGeneratorTab();
  if (!tab) {
    return {
      ok: false,
      error:
        "Open the AliExpress Link Generator tab first, stay logged in, then convert again.",
    };
  }

  await chrome.storage.session.set({ generating: true });
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["page-hook.js"],
      world: "MAIN",
    }).catch(() => {});
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["content.js"],
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: (productUrl) => {
        if (!window.__AELinkGenerator || typeof window.__AELinkGenerator.generate !== "function") {
          return { ok: false, error: "Link Generator page is not ready. Refresh that tab once and retry." };
        }
        return window.__AELinkGenerator.generate(productUrl);
      },
      args: [url],
    });

    const useful = (results || [])
      .map((entry) => entry && entry.result)
      .filter(Boolean);
    const success = useful.find((result) => result.ok);
    if (success) return success;

    const failure = useful.find((result) => result.error) || {
      ok: false,
      error: "Could not control the Link Generator tab. Refresh that page once, keep it open, and try again.",
    };
    return failure;
  } finally {
    await chrome.storage.session.set({ generating: false });
  }
}
