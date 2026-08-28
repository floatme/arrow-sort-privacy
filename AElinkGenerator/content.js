(() => {
  if (window.__AELinkGenerator) return;

  const CLICK_LINK_RE = /https?:\/\/s\.click\.aliexpress\.com\/[^\s"'<>\\]+/gi;
  const BUTTON_RE = /get\s*tracking\s*link|get\s*track(ing)?\s*link|generate(\s*link)?/i;
  const URL_LABEL_RE = /page'?s?\s*url|target\s*url|product\s*url|destination|\burl\b/i;

  let lastNetworkText = "";
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== "aelinkgenerator-hook") return;
    lastNetworkText = String(event.data.text || "");
  });

  function visible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function textOf(el) {
    return String((el && (el.innerText || el.textContent || el.value || el.getAttribute("aria-label") || "")) || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function collectClickLinks(root) {
    const haystack = [
      root.innerText || "",
      ...Array.from(root.querySelectorAll("a, input, textarea")).map((el) => el.href || el.value || ""),
      lastNetworkText,
    ].join(" ");
    return Array.from(new Set((haystack.match(CLICK_LINK_RE) || []).map((link) => link.replace(/[),.;]+$/, ""))));
  }

  function findUrlInput() {
    const nodes = Array.from(
      document.querySelectorAll(
        'input[type="text"], input[type="url"], input:not([type]), textarea, .next-input input, .ant-input'
      )
    ).filter((el) => !el.disabled && visible(el) && el.type !== "hidden");

    for (const el of nodes) {
      const bits = [
        el.placeholder,
        el.name,
        el.id,
        el.getAttribute("aria-label"),
        el.getAttribute("title"),
        labelTextFor(el),
      ]
        .join(" ")
        .toLowerCase();
      if (URL_LABEL_RE.test(bits) || /http|aliexpress/i.test(el.placeholder || "")) return el;
    }
    return nodes[0] || null;
  }

  function labelTextFor(el) {
    if (el.id) {
      const byFor = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (byFor) return textOf(byFor);
    }
    const parentLabel = el.closest("label");
    if (parentLabel) return textOf(parentLabel);
    const group = el.closest(".next-form-item, .ant-form-item, .form-group, li, tr, .item");
    if (group) {
      const label = group.querySelector("label, .next-form-item-label, .ant-form-item-label");
      if (label) return textOf(label);
    }
    return "";
  }

  function findButton() {
    const candidates = Array.from(
      document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]')
    );
    return (
      candidates.find((el) => BUTTON_RE.test(textOf(el)) && visible(el) && !el.disabled) ||
      candidates.find((el) => /primary|next-btn-primary/i.test(el.className || "") && visible(el) && /get|generate|link/i.test(textOf(el))) ||
      null
    );
  }

  function setInputValue(el, value) {
    el.focus();
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) descriptor.set.call(el, value);
    else el.value = value;
    if (el._valueTracker) el._valueTracker.setValue("");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
  }

  function looksLoggedOut() {
    const text = (document.body && document.body.innerText) || "";
    if (findUrlInput() && findButton()) return false;
    return /sign in|log in|login|join now|please login/i.test(text);
  }

  function showBanner(message) {
    let banner = document.getElementById("aelinkgenerator-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "aelinkgenerator-banner";
      banner.style.cssText =
        "position:fixed;z-index:2147483647;top:12px;right:12px;max-width:360px;background:#c13b24;color:#fff;padding:10px 14px;border-radius:10px;font:600 14px/1.4 sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);";
      document.documentElement.appendChild(banner);
    }
    banner.textContent = message;
    clearTimeout(showBanner.timer);
    showBanner.timer = setTimeout(() => banner.remove(), 8000);
  }

  function extractLinkFromNetwork(text) {
    const matches = String(text || "").match(CLICK_LINK_RE) || [];
    if (matches.length) return matches[matches.length - 1].replace(/[),.;]+$/, "");
    try {
      const json = JSON.parse(text);
      const blob = JSON.stringify(json);
      const fromJson = blob.match(CLICK_LINK_RE);
      if (fromJson) return fromJson[fromJson.length - 1];
    } catch (err) {}
    return null;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function generate(productUrl) {
    if (looksLoggedOut()) {
      return { ok: false, error: "AliExpress Portals looks logged out. Log in on that tab, then try again." };
    }

    const input = findUrlInput();
    const button = findButton();
    if (!input || !button) {
      return {
        ok: false,
        error: "This tab does not look like the Link Generator. Open link_generator.htm and keep it in the foreground.",
      };
    }

    lastNetworkText = "";
    const before = new Set(collectClickLinks(document));
    setInputValue(input, productUrl);
    showBanner("Generating affiliate link…");
    button.click();

    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const fromNet = extractLinkFromNetwork(lastNetworkText);
      if (fromNet && !before.has(fromNet)) {
        showBanner("Affiliate link ready.");
        return { ok: true, affiliateUrl: fromNet, productUrl: productUrl };
      }
      const now = collectClickLinks(document).filter((link) => !before.has(link));
      if (now.length) {
        showBanner("Affiliate link ready.");
        return { ok: true, affiliateUrl: now[now.length - 1], productUrl: productUrl };
      }
      const pageText = (document.body && document.body.innerText) || "";
      if (/not in (the )?affiliate program|cannot promote|no promotion|failed to generate/i.test(pageText)) {
        return { ok: false, error: "AliExpress did not generate a link. This product may be outside the affiliate program." };
      }
      await wait(250);
    }

    return {
      ok: false,
      error: "Timed out waiting for Portals to generate the tracking link. Refresh that tab and try once more.",
    };
  }

  window.__AELinkGenerator = {
    generate: generate,
    isGeneratorPage: function () {
      return Boolean(findUrlInput() && findButton());
    },
  };

  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!message || message.type !== "generate") return;
      Promise.resolve(generate(message.url)).then(sendResponse);
      return true;
    });
  }
})();
