"use strict";

const crypto = require("crypto");

function shanghaiTimestamp() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function sign(params, secret) {
  const concatenated = Object.keys(params)
    .sort()
    .map((key) => key + params[key])
    .join("");
  return crypto
    .createHash("md5")
    .update(secret + concatenated + secret, "utf8")
    .digest("hex")
    .toUpperCase();
}

function flattenPromotionLinks(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => (item && (item.promotion_link || item.promotionLink)) || null)
    .filter(Boolean);
}

function extractAffiliateUrl(payload) {
  const body =
    payload &&
    (payload.aliexpress_affiliate_link_generate_response ||
      payload.aliexpress_affiliate_link_generate_response ||
      payload);
  const result =
    (body && body.resp_result && body.resp_result.result) ||
    (body && body.resp_result) ||
    (body && body.result) ||
    body;
  const links =
    flattenPromotionLinks(result && result.promotion_links && result.promotion_links.promotion_link) ||
    flattenPromotionLinks(result && result.promotion_links);
  if (links.length) return links[0];
  const blob = JSON.stringify(payload);
  const match = blob.match(/https?:\/\/s\.click\.aliexpress\.com\/[^"\\s]+/i);
  return match ? match[0].replace(/[),.;]+$/, "") : null;
}

async function generateWithAffiliateApi(productUrl, env, fetchFn) {
  const appKey = env.ALIEXPRESS_APP_KEY;
  const secret = env.ALIEXPRESS_APP_SECRET;
  const trackingId = env.ALIEXPRESS_TRACKING_ID;
  if (!appKey || !secret || !trackingId) {
    throw new Error("Affiliate API credentials are not configured.");
  }

  const gateway = env.ALIEXPRESS_GATEWAY || "https://api-sg.aliexpress.com/sync";
  const params = {
    method: "aliexpress.affiliate.link.generate",
    app_key: appKey,
    sign_method: "md5",
    timestamp: shanghaiTimestamp(),
    format: "json",
    v: "2.0",
    promotion_link_type: "0",
    source_values: productUrl,
    tracking_id: trackingId,
  };
  params.sign = sign(params, secret);

  const response = await (fetchFn || fetch)(gateway, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(params),
  });
  const payload = await response.json();
  const affiliateUrl = extractAffiliateUrl(payload);
  if (!affiliateUrl) {
    const message =
      (payload && payload.error_response && payload.error_response.msg) ||
      (payload && payload.aliexpress_affiliate_link_generate_response &&
        payload.aliexpress_affiliate_link_generate_response.resp_result &&
        payload.aliexpress_affiliate_link_generate_response.resp_result.resp_msg) ||
      "AliExpress API did not return an affiliate link.";
    throw new Error(message);
  }
  return { ok: true, affiliateUrl: affiliateUrl, productUrl: productUrl };
}

module.exports = {
  sign,
  shanghaiTimestamp,
  extractAffiliateUrl,
  generateWithAffiliateApi,
};
