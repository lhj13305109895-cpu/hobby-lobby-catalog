#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = process.argv[2];
if (!sourceDir) throw new Error("Usage: node scripts/import-318-products.mjs <source-directory>");

const categoryIds = [
  "ethnic-geometric", "ethnic-geometric", "botanical-floral", "botanical-floral", "soft-garden",
  "botanical-floral", "minimal-art", "coffee-food", "soft-garden", "botanical-floral",
  "botanical-floral", "fresh-fruit", "fresh-fruit", "fresh-fruit", "ethnic-geometric",
  "cottage-rabbit", "ramadan-blessings", "ramadan-blessings", "soft-garden", "soft-garden",
  "cottage-rabbit", "botanical-floral", "botanical-floral", "bird-bloom", "bird-bloom",
  "soft-garden", "soft-garden", "soft-garden", "cottage-rabbit", "botanical-floral",
  "ramadan-blessings", "ramadan-blessings", "ramadan-blessings", "coffee-food", "coffee-food",
  "coffee-food", "botanical-floral", "botanical-floral", "botanical-floral", "botanical-floral",
  "coffee-food", "coffee-food", "ramadan-blessings", "coffee-food", "ramadan-blessings",
  "ramadan-blessings", "ramadan-blessings", "arabic-beverage", "arabic-beverage", "minimal-art",
  "porcelain-heritage", "porcelain-heritage", "ramadan-blessings", "ramadan-blessings", "ethnic-geometric",
  "botanical-floral", "ethnic-geometric", "arabic-beverage", "soft-garden", "middle-east-typography",
  "middle-east-typography", "middle-east-typography", "soft-garden", "botanical-floral", "porcelain-heritage",
  "botanical-floral", "botanical-floral", "oriental-muse", "porcelain-heritage", "botanical-floral",
  "arabic-beverage", "arabic-beverage", "arabic-beverage", "arabic-beverage", "arabic-beverage",
  "arabic-beverage", "arabic-beverage", "fresh-fruit", "fresh-fruit", "playful-pop",
  "playful-pop", "playful-pop", "botanical-floral", "ethnic-geometric", "ethnic-geometric",
  "ethnic-geometric", "ethnic-geometric", "ethnic-geometric", "ethnic-geometric", "ethnic-geometric",
  "porcelain-heritage", "ethnic-geometric", "ethnic-geometric", "soft-garden", "soft-garden",
  "soft-garden", "ethnic-geometric", "fresh-fruit", "porcelain-heritage",
];

const categories = JSON.parse(readFileSync(path.join(root, "src/data/categories.json"), "utf8"));
const categoryById = new Map(categories.map((category) => [category.categoryId, category]));
const productsPath = path.join(root, "src/data/products.json");
const existing = JSON.parse(readFileSync(productsPath, "utf8")).filter((product) => product.model !== "318");
const sourceFiles = readdirSync(sourceDir)
  .filter((file) => /\.png$/i.test(file))
  .sort((a, b) => Number(a.match(/-(\d+)\.png$/i)?.[1]) - Number(b.match(/-(\d+)\.png$/i)?.[1]));

if (sourceFiles.length !== categoryIds.length) throw new Error(`Expected ${categoryIds.length} PNGs but found ${sourceFiles.length}.`);

const categoryCounts = new Map();
const createdAt = "2026-09-24T00:00:00.000Z";
const imported = sourceFiles.map((_, index) => {
  const categoryId = categoryIds[index];
  const category = categoryById.get(categoryId);
  const sequence = (categoryCounts.get(categoryId) || 0) + 1;
  categoryCounts.set(categoryId, sequence);
  const code = String(index + 1).padStart(3, "0");
  const slug = `318-${code}`;
  const nameZh = `${category.nameZh.replace("系列", "")}花色 ${String(sequence).padStart(2, "0")}`;
  const nameEn = `${category.nameEn.replace(" Series", "")} Pattern ${String(sequence).padStart(2, "0")}`;
  return {
    productId: `pattern-318-${code}`,
    slug,
    nameZh,
    nameEn,
    model: "318",
    capacities: ["1.2L"],
    descriptionZh: `型号318 ${nameZh}保温壶，采用${category.nameZh}图案，提供1.2L容量，目录价 ¥32 RMB。`,
    descriptionEn: `Model 318 ${nameEn} thermal pot in the ${category.nameEn}, available in 1.2L at ¥32 RMB.`,
    categoryId,
    bodyType: "白色壶身",
    mainImage: `/assets/catalogue/${slug}.webp`,
    thumbnailImage: `/assets/catalogue/${slug}-thumb.webp`,
    originalImage: `/assets/catalogue/${slug}.webp`,
    detailImages: [],
    imageAltZh: `${slug} ${nameZh}保温壶`,
    imageAltEn: `${slug} ${nameEn} thermal pot`,
    sortOrder: 10000 + index * 10,
    isNew: true,
    featured: false,
    pinned: false,
    visible: true,
    createdAt,
    updatedAt: createdAt,
  };
});

writeFileSync(productsPath, `${JSON.stringify([...existing, ...imported], null, 2)}\n`);
console.log(`Imported ${imported.length} Model 318 products.`);
