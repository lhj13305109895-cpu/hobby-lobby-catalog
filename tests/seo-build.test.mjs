import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const products = JSON.parse(readFileSync(path.join(root, "src", "data", "products.json"), "utf8")).filter((product) => product.visible);

test("visible products have unique sequential catalogue slugs", () => {
  const slugs = products.map((product) => product.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const product of products) assert.match(product.slug, /^319-\d{2,3}$/);
  assert.deepEqual(products.slice(-3).map((product) => product.slug), ["319-98", "319-99", "319-100"]);
});

test("image sitemap contains every visible product and image", () => {
  const sitemap = readFileSync(path.join(root, "public", "sitemap.xml"), "utf8");
  for (const product of products) {
    assert.match(sitemap, new RegExp(`<loc>https://hobby-lobby-catalog\\.pages\\.dev/products/${product.slug}/</loc>`));
    assert.ok(sitemap.includes(`<image:loc>https://hobby-lobby-catalog.pages.dev${product.mainImage}</image:loc>`));
  }
});

test("generated product pages expose canonical, image and Product JSON-LD", () => {
  for (const product of products) {
    const html = readFileSync(path.join(root, "dist", "client", "products", product.slug, "index.html"), "utf8");
    assert.ok(html.includes(`<link rel="canonical" href="https://hobby-lobby-catalog.pages.dev/products/${product.slug}/" />`));
    assert.ok(html.includes('"@type":"Product"'));
    assert.ok(html.includes(product.mainImage));
  }
});
