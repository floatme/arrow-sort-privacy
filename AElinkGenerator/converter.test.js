"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var affiliate = require("./converter.js");

var TRACKING_ID = "my_blog-1";

test("converts a standard product URL", function () {
  var result = affiliate.convert(
    "https://www.aliexpress.com/item/1005006123456789.html",
    TRACKING_ID
  );
  assert.equal(result.ok, true);
  assert.equal(result.productId, "1005006123456789");
  assert.equal(result.productUrl, "https://www.aliexpress.com/item/1005006123456789.html");
  assert.match(result.affiliateUrl, /^https:\/\/s\.click\.aliexpress\.com\/deep_link\.htm\?/);
  var generated = new URL(result.affiliateUrl);
  assert.equal(generated.searchParams.get("aff_short_key"), TRACKING_ID);
  assert.equal(
    generated.searchParams.get("dl_target_url"),
    "https://www.aliexpress.com/item/1005006123456789.html"
  );
});

test("strips tracking junk and canonicalizes to the item page", function () {
  var result = affiliate.convert(
    "https://www.aliexpress.com/item/1005006123456789.html?spm=a2g0o.detail&algo_pvid=abc&gatewayAdapt=glo2usa4itemAdapt",
    TRACKING_ID
  );
  assert.equal(result.ok, true);
  assert.equal(result.productUrl, "https://www.aliexpress.com/item/1005006123456789.html");
});

test("accepts URLs without a protocol", function () {
  var result = affiliate.convert(
    "www.aliexpress.com/item/1005006123456789.html",
    TRACKING_ID
  );
  assert.equal(result.ok, true);
  assert.equal(result.productId, "1005006123456789");
});

test("extracts product IDs from title-slug item paths", function () {
  var result = affiliate.convert(
    "https://www.aliexpress.com/item/Wireless-Earbuds-1005007788990011.html",
    TRACKING_ID
  );
  assert.equal(result.ok, true);
  assert.equal(result.productId, "1005007788990011");
});

test("extracts product IDs from /i/ paths", function () {
  var result = affiliate.convert("https://www.aliexpress.com/i/4000669887458.html", TRACKING_ID);
  assert.equal(result.ok, true);
  assert.equal(result.productId, "4000669887458");
});

test("accepts regional and mobile hosts", function () {
  var mobile = affiliate.convert(
    "https://m.aliexpress.com/item/1005006123456789.html",
    TRACKING_ID
  );
  var regional = affiliate.convert(
    "https://aliexpress.us/item/1005006123456789.html",
    TRACKING_ID
  );
  assert.equal(mobile.ok, true);
  assert.equal(regional.ok, true);
  assert.equal(mobile.productUrl, regional.productUrl);
});

test("re-wraps an existing deep link with the user's tracking ID", function () {
  var existing =
    "https://s.click.aliexpress.com/deep_link.htm?aff_short_key=someoneElse&dl_target_url=" +
    encodeURIComponent("https://www.aliexpress.com/item/1005006123456789.html");
  var result = affiliate.convert(existing, TRACKING_ID);
  assert.equal(result.ok, true);
  var generated = new URL(result.affiliateUrl);
  assert.equal(generated.searchParams.get("aff_short_key"), TRACKING_ID);
  assert.equal(
    generated.searchParams.get("dl_target_url"),
    "https://www.aliexpress.com/item/1005006123456789.html"
  );
});

test("rejects short s.click links that cannot be unwrapped", function () {
  var result = affiliate.convert("https://s.click.aliexpress.com/e/_c3Example", TRACKING_ID);
  assert.equal(result.ok, false);
  assert.match(result.error, /original product page/i);
});

test("rejects non-AliExpress URLs", function () {
  var result = affiliate.convert("https://www.amazon.com/dp/B000000", TRACKING_ID);
  assert.equal(result.ok, false);
  assert.match(result.error, /AliExpress/i);
});

test("requires a tracking ID", function () {
  var result = affiliate.convert("https://www.aliexpress.com/item/1005006123456789.html", "");
  assert.equal(result.ok, false);
  assert.match(result.error, /Tracking ID/i);
});

test("rejects an invalid tracking ID", function () {
  var result = affiliate.convert(
    "https://www.aliexpress.com/item/1005006123456789.html",
    "not a valid id!"
  );
  assert.equal(result.ok, false);
  assert.match(result.error, /invalid/i);
});

test("converts a batch and reports mixed results", function () {
  var batch = affiliate.convertMany(
    [
      "https://www.aliexpress.com/item/1005006123456789.html",
      "https://example.com/not-aliexpress",
      "https://www.aliexpress.com/item/4000669887458.html",
    ].join("\n"),
    TRACKING_ID
  );
  assert.equal(batch.ok, false);
  assert.equal(batch.results.length, 3);
  assert.equal(batch.results[0].ok, true);
  assert.equal(batch.results[1].ok, false);
  assert.equal(batch.results[2].ok, true);
});

test("extracts a tracking ID from an existing affiliate deep link", function () {
  var found = affiliate.extractTrackingIdFromLink(
    "https://s.click.aliexpress.com/deep_link.htm?aff_short_key=nY3BAUr&dl_target_url=https%3A%2F%2Fwww.aliexpress.com%2Fitem%2F1.html"
  );
  assert.equal(found, "nY3BAUr");
});

test("prepares a clean product URL without a tracking ID", function () {
  var prepared = affiliate.prepareSourceUrl(
    "www.aliexpress.com/item/1005006123456789.html?spm=a2g0o.detail"
  );
  assert.equal(prepared.ok, true);
  assert.equal(prepared.productId, "1005006123456789");
  assert.equal(prepared.productUrl, "https://www.aliexpress.com/item/1005006123456789.html");
});
