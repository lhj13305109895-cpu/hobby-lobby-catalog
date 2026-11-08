import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { groupGalleryPatterns, latestGalleryImportDay, LATEST_ARRIVALS_SERIES, nextGalleryScrollY } from "../src/catalogue-gallery.js";

const pattern = (id, family, createdAt, categoryId = family) => ({ id, family, createdAt, categoryId });

test("latest arrivals lead the catalogue while original series keep their ranking and products", () => {
  const products = [
    pattern("older-one", "A", "2026-10-01T05:00:00Z"),
    pattern("recent-a", "A", "2026-10-19T06:00:00Z"),
    pattern("older-many", "C", "2026-10-01T05:00:00Z"),
    pattern("recent-b1", "B", "2026-10-19T02:00:00Z"),
    pattern("recent-b2", "B", "2026-10-19T02:00:00Z"),
    pattern("set-one", "Sets", "2026-10-19T07:00:00Z", "mixed-set"),
    pattern("set-two", "Sets", "2026-10-19T07:00:00Z", "mixed-set"),
    pattern("set-three", "Sets", "2026-10-19T07:00:00Z", "mixed-set"),
  ];
  const order = new Map(products.map((p, i) => [p.id, i]));
  const grouped = groupGalleryPatterns(products, order, latestGalleryImportDay(products));
  assert.deepEqual(grouped.map(([family, items]) => [family, items.map(item => item.id)]), [
    [LATEST_ARRIVALS_SERIES, ["set-three", "set-two", "set-one", "recent-a", "recent-b2", "recent-b1"]],
    ["B", ["recent-b2", "recent-b1"]],
    ["A", ["recent-a", "older-one"]],
    ["C", ["older-many"]],
    ["Sets", ["set-three", "set-two", "set-one"]],
  ]);
  assert.equal(products[0].id, "older-one");
});

test("same Shanghai import day combines separate UTC dates", () => {
  const products = [
    pattern("a", "A", "2026-10-18T23:50:00Z"),
    pattern("b", "A", "2026-10-19T00:10:00Z"),
    pattern("c", "B", "2026-10-19T12:00:00Z"),
  ];
  const grouped = groupGalleryPatterns(products, new Map(), latestGalleryImportDay(products));
  assert.deepEqual(grouped.map(([family]) => family), [LATEST_ARRIVALS_SERIES, "A", "B"]);
  assert.deepEqual(grouped[0][1].map((item) => item.id), ["c", "b", "a"]);
});

test("latest arrivals respect filters without treating older matching patterns as new", () => {
  const products = [
    { ...pattern("older-318", "A", "2026-10-18T12:00:00Z"), model: "318" },
    { ...pattern("new-318", "B", "2026-10-19T05:00:00Z"), model: "318" },
    { ...pattern("new-319", "A", "2026-10-19T06:00:00Z"), model: "319" },
  ];
  const latestDay = latestGalleryImportDay(products);
  const only318 = groupGalleryPatterns(products.filter((p) => p.model === "318"), new Map(), latestDay);
  assert.deepEqual(only318[0], [LATEST_ARRIVALS_SERIES, [products[1]]]);
  assert.deepEqual(groupGalleryPatterns([products[0]], new Map(), latestDay), [["A", [products[0]]]]);
  assert.deepEqual(groupGalleryPatterns([], new Map(), latestDay), []);
  assert.deepEqual(groupGalleryPatterns([pattern("undated", "C")], new Map(), null).map(([family]) => family), ["C"]);
});

test("autoscroll advances down and wraps only once the complete catalogue is rendered", () => {
  assert.equal(nextGalleryScrollY(100, 800, 3000, 2, true), 102);
  assert.equal(nextGalleryScrollY(2999, 800, 3000, 2, true), 3000);
  assert.equal(nextGalleryScrollY(3000, 800, 3000, 2, true), 3000);
  assert.equal(nextGalleryScrollY(3000, 800, 3000, 2, false), 800);
  assert.equal(nextGalleryScrollY(800, 800, 800, 2, false), 800);
});

test("catalogue places model cards above the series directory and keeps six columns on wide screens", () => {
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.ok(app.indexOf('className="catalogue-sidebar"') < app.indexOf('className="model-spotlight"'));
  assert.ok(app.indexOf('className="model-spotlight"') < app.indexOf('className="series-directory"'));
  assert.match(css, /@media \(min-width:1400px\)\s*\{\s*\.pattern-grid\s*\{[^}]*repeat\(6,/);
  assert.match(app, /const events = \["pointerdown", "click", "wheel", "keydown"\]/);
  assert.match(app, /onClick=\{\(\) => setAutoScroll\(\(playing\) => !playing\)\}/);
  assert.match(app, /prefers-reduced-motion: reduce/);
});
