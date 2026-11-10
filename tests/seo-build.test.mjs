import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const products = JSON.parse(readFileSync(path.join(root, "src", "data", "products.json"), "utf8")).filter((product) => product.visible);

test("visible products have unique slugs in the supported catalogue formats", () => {
  const slugs = products.map((product) => product.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  const hasLegacy318BSlug = (product) => product.model === "318"
    && product.capacities.length === 1 && product.capacities[0] === "2.0L"
    && /^318-2l-\d{13}$/.test(product.slug);
  const numericProducts = products.filter((product) => !hasLegacy318BSlug(product));
  for (const product of numericProducts) assert.match(product.slug, new RegExp(`^${product.model}-\\d{2,3}$`));
  for (const model of ["318", "319"]) {
    const catalogueNumbers = numericProducts.filter((product) => product.model === model).map((product) => Number(product.slug.split("-").at(-1)));
    assert.ok(catalogueNumbers.every((number, index) => index === 0 || number > catalogueNumbers[index - 1]));
    assert.equal(catalogueNumbers.at(-1), Math.max(...catalogueNumbers));
  }
});

test("image sitemap contains every visible product and image", () => {
  const sitemap = readFileSync(path.join(root, "public", "sitemap.xml"), "utf8");
  for (const product of products) {
    assert.match(sitemap, new RegExp(`<loc>https://hobby-lobby-catalog\\.pages\\.dev/products/${product.slug}/</loc>`));
    assert.ok(sitemap.includes(`<image:loc>https://hobby-lobby-catalog.pages.dev${product.mainImage}</image:loc>`));
  }
});

test("robots explicitly allows OpenAI search discovery", () => {
  const robots = readFileSync(path.join(root, "public", "robots.txt"), "utf8");
  assert.match(robots, /User-agent: OAI-SearchBot\r?\nAllow: \//);
  assert.match(robots, /Sitemap: https:\/\/hobby-lobby-catalog\.pages\.dev\/sitemap\.xml/);
});

test("generated product pages expose canonical, image and Product JSON-LD", () => {
  for (const product of products) {
    const html = readFileSync(path.join(root, "dist", "client", "products", product.slug, "index.html"), "utf8");
    assert.ok(html.includes(`<link rel="canonical" href="https://hobby-lobby-catalog.pages.dev/products/${product.slug}/" />`));
    assert.ok(html.includes('"@type":"Product"'));
    assert.ok(html.includes(product.mainImage));
    assert.ok(html.includes(`"sku":"${product.catalogueCode || product.slug}"`));
  }
});
