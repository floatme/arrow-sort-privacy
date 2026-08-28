(() => {
  if (window.__AELinkGeneratorHook) return;
  window.__AELinkGeneratorHook = true;

  function publish(text) {
    try {
      window.postMessage({ source: "aelinkgenerator-hook", text: String(text || "") }, "*");
    } catch (err) {}
  }

  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = function () {
      return originalFetch.apply(this, arguments).then((response) => {
        try {
          const clone = response.clone();
          clone.text().then((text) => {
            if (/s\.click\.aliexpress|promotion_link|trackingLink|tracking_link|targetUrl/i.test(text)) {
              publish(text);
            }
          }).catch(() => {});
        } catch (err) {}
        return response;
      });
    };
  }

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__aeUrl = url;
    return originalOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener("load", function () {
      try {
        const text = this.responseText || "";
        if (/s\.click\.aliexpress|promotion_link|trackingLink|tracking_link/i.test(text)) {
          publish(text);
        }
      } catch (err) {}
    });
    return originalSend.apply(this, arguments);
  };
})();
