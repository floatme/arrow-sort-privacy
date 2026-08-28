(function () {
  "use strict";

  var HISTORY_KEY = "ae-aff-history";
  var sourceInput = document.getElementById("sourceUrls");
  var convertBtn = document.getElementById("convertBtn");
  var clearBtn = document.getElementById("clearBtn");
  var statusEl = document.getElementById("status");
  var resultCard = document.getElementById("resultCard");
  var resultsEl = document.getElementById("results");
  var historyCard = document.getElementById("historyCard");
  var historyList = document.getElementById("historyList");
  var connectionPill = document.getElementById("connectionPill");
  var sessionHint = document.getElementById("sessionHint");
  var openGeneratorBtn = document.getElementById("openGenerator");
  var isExtension = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

  renderHistory();
  refreshStatus();
  setInterval(refreshStatus, 8000);

  function setStatus(message, kind) {
    statusEl.className = "status " + (kind || "");
    statusEl.textContent = message || "";
    statusEl.style.display = message ? "block" : "none";
  }

  function send(message) {
    return new Promise(function (resolve, reject) {
      if (!isExtension) {
        reject(new Error("Load this folder as an unpacked Chrome extension, then click the extension icon."));
        return;
      }
      chrome.runtime.sendMessage(message, function (response) {
        var err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(response || { ok: false, error: "No response from the extension." });
      });
    });
  }

  function formatAgo(ts) {
    if (!ts) return "not yet";
    var minutes = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (minutes < 1) return "just now";
    if (minutes === 1) return "1 minute ago";
    return minutes + " minutes ago";
  }

  function refreshStatus() {
    if (!isExtension) {
      connectionPill.className = "pill off";
      connectionPill.textContent = "Not running as an extension";
      sessionHint.textContent =
        "In Chrome open chrome://extensions, enable Developer mode, Load unpacked, and choose c:\\AI\\AElinkGenerator\\. Then click the extension icon. Keep the Portals Link Generator tab open.";
      return;
    }
    send({ type: "status" })
      .then(function (info) {
        connectionPill.className = "pill " + (info.connected ? "on" : "off");
        connectionPill.textContent = info.connected
          ? "Link Generator tab connected"
          : "Link Generator tab not found";
        var keep = info.keepAliveMinutes || 25;
        sessionHint.innerHTML =
          "Keep the official generator open and logged in. This extension refreshes that tab every " +
          keep +
          " minutes so AliExpress does not log you out. Last refresh: <strong>" +
          formatAgo(info.lastRefresh) +
          "</strong>.";
      })
      .catch(function () {
        connectionPill.className = "pill off";
        connectionPill.textContent = "Extension messaging failed";
      });
  }

  function history() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch (err) {
      return [];
    }
  }

  function pushHistory(entry) {
    var items = history().filter(function (item) {
      return item.affiliateUrl !== entry.affiliateUrl;
    });
    items.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 8)));
    renderHistory();
  }

  function renderHistory() {
    var items = history();
    historyCard.hidden = items.length === 0;
    historyList.innerHTML = "";
    items.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = item.affiliateUrl;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = item.productUrl || item.affiliateUrl;
      var copy = document.createElement("button");
      copy.type = "button";
      copy.textContent = "Copy";
      copy.addEventListener("click", function () {
        copyText(item.affiliateUrl, copy);
      });
      li.appendChild(a);
      li.appendChild(copy);
      historyList.appendChild(li);
    });
  }

  function copyText(text, button) {
    var original = button.textContent;
    function done() {
      button.textContent = "Copied";
      setTimeout(function () {
        button.textContent = original;
      }, 1500);
    }
    function fallback() {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      done();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else {
      fallback();
    }
  }

  function renderResults(batch) {
    resultsEl.innerHTML = "";
    resultCard.classList.toggle("visible", batch.length > 0);
    batch.forEach(function (result) {
      var item = document.createElement("div");
      item.className = "result-item" + (result.ok ? "" : " failed");
      var meta = document.createElement("p");
      meta.className = "meta";
      meta.textContent = result.ok
        ? result.productId
          ? "Product " + result.productId
          : "Converted with Portals"
        : result.error;
      item.appendChild(meta);
      var link = document.createElement("div");
      link.className = "result-link";
      link.textContent = result.ok ? result.affiliateUrl : result.input;
      item.appendChild(link);
      if (result.ok) {
        var actions = document.createElement("div");
        actions.className = "result-actions";
        var copy = document.createElement("button");
        copy.className = "ghost";
        copy.type = "button";
        copy.textContent = "Copy link";
        copy.addEventListener("click", function () {
          copyText(result.affiliateUrl, copy);
        });
        var open = document.createElement("a");
        open.className = "ghost";
        open.href = result.affiliateUrl;
        open.target = "_blank";
        open.rel = "noopener";
        open.textContent = "Open";
        actions.appendChild(copy);
        actions.appendChild(open);
        item.appendChild(actions);
        pushHistory({
          affiliateUrl: result.affiliateUrl,
          productUrl: result.productUrl,
        });
      }
      resultsEl.appendChild(item);
    });
  }

  async function convertNow() {
    var lines = String(sourceInput.value || "")
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);
    if (!lines.length) {
      resultCard.classList.remove("visible");
      setStatus("Paste at least one AliExpress link.", "error");
      return;
    }

    convertBtn.disabled = true;
    setStatus("Talking to the Portals Link Generator tab…", "ok");
    var batch = [];
    try {
      for (var i = 0; i < lines.length; i++) {
        var prepared = AliExpressAffiliate.prepareSourceUrl(lines[i]);
        if (!prepared.ok) {
          batch.push({ ok: false, error: prepared.error, input: lines[i] });
          continue;
        }
        setStatus("Generating link " + (i + 1) + " of " + lines.length + "…", "ok");
        var generated = await send({ type: "generate", url: prepared.productUrl });
        if (generated && generated.ok) {
          batch.push({
            ok: true,
            affiliateUrl: generated.affiliateUrl,
            productUrl: prepared.productUrl,
            productId: prepared.productId,
            input: lines[i],
          });
        } else {
          batch.push({
            ok: false,
            error: (generated && generated.error) || "Portals did not return a link.",
            input: lines[i],
          });
        }
      }
      renderResults(batch);
      var okCount = batch.filter(function (item) {
        return item.ok;
      }).length;
      if (okCount === batch.length) {
        setStatus(okCount === 1 ? "Affiliate link ready." : okCount + " affiliate links ready.", "ok");
      } else if (batch.length === 1) {
        setStatus(batch[0].error, "error");
      } else {
        setStatus("Some links could not be converted.", "error");
      }
    } catch (err) {
      setStatus(err.message || String(err), "error");
    } finally {
      convertBtn.disabled = false;
      refreshStatus();
    }
  }

  openGeneratorBtn.addEventListener("click", function () {
    if (!isExtension) {
      window.open("https://portals.aliexpress.com/affiportals/web/link_generator.htm", "_blank");
      return;
    }
    send({ type: "openGenerator" })
      .then(refreshStatus)
      .catch(function (err) {
        setStatus(err.message, "error");
      });
  });
  convertBtn.addEventListener("click", convertNow);
  clearBtn.addEventListener("click", function () {
    sourceInput.value = "";
    resultsEl.innerHTML = "";
    resultCard.classList.remove("visible");
    setStatus("");
    sourceInput.focus();
  });
  sourceInput.addEventListener("keydown", function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      convertNow();
    }
  });
})();
