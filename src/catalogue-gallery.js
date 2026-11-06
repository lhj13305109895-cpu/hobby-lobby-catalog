const catalogueDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const importedAt = (pattern) => Date.parse(pattern.createdAt) || 0;

export function latestGalleryImportDay(patterns) {
  const latest = patterns.reduce((time, pattern) => Math.max(time, importedAt(pattern)), 0);
  return latest ? catalogueDay.format(latest) : null;
}

export function groupGalleryPatterns(patterns, importOrder, latestDay) {
  const groups = new Map();
  for (const pattern of patterns) {
    if (!groups.has(pattern.family)) groups.set(pattern.family, []);
    groups.get(pattern.family).push(pattern);
  }

  const newestFirst = (a, b) => importedAt(b) - importedAt(a)
    || (importOrder.get(b.id) ?? -1) - (importOrder.get(a.id) ?? -1);
  const ranked = [...groups].map(([family, items], index) => ({
    family,
    items: items.sort(newestFirst),
    index,
    additions: latestDay ? items.filter((pattern) => (
      importedAt(pattern) && catalogueDay.format(importedAt(pattern)) === latestDay
    )).length : 0,
    isSet: items[0].categoryId === "mixed-set",
  }));

  return ranked.sort((a, b) => Number(a.isSet) - Number(b.isSet)
    || b.additions - a.additions
    || (a.additions ? newestFirst(a.items[0], b.items[0]) : 0)
    || a.index - b.index
  ).map(({ family, items }) => [family, items]);
}

export function nextGalleryScrollY(currentY, startY, endY, step, hasMoreSeries) {
  if (currentY < endY) return Math.min(endY, currentY + step);
  // The bottom of the currently rendered list is not the end of the catalogue.
  return hasMoreSeries ? currentY : startY;
}
