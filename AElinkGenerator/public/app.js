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

  function setStatus(message, kind) {
    statusEl.className = "status " + (kind || "");
    statusEl.textContent = message || "";
    statusEl.style.display = message ? "block" : "none";
  }

  function convertNow() {
    var url = String(sourceInput.value || "").trim();
    if (!url) {
      resultCard.classList.remove("visible");
      setStatus("Paste an AliExpress product link first.", "error");
      return;
    }
    convertBtn.disabled = true;
    setStatus("Generating your tracking link…", "ok");
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
          setStatus(body.error || "Could not generate a link.", "error");
          return;
        }
        lastAffiliate = body.affiliateUrl;
        resultMeta.textContent = body.productId ? "Product " + body.productId : "Affiliate link ready";
        resultLink.textContent = body.affiliateUrl;
        openBtn.href = body.affiliateUrl;
        resultCard.classList.add("visible");
        setStatus("Affiliate link ready.", "ok");
      })
      .catch(function () {
        resultCard.classList.remove("visible");
        setStatus("Could not reach the link generator. Try again in a moment.", "error");
      })
      .finally(function () {
        convertBtn.disabled = false;
      });
  }

  function copyLink() {
    if (!lastAffiliate) return;
    var original = copyBtn.textContent;
    function done() {
      copyBtn.textContent = "Copied";
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
})();
