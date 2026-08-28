"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("./server.js");

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        url: "http://127.0.0.1:" + port,
        close: () =>
          new Promise((done, fail) => server.close((err) => (err ? fail(err) : done()))),
      });
    });
  });
}

test("rejects a non-AliExpress URL", async () => {
  const app = createApp({
    generate: async () => ({ ok: true, affiliateUrl: "https://s.click.aliexpress.com/e/_test" }),
  });
  const http = await listen(app);
  try {
    const res = await fetch(http.url + "/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://www.amazon.com/dp/B000" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.match(body.error, /AliExpress/i);
  } finally {
    await http.close();
  }
});

test("returns the operator affiliate link from the generator", async () => {
  const app = createApp({
    generate: async (productUrl) => ({
      ok: true,
      affiliateUrl: "https://s.click.aliexpress.com/e/_DemoLink",
      productUrl: productUrl,
    }),
  });
  const http = await listen(app);
  try {
    const res = await fetch(http.url + "/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://www.aliexpress.com/item/1005006123456789.html?spm=foo",
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.productId, "1005006123456789");
    assert.equal(body.affiliateUrl, "https://s.click.aliexpress.com/e/_DemoLink");
  } finally {
    await http.close();
  }
});

test("serves the public website", async () => {
  const app = createApp({ generate: async () => ({ ok: false }) });
  const http = await listen(app);
  try {
    const res = await fetch(http.url + "/");
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /AliExpress/i);
    assert.match(html, /Get affiliate link/);
  } finally {
    await http.close();
  }
});
