(function (global) {
  "use strict";

  var TRACKING_ID_RE = /^[A-Za-z0-9_-]{2,64}$/;
  var PRODUCT_ID_PATH_RES = [
    /\/item\/(\d+)\.html/i,
    /\/item\/[^/]*?-(\d+)\.html/i,
    /\/item\/(\d+)\/?$/i,
    /\/i\/(\d+)/i,
  ];
  var STRIP_PARAMS = [
    "spm",
    "scm",
    "aff_fcid",
    "aff_fsk",
    "aff_platform",
    "sk",
    "aff_trace_key",
    "terminal_id",
    "pvid",
    "algo_pvid",
    "algo_exp_id",
    "btsid",
    "ws_ab_test",
    "gatewayAdapt",
    "src",
    "srcSns",
    "businessType",
    "templateId",
  ];

  function normalizeInputUrl(raw) {
    var text = String(raw || "").trim();
    if (!text) return null;
    if (!/^https?:\/\//i.test(text)) text = "https://" + text;
    try {
      return new URL(text);
    } catch (err) {
      return null;
    }
  }

  function hostnameOf(url) {
    return url.hostname.toLowerCase().replace(/^www\./, "");
  }

  function isClickHost(host) {
    return host === "s.click.aliexpress.com" || host === "click.aliexpress.com";
  }

  function isAliExpressHost(host) {
    if (isClickHost(host)) return true;
    if (host === "aliexpress.com" || host.endsWith(".aliexpress.com")) return true;
    if (host.indexOf("aliexpress.") === 0) return true;
    return false;
  }

  function extractProductIdFromUrl(url) {
    var path = url.pathname || "";
    for (var i = 0; i < PRODUCT_ID_PATH_RES.length; i++) {
      var match = path.match(PRODUCT_ID_PATH_RES[i]);
      if (match) return match[1];
    }
    var fromQuery = url.searchParams.get("productId") || url.searchParams.get("productIds");
    if (fromQuery && /^\d{6,}$/.test(fromQuery.split(",")[0])) {
      return fromQuery.split(",")[0];
    }
    return null;
  }

  function unwrapDeepLink(url) {
    if (!isClickHost(hostnameOf(url))) return null;
    var target = url.searchParams.get("dl_target_url");
    if (!target) return null;
    try {
      return new URL(target);
    } catch (err) {
      return null;
    }
  }

  function isShortAffiliateLink(url) {
    if (!isClickHost(hostnameOf(url))) return false;
    if (url.searchParams.get("dl_target_url")) return false;
    return /\/e\//i.test(url.pathname || "");
  }

  function canonicalize(url) {
    var unwrapped = unwrapDeepLink(url);
    var target = unwrapped || url;
    var productId = extractProductIdFromUrl(target);
    if (productId) return "https://www.aliexpress.com/item/" + productId + ".html";

    var clean = new URL(target.toString());
    for (var i = 0; i < STRIP_PARAMS.length; i++) {
      clean.searchParams.delete(STRIP_PARAMS[i]);
    }
    return clean.toString();
  }

  function prepareSourceUrl(rawUrl) {
    var url = normalizeInputUrl(rawUrl);
    if (!url) {
      return { ok: false, error: "Paste a valid AliExpress product link." };
    }
    if (!isAliExpressHost(hostnameOf(url))) {
      return { ok: false, error: "That does not look like an AliExpress link." };
    }
    if (isShortAffiliateLink(url)) {
      return {
        ok: false,
        error: "That is already a short affiliate link. Paste the original product page URL.",
      };
    }

    var productUrl = canonicalize(url);
    var productId = null;
    try {
      productId = extractProductIdFromUrl(new URL(productUrl));
    } catch (err) {
      productId = null;
    }

    return {
      ok: true,
      productUrl: productUrl,
      productId: productId,
    };
  }

  function convert(rawUrl, trackingId) {
    var prepared = prepareSourceUrl(rawUrl);
    if (!prepared.ok) return prepared;

    var tid = String(trackingId || "").trim();
    if (!tid) {
      return { ok: false, error: "Add your Tracking ID first." };
    }
    if (!TRACKING_ID_RE.test(tid)) {
      return {
        ok: false,
        error: "That Tracking ID looks invalid. Use the ID from AliExpress Portals.",
      };
    }

    var productUrl = prepared.productUrl;
    var affiliate = new URL("https://s.click.aliexpress.com/deep_link.htm");
    affiliate.searchParams.set("aff_short_key", tid);
    affiliate.searchParams.set("dl_target_url", productUrl);

    var productId = null;
    try {
      productId = extractProductIdFromUrl(new URL(productUrl));
    } catch (err) {
      productId = null;
    }

    return {
      ok: true,
      affiliateUrl: affiliate.toString(),
      productUrl: productUrl,
      productId: productId,
    };
  }

  function convertMany(text, trackingId) {
    var lines = String(text || "")
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);

    if (!lines.length) {
      return { ok: false, error: "Paste at least one AliExpress link.", results: [] };
    }

    var results = lines.map(function (line) {
      var converted = convert(line, trackingId);
      converted.input = line;
      return converted;
    });
    var allOk = results.every(function (result) {
      return result.ok;
    });

    return {
      ok: allOk,
      results: results,
      error: allOk ? null : "Some links could not be converted.",
    };
  }

  function extractTrackingIdFromLink(raw) {
    var url = normalizeInputUrl(raw);
    if (!url) return null;
    var key = url.searchParams.get("aff_short_key") || url.searchParams.get("sk");
    if (key && TRACKING_ID_RE.test(key.trim())) return key.trim();
    return null;
  }

  var api = {
    convert: convert,
    convertMany: convertMany,
    prepareSourceUrl: prepareSourceUrl,
    extractTrackingIdFromLink: extractTrackingIdFromLink,
    extractProductIdFromUrl: extractProductIdFromUrl,
    canonicalize: canonicalize,
    isAliExpressHost: isAliExpressHost,
    normalizeInputUrl: normalizeInputUrl,
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  global.AliExpressAffiliate = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
