"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { extractClickLinks } = require("./portals.js");

test("extracts s.click affiliate links from page text", () => {
  const links = extractClickLinks(
    'before https://s.click.aliexpress.com/e/_abc123" after http://example.com'
  );
  assert.deepEqual(links, ["https://s.click.aliexpress.com/e/_abc123"]);
});
