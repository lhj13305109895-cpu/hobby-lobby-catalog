import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { galleryMonthWindow, galleryScrollStep, groupGalleryPatterns, latestGalleryImportDay, LATEST_ARRIVALS_SERIES, nextGalleryScrollFrame } from "../src/catalogue-gallery.js";

const pattern = (id, family, createdAt, categoryId = family) => ({ id, family, createdAt, categoryId });
const now = Date.parse("2026-10-19T08:00:00Z");

test("latest arrivals lead the catalogue while original series keep their ranking and products", () => {
  const products = [
    pattern("older-one", "A", "2026-09-01T05:00:00Z"),
    pattern("recent-a", "A", "2026-10-19T06:00:00Z"),
    pattern("older-many", "C", "2026-09-01T05:00:00Z"),
    pattern("recent-b1", "B", "2026-10-19T02:00:00Z"),
    pattern("recent-b2", "B", "2026-10-19T02:00:00Z"),
    pattern("set-one", "Sets", "2026-10-19T07:00:00Z", "mixed-set"),
    pattern("set-two", "Sets", "2026-10-19T07:00:00Z", "mixed-set"),
    pattern("set-three", "Sets", "2026-10-19T07:00:00Z", "mixed-set"),
  ];
  const order = new Map(products.map((p, i) => [p.id, i]));
  const grouped = groupGalleryPatterns(products, order, latestGalleryImportDay(products), now);
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
  const grouped = groupGalleryPatterns(products, new Map(), latestGalleryImportDay(products), now);
  assert.deepEqual(grouped.map(([family]) => family), [LATEST_ARRIVALS_SERIES, "A", "B"]);
  assert.deepEqual(grouped[0][1].map((item) => item.id), ["c", "b", "a"]);
});

test("latest arrivals respect filters without treating older matching patterns as new", () => {
  const products = [
    { ...pattern("older-318", "A", "2026-09-18T12:00:00Z"), model: "318" },
    { ...pattern("new-318", "B", "2026-10-19T05:00:00Z"), model: "318" },
    { ...pattern("new-319", "A", "2026-10-19T06:00:00Z"), model: "319" },
  ];
  const latestDay = latestGalleryImportDay(products);
  const only318 = groupGalleryPatterns(products.filter((p) => p.model === "318"), new Map(), latestDay, now);
  assert.deepEqual(only318[0], [LATEST_ARRIVALS_SERIES, [products[1]]]);
  assert.deepEqual(groupGalleryPatterns([products[0]], new Map(), latestDay, now), [["A", [products[0]]]]);
  assert.deepEqual(groupGalleryPatterns([], new Map(), latestDay), []);
  assert.deepEqual(groupGalleryPatterns([pattern("undated", "C")], new Map(), null).map(([family]) => family), ["C"]);
});

test("one calendar month uses Shanghai dates including both boundaries", () => {
  assert.deepEqual(galleryMonthWindow(Date.parse("2026-03-31T06:00:00Z")), { start: "2026-02-28", end: "2026-03-31" });
  const items = [pattern("before", "A", "2026-09-18T15:59:59Z"), pattern("start", "A", "2026-09-18T16:00:00Z"), pattern("end", "B", "2026-10-19T15:59:59Z"), pattern("future", "B", "2026-10-19T16:00:00Z")];
  assert.deepEqual(groupGalleryPatterns(items, new Map(), null, now)[0][1].map(p => p.id), ["end", "start"]);
});

test("each model gets arrivals and rankings based on its own recent designs", () => {
  const items = [
    { ...pattern("318-a", "A", "2026-10-18T00:00:00Z"), model: "318" },
    { ...pattern("318-b1", "B", "2026-10-17T00:00:00Z"), model: "318" },
    { ...pattern("318-b2", "B", "2026-10-16T00:00:00Z"), model: "318" },
    { ...pattern("319-a1", "A", "2026-10-18T00:00:00Z"), model: "319" },
    { ...pattern("319-a2", "A", "2026-10-17T00:00:00Z"), model: "319" },
    { ...pattern("319-b", "B", "2026-10-16T00:00:00Z"), model: "319" },
  ];
  for (const [model, expected] of [["318", [LATEST_ARRIVALS_SERIES, "B", "A"]], ["319", [LATEST_ARRIVALS_SERIES, "A", "B"]]]) {
    const groups = groupGalleryPatterns(items.filter(p => p.model === model), new Map(), null, now);
    assert.deepEqual(groups.map(([family]) => family), expected);
    assert.ok(groups[0][1].every(p => p.model === model));
  }
});

test("matching artwork across models and render variants is grouped under the same theme", () => {
  const products = JSON.parse(readFileSync(new URL("../src/data/products.json", import.meta.url), "utf8"));
  const categories = JSON.parse(readFileSync(new URL("../src/data/categories.json", import.meta.url), "utf8"));
  const byCode = new Map(products.map((item) => [item.catalogueCode, item]));
  const activeCategories = new Set(categories.filter((item) => item.enabled && item.visible).map((item) => item.categoryId));
  for (const item of products.filter((item) => item.visible)) {
    assert.ok(activeCategories.has(item.categoryId), `${item.catalogueCode} belongs to a visible series`);
  }
  for (const [category, codes] of [
    ["folk-floral", ["318-25", "318-26", "318-131", "318-132", "318-136", "319-341", "319-342", "319-346", "319-348"]],
    ["botanical-floral", ["318-93", "318-94", "319-87", "319-88"]],
    ["fresh-fruit", ["318-79", "318-80", "318-114", "319-33", "319-51", "319-55", "319-279"]],
    ["arabic-beverage", ["318-84", "318-85", "318-86", "318-95", "318-96", "318-97", "319-23", "319-57", "319-70", "319-77", "319-78", "319-79"]],
    ["soft-garden", ["318-89", "318-91", "318-118", "318-119", "318-120", "319-36", "319-43", "319-49", "319-54", "319-60", "319-66", "319-67", "319-69", "319-122", "319-331"]],
    ["porcelain-heritage", ["318-133", "319-318", "319-319", "319-343"]],
    ["modern-checks", ["318-134", "319-344"]],
    ["animal-print", ["318-129", "318-130", "318-138", "318-139", "318-140", "318-141", "319-286", "319-287", "319-288", "319-289", "319-290", "319-298"]],
    ["ethnic-geometric", ["318-109", "318-110", "318-111", "319-37", "319-39", "319-58", "319-74", "319-110", "319-115", "319-119", "319-253", "319-254", "319-274", "319-315", "319-316", "319-317"]],
    ["silk-road-story", ["319-106", "319-114", "319-302", "319-329"]],
    ["gilded-ornament", ["319-305", "319-306", "319-307", "319-308", "319-309", "319-326", "319-327", "319-334", "319-335"]],
    ["scenic-illustration", ["318-148", "318-150", "319-258", "319-265", "319-338"]],
  ]) {
    for (const code of codes) {
      const current = code.startsWith("318-") ? `318A-${Number(code.slice(4)) - 24}` : code;
      assert.equal(byCode.get(current)?.categoryId, category, current);
    }
  }
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
  assert.match(app, /chooseFilter\("型号318-2\.0L"/);
  assert.match(app, /model-318-2l-plain\.png/);
  assert.match(css, /@media \(min-width:1400px\)\s*\{\s*\.pattern-grid\s*\{[^}]*repeat\(6,/);
  assert.match(app, /const events = \["pointerdown", "click", "wheel", "keydown"\]/);
  assert.match(app, /onClick=\{\(\) => setAutoScroll\(\(playing\) => !playing\)\}/);
  assert.match(app, /prefers-reduced-motion: reduce/);
});
