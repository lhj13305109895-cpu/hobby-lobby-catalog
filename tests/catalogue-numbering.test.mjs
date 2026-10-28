import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { catalogueCodeFor, catalogueImageAlt, cataloguePrefix, isValidCatalogueCode, nextCatalogueCode } from "../src/catalogue-numbering.js";

const products = JSON.parse(readFileSync(new URL("../src/data/products.json", import.meta.url), "utf8"));
const mapping = JSON.parse(readFileSync(new URL("../backups/numbering-2026-10-28.json", import.meta.url), "utf8"));

test("catalogue numbers follow original import order with independent requested starting numbers", () => {
  const counters = { "319": 19, "318": 24, "319套装": 0 };
  const codes = new Set();
  for (const product of products) {
    const prefix = cataloguePrefix(product);
    assert.equal(product.catalogueCode, prefix + "-" + (++counters[prefix]));
    assert.ok(isValidCatalogueCode(product), product.productId);
    assert.ok(!codes.has(product.catalogueCode));
    codes.add(product.catalogueCode);
  }
  assert.ok(products.filter(p => p.categoryId === "mixed-set").every(p => p.catalogueCode.startsWith("319套装-")));
});

test("renumbering preserves stable detail URLs and product identities", () => {
  const byId = new Map(products.map(product => [product.productId, product]));
  for (const row of mapping.products) {
    const product = byId.get(row.productId);
    assert.ok(product);
    assert.equal(product.slug, row.previousCode);
    assert.equal(product.catalogueCode, row.catalogueCode);
  }
  assert.equal(new Set(products.map(p => p.slug)).size, products.length);
});

test("new products continue the proper single-pot or set sequence", () => {
  const fixtures = [
    { model: "319", catalogueCode: "319-20" },
    { model: "318", catalogueCode: "318-25" },
    { model: "319", categoryId: "mixed-set", catalogueCode: "319套装-1" },
  ];
  assert.equal(nextCatalogueCode(fixtures, { model: "319" }), "319-21");
  assert.equal(nextCatalogueCode(fixtures, { model: "318" }), "318-26");
  assert.equal(nextCatalogueCode(fixtures, { model: "319", categoryId: "mixed-set" }), "319套装-2");
  assert.equal(nextCatalogueCode([], { model: "319" }), "319-20");
  assert.equal(nextCatalogueCode([], { model: "318" }), "318-25");
  assert.equal(nextCatalogueCode([], { model: "319", categoryId: "mixed-set" }), "319套装-1");
});

test("public number validation rejects wrong model, wrong set prefix and unsafe text", () => {
  for (const catalogueCode of ["319-1", "318套装-1", "319套装-0", "319套装-01", "../319套装-1", "319套装-1-copy"]) {
    assert.equal(isValidCatalogueCode({ model: "319", categoryId: "mixed-set", catalogueCode }), false, catalogueCode);
  }
  assert.equal(isValidCatalogueCode({ model: "318", catalogueCode: "318-25" }), true);
  assert.equal(isValidCatalogueCode({ model: "319", categoryId: "mixed-set", catalogueCode: "319套装-1" }), true);
});

test("image descriptions display the new code while retaining the stable URL", () => {
  const product = { slug: "319-59", catalogueCode: "319套装-1" };
  assert.equal(catalogueImageAlt(product, "319-59 floral set"), "319套装-1 floral set");
  assert.equal(product.slug, "319-59");
  assert.equal(catalogueCodeFor({ slug: "319-88" }), "319-88");
});

test("cards, details, basket, lightbox and quote exports use public catalogue numbers", () => {
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const exporter = readFileSync(new URL("../src/quoteExport.js", import.meta.url), "utf8");
  assert.ok(app.includes("const catalogueCode = pattern.catalogueCode;"));
  assert.ok(app.includes("MODEL {product.model} · {product.catalogueCode}"));
  assert.ok(app.includes("MODEL {expanded.model} · {expanded.catalogueCode}"));
  assert.ok(app.includes("<small>{pattern.catalogueCode} · {capacity.id}"));
  assert.ok(app.includes("pattern.slug}/"));
  assert.ok(app.includes("item.slug === productSlug"));
  assert.ok(exporter.includes("context.fillText(catalogueCodeFor(pattern),"));
  assert.ok(exporter.includes("catalogueCodeFor(pattern)} "));
  assert.ok(!exporter.includes("pattern.slug"));
});
