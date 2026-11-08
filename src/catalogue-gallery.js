const catalogueDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const importedAt = (pattern) => Date.parse(pattern.createdAt) || 0;
export const LATEST_ARRIVALS_SERIES = "latest-arrivals";

export function latestGalleryImportDay(patterns) {
  const latest = patterns.reduce((time, pattern) => Math.max(time, importedAt(pattern)), 0);
  return latest ? catalogueDay.format(latest) : null;
}

export function groupGalleryPatterns(patterns, importOrder, latestDay) {
  const groups = new Map();
  const latestArrivals = [];
  for (const pattern of patterns) {
    if (!groups.has(pattern.family)) groups.set(pattern.family, { items: [], additions: 0 });
    const group = groups.get(pattern.family);
    group.items.push(pattern);
    const timestamp = importedAt(pattern);
    if (latestDay && timestamp && catalogueDay.format(timestamp) === latestDay) {
      group.additions += 1;
      latestArrivals.push(pattern);
    }
  }

  const newestFirst = (a, b) => importedAt(b) - importedAt(a)
    || (importOrder.get(b.id) ?? -1) - (importOrder.get(a.id) ?? -1);
  const ranked = [...groups].map(([family, { items, additions }], index) => ({
    family,
    items: items.sort(newestFirst),
    index,
    additions,
    isSet: items[0].categoryId === "mixed-set",
  }));

  const series = ranked.sort((a, b) => Number(a.isSet) - Number(b.isSet)
    || b.additions - a.additions
    || (a.additions ? newestFirst(a.items[0], b.items[0]) : 0)
    || a.index - b.index
  ).map(({ family, items }) => [family, items]);

  // This is a showcase, not a product category: arrivals also stay in their own series.
  return latestArrivals.length
    ? [[LATEST_ARRIVALS_SERIES, latestArrivals.sort(newestFirst)], ...series]
    : series;
}

export function galleryScrollStep(elapsedMs, remainder = 0) {
  // 60 CSS pixels per second is one pixel per frame at 60 Hz. Keep fractional
  // progress at other refresh rates, but don't jump to catch up after a stall.
  const distance = remainder + Math.min(Math.max(0, elapsedMs), 1000 / 30) * 0.06;
  const step = Math.round(distance);
  return { step, remainder: distance - step };
}

export function nextGalleryScrollY(currentY, startY, endY, step, hasMoreSeries) {
  if (currentY < endY) return Math.min(endY, currentY + step);
  // The bottom of the currently rendered list is not the end of the catalogue.
  return hasMoreSeries ? currentY : startY;
}
