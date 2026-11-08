import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { galleryScrollStep, groupGalleryPatterns, latestGalleryImportDay, LATEST_ARRIVALS_SERIES, nextGalleryScrollFrame } from "../src/catalogue-gallery.js";

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

const scrollFrame = (overrides) => nextGalleryScrollFrame({
  currentY: 100, startY: 800, endY: 3000, step: 2, hasMoreSeries: false, now: 2000, bottomReachedAt: null, ...overrides,
});

test("autoscroll progresses downward and requests the next series at the temporary end", () => {
  assert.deepEqual(scrollFrame({ hasMoreSeries: true }), { nextY: 102, bottomReachedAt: null });
  assert.deepEqual(scrollFrame({ currentY: 2998.5, hasMoreSeries: true }), { nextY: 3000, bottomReachedAt: null });
  assert.deepEqual(scrollFrame({ currentY: 2999.6, hasMoreSeries: true }), {
    nextY: 2999.6, bottomReachedAt: null, loadMore: true,
  });
});

test("autoscroll reaches the list end, holds briefly, and wraps even when the browser rounds the position down", () => {
  const arrival = scrollFrame({ currentY: 2999.6 });
  assert.deepEqual(arrival, { nextY: 3000, bottomReachedAt: 2000 });
  assert.deepEqual(scrollFrame({ currentY: 2999.6, now: 2999, bottomReachedAt: arrival.bottomReachedAt }), {
    nextY: 2999.6, bottomReachedAt: 2000,
  });
  assert.deepEqual(scrollFrame({ currentY: 2999.6, now: 3000, bottomReachedAt: arrival.bottomReachedAt }), {
    nextY: 800, bottomReachedAt: null,
  });
  assert.deepEqual(scrollFrame({ currentY: 800 }), { nextY: 802, bottomReachedAt: null });
});

test("autoscroll cancels a pending wrap if the catalogue grows before the pause ends", () => {
  assert.deepEqual(scrollFrame({ currentY: 3000, endY: 3100, now: 3000, bottomReachedAt: 2000 }), {
    nextY: 3002, bottomReachedAt: null,
  });
});

test("autoscroll advances steadily at 60 Hz, maintains speed at higher refresh rates, and caps catch-up", () => {
  for (const refreshRate of [60, 120, 144]) {
    let remainder = 0;
    let travelled = 0;
    for (let frame = 0; frame < refreshRate; frame += 1) {
      const result = galleryScrollStep(1000 / refreshRate, remainder);
      assert.ok(result.step >= 0 && result.step <= 1);
      if (refreshRate === 60) assert.equal(result.step, 1);
      travelled += result.step;
      remainder = result.remainder;
    }
    assert.equal(travelled, 60);
  }
  assert.equal(galleryScrollStep(500).step, 2);
  assert.equal(galleryScrollStep(0).step, 0);
});

test("product cards defer thumbnail decoding and reserve full-size images for the lightbox", () => {
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const cardImage = app.match(/className="pattern-image-wrap"[^\n]*?(<img [^>]+>)/)?.[1];
  assert.ok(cardImage);
  assert.match(cardImage, /src=\{pattern\.thumb\}/);
  assert.match(cardImage, /loading="lazy" decoding="async"/);
  assert.doesNotMatch(cardImage, /srcSet|displayImage|originalImage/);
  assert.match(app, /className="lightbox-image"><img src=\{expanded\.displayImage\}/);
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
