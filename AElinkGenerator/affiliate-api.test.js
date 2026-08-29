"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { sign, extractAffiliateUrl } = require("./affiliate-api.js");

test("signs AliExpress API params", () => {
  const signature = sign({ app_key: "1", method: "x", timestamp: "2026-01-01 00:00:00" }, "secret");
  assert.equal(signature, sign({ timestamp: "2026-01-01 00:00:00", method: "x", app_key: "1" }, "secret"));
  assert.match(signature, /^[A-F0-9]{32}$/);
});

test("extracts a promotion link from an API payload", () => {
  const url = extractAffiliateUrl({
    aliexpress_affiliate_link_generate_response: {
      resp_result: {
        result: {
          promotion_links: {
            promotion_link: {
              promotion_link: "https://s.click.aliexpress.com/e/_abc123",
              source_value: "https://www.aliexpress.com/item/1.html",
            },
          },
        },
      },
    },
  });
  assert.equal(url, "https://s.click.aliexpress.com/e/_abc123");
});
