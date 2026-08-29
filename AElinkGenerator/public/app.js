(function () {
  "use strict";

  var API_BASE = window.AELINK_API || "";
  var sourceInput = document.getElementById("sourceUrl");
  var convertBtn = document.getElementById("convertBtn");
  var clearBtn = document.getElementById("clearBtn");
  var statusEl = document.getElementById("status");
  var resultCard = document.getElementById("resultCard");
  var resultMeta = document.getElementById("resultMeta");
  var resultLink = document.getElementById("resultLink");
  var copyBtn = document.getElementById("copyBtn");
  var openBtn = document.getElementById("openBtn");
  var lastAffiliate = "";
  var lastProductId = "";
  var lastProgress = null;

  function i18n() {
    return window.HMGA_I18N || null;
  }

  function lang() {
    return i18n() ? i18n().current() : "en";
  }

  function msg(key, vars) {
    var api = i18n();
    if (!api) return key;
    var text = api.t(key, lang());
    return vars ? api.fill(text, vars) : text;
  }

  function formatNis(value) {
    var locale = lang() === "he" ? "he-IL" : "en-US";
    return "₪" + Math.round(Number(value) || 0).toLocaleString(locale);
  }

  function renderProgress(data) {
    if (!data) return;
    lastProgress = data;
    document.getElementById("earnedAmount").textContent = formatNis(data.earnedNis);
    document.getElementById("goalAmount").textContent = formatNis(data.goalNis);
    var remaining = document.getElementById("remainingAmount");
    if (lang() === "he") {
      remaining.textContent = msg("remainingSuffix") + " " + formatNis(data.remainingNis);
    } else {
      remaining.textContent = formatNis(data.remainingNis) + " " + msg("remainingSuffix");
    }
    document.getElementById("progressPercent").textContent = msg("percentFunded", {
      n: data.percentage,
    });
    document.getElementById("progressFill").style.width = data.percentage + "%";
    var track = document.getElementById("progressTrack");
    track.setAttribute("aria-valuemax", String(data.goalNis));
    track.setAttribute("aria-valuenow", String(data.earnedNis));
    track.setAttribute(
      "aria-valuetext",
      msg("raisedToward", {
        earned: formatNis(data.earnedNis),
        goal: formatNis(data.goalNis),
      })
    );
  }

  function loadProgress() {
    fetch(API_BASE + "/api/progress")
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (!data.ok) return;
        renderProgress(data);
      })
      .catch(function () {
        /* Keep the server-rendered zero state. */
      });
  }

  function setStatus(message, kind) {
    statusEl.className = "status " + (kind || "");
    statusEl.textContent = message || "";
    statusEl.style.display = message ? "block" : "none";
  }

  function refreshResultMeta() {
    if (!lastAffiliate) return;
    resultMeta.textContent = lastProductId
      ? msg("metaProduct", { id: lastProductId })
      : msg("metaReady");
  }

  function convertNow() {
    var url = String(sourceInput.value || "").trim();
    if (!url) {
      resultCard.classList.remove("visible");
      setStatus(msg("errPasteFirst"), "error");
      return;
    }
    convertBtn.disabled = true;
    setStatus(msg("statusGenerating"), "ok");
    fetch(API_BASE + "/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          return { status: res.status, body: body };
        });
      })
      .then(function (payload) {
        var body = payload.body || {};
        if (!body.ok) {
          resultCard.classList.remove("visible");
          if (body.code === "not_affiliate") {
            setStatus(msg("errNotAffiliate"), "thanks");
          } else {
            setStatus(body.error || msg("errGenerate"), "error");
          }
          return;
        }
        lastAffiliate = body.affiliateUrl;
        lastProductId = body.productId || "";
        refreshResultMeta();
        resultLink.textContent = body.affiliateUrl;
        openBtn.href = body.affiliateUrl;
        openBtn.setAttribute("data-original-href", body.affiliateUrl);
        resultCard.classList.add("visible");
        setStatus(msg("statusReady"), "ok");
        resultCard.focus();
        if (resultCard.scrollIntoView) {
          resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      })
      .catch(function () {
        resultCard.classList.remove("visible");
        setStatus(msg("errReach"), "error");
      })
      .finally(function () {
        convertBtn.disabled = false;
      });
  }

  function copyLink() {
    if (!lastAffiliate) return;
    var original = copyBtn.textContent;
    function done() {
      copyBtn.textContent = msg("copied");
      setStatus(msg("statusCopied"), "ok");
      setTimeout(function () {
        copyBtn.textContent = original;
      }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastAffiliate).then(done).catch(done);
    } else {
      done();
    }
  }

  convertBtn.addEventListener("click", convertNow);
  clearBtn.addEventListener("click", function () {
    sourceInput.value = "";
    lastAffiliate = "";
    lastProductId = "";
    resultCard.classList.remove("visible");
    setStatus("");
    sourceInput.focus();
  });
  copyBtn.addEventListener("click", copyLink);
  sourceInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      convertNow();
    }
  });

  var PAGE_URL = "https://helpmegetaround.com/";

  function sharePayload() {
    return {
      url: PAGE_URL,
      text: msg("shareText"),
    };
  }

  function wireShareLinks() {
    var payload = sharePayload();
    var encodedUrl = encodeURIComponent(payload.url);
    var encodedText = encodeURIComponent(payload.text);
    var whatsapp = document.getElementById("shareWhatsapp");
    var facebook = document.getElementById("shareFacebook");
    var xBtn = document.getElementById("shareX");
    var telegram = document.getElementById("shareTelegram");
    var email = document.getElementById("shareEmail");
    if (whatsapp) whatsapp.href = "https://wa.me/?text=" + encodedText;
    if (facebook) facebook.href = "https://www.facebook.com/sharer/sharer.php?u=" + encodedUrl;
    if (xBtn) xBtn.href = "https://twitter.com/intent/tweet?text=" + encodedText;
    if (telegram) telegram.href = "https://t.me/share/url?url=" + encodedUrl + "&text=" + encodedText;
    if (email) {
      email.href =
        "mailto:?subject=" +
        encodeURIComponent("Help Me Get Around") +
        "&body=" +
        encodedText;
    }
  }

  var shareCopy = document.getElementById("shareCopy");
  if (shareCopy) {
    shareCopy.addEventListener("click", function () {
      var label = shareCopy.querySelector("[data-i18n]") || shareCopy;
      var original = label.textContent;
      function done() {
        label.textContent = msg("shareCopied");
        setTimeout(function () {
          label.textContent = msg("shareCopy");
        }, 1500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(PAGE_URL).then(done).catch(done);
      } else {
        done();
      }
    });
  }

  window.addEventListener("hmga:langchange", function () {
    refreshResultMeta();
    if (lastProgress) renderProgress(lastProgress);
    wireShareLinks();
  });
  wireShareLinks();
  loadProgress();
})();
