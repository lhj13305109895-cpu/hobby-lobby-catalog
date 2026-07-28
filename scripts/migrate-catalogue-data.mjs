import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src", "App.jsx");
const source = readFileSync(sourcePath, "utf8");
const match = source.match(/const catalogue = (\[[\s\S]*?\])\.map\(\(item\) => \{/);
if (!match) throw new Error("Unable to locate catalogue array in src/App.jsx");

const legacyItems = Function(`"use strict"; return (${match[1]});`)();
const categoryDefinitions = [
  ["trend-letters", "潮流字母系列", "Trend Letter Series"],
  ["stainless-floral", "316不锈钢花卉系列", "316 Stainless Floral Series"],
  ["ethnic-geometric", "民族几何系列", "Ethnic Geometric Series"],
  ["botanical-floral", "花卉植物系列", "Botanical Floral Series"],
  ["fresh-fruit", "水果清新系列", "Fresh Fruit Series"],
  ["middle-east-typography", "中东文字系列", "Middle Eastern Typography Series"],
  ["plain-body", "素色光板系列", "Plain Body Series"],
  ["mixed-set", "混色套装系列", "Mixed Set Series"],
  ["arabic-beverage", "阿拉伯茶饮系列", "Arabic Beverage Series"],
  ["ramadan-blessings", "斋月祝福系列", "Ramadan Blessings Series"],
  ["bird-bloom", "花鸟雅集系列", "Bird & Bloom Series"],
];

const categoryByZh = new Map(categoryDefinitions.map((item) => [item[1], item[0]]));
const now = "2026-07-28T00:00:00.000Z";
const categories = categoryDefinitions.map(([categoryId, nameZh, nameEn], index) => ({
  categoryId,
  nameZh,
  nameEn,
  slug: categoryId,
  descriptionZh: "",
  descriptionEn: "",
  sortOrder: (index + 1) * 10,
  enabled: true,
  visible: true,
  protected: false,
  createdAt: now,
  updatedAt: now,
}));
categories.push({
  categoryId: "uncategorized",
  nameZh: "待分类",
  nameEn: "Uncategorized",
  slug: "uncategorized",
  descriptionZh: "暂未分配花色分类的产品。",
  descriptionEn: "Products waiting for a category.",
  sortOrder: 9990,
  enabled: true,
  visible: false,
  protected: true,
  createdAt: now,
  updatedAt: now,
});

const products = legacyItems.map((item, index) => {
  const code = String(item.no).padStart(2, "0");
  const sourceImage = item.image || `/assets/today-pattern-${code}.jpg`;
  const displayImage = sourceImage.replace(/\.png$/i, "-display.jpg");
  const thumbImage = item.image
    ? sourceImage.replace("new-pattern-", "new-thumb-").replace(/\.(png|jpg)$/i, ".jpg")
    : `/assets/today-thumb-${code}.jpg`;
  return {
    productId: `pattern-${code}`,
    slug: `319-${code}`,
    nameZh: item.name,
    nameEn: item.nameEn || "",
    model: "319",
    capacities: ["1.6L", "2.0L"],
    descriptionZh: "",
    descriptionEn: "",
    categoryId: categoryByZh.get(item.family) || "uncategorized",
    bodyType: item.body,
    mainImage: displayImage,
    thumbnailImage: thumbImage,
    originalImage: sourceImage,
    detailImages: [],
    imageAltZh: `${item.name}保温壶`,
    imageAltEn: item.nameEn ? `${item.nameEn} thermal pot` : "",
    sortOrder: (index + 1) * 10,
    isNew: item.no >= 72,
    featured: false,
    pinned: false,
    visible: true,
    createdAt: now,
    updatedAt: now,
  };
});

mkdirSync(path.join(root, "src", "data"), { recursive: true });
mkdirSync(path.join(root, "backups", "pre-admin-2026-07-28"), { recursive: true });
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
writeFileSync(path.join(root, "src", "data", "products.json"), json(products));
writeFileSync(path.join(root, "src", "data", "categories.json"), json(categories));
writeFileSync(path.join(root, "backups", "pre-admin-2026-07-28", "products.json"), json(products));
writeFileSync(path.join(root, "backups", "pre-admin-2026-07-28", "categories.json"), json(categories));
writeFileSync(path.join(root, "backups", "pre-admin-2026-07-28", "README.md"), [
  "# 管理后台迁移前数据备份",
  "",
  `- 来源提交：7828cab`,
  `- 产品数量：${products.length}`,
  `- 原分类数量：${categoryDefinitions.length}`,
  "- 额外加入受保护的 `uncategorized`（待分类）分类，默认不在前台显示。",
  "- 此目录用于审计和恢复，不由前台直接读取。",
  "",
].join("\n"));

const dataBackedCatalogue = `const categories = [...categoriesData]
  .filter((category) => category.enabled && category.visible)
  .sort((a, b) => a.sortOrder - b.sortOrder);
const categoryById = new Map(categoriesData.map((category) => [category.categoryId, category]));
const categoryByNameZh = new Map(categoriesData.map((category) => [category.nameZh, category]));
const catalogue = [...productsData]
  .filter((product) => product.visible && categoryById.get(product.categoryId)?.enabled && categoryById.get(product.categoryId)?.visible)
  .sort((a, b) => (categoryById.get(a.categoryId)?.sortOrder || 9999) - (categoryById.get(b.categoryId)?.sortOrder || 9999)
    || Number(b.pinned) - Number(a.pinned) || a.sortOrder - b.sortOrder)
  .map((product) => ({
    ...product,
    id: product.productId,
    no: Number(product.slug.split("-").at(-1)),
    name: product.nameZh,
    nameEn: product.nameEn,
    family: categoryById.get(product.categoryId)?.nameZh || "待分类",
    body: product.bodyType,
    image: product.originalImage,
    displayImage: product.mainImage,
    thumb: product.thumbnailImage,
  }));`;
const catalogueStart = source.indexOf("const catalogue = [");
const filtersStart = source.indexOf("const filters =", catalogueStart);
if (catalogueStart < 0 || filtersStart < 0) throw new Error("Unable to replace legacy catalogue block");
let migratedSource = `${source.slice(0, catalogueStart)}${dataBackedCatalogue}\n\n${source.slice(filtersStart)}`;
migratedSource = migratedSource.replace(
  'import { useEffect, useMemo, useState } from "react";',
  'import { lazy, Suspense, useEffect, useMemo, useState } from "react";\nimport productsData from "./data/products.json";\nimport categoriesData from "./data/categories.json";',
);
migratedSource = migratedSource.replace(
  '} from "@phosphor-icons/react";',
  '} from "@phosphor-icons/react";\n\nconst AdminApp = lazy(() => import("./admin/AdminApp.jsx").then((module) => ({ default: module.AdminApp })));',
);
migratedSource = migratedSource.replace("export function App() {", "function Storefront() {");
migratedSource += `\n\nexport function App() {\n  return window.location.pathname.startsWith("/admin")\n    ? <Suspense fallback={<main style={{ padding: 24 }}>正在加载管理后台…</main>}><AdminApp /></Suspense>\n    : <Storefront />;\n}\n`;
writeFileSync(sourcePath, migratedSource);

console.log(`Migrated ${products.length} products and ${categories.length} categories.`);
