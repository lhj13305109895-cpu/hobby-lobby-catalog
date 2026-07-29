#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteOrigin = (process.env.SITE_URL || "https://hobby-lobby-catalog.pages.dev").replace(/\/$/, "");
const products = JSON.parse(readFileSync(path.join(root, "src", "data", "products.json"), "utf8")).filter((product) => product.visible);
const categories = JSON.parse(readFileSync(path.join(root, "src", "data", "categories.json"), "utf8"));
const categoryById = new Map(categories.map((category) => [category.categoryId, category]));
const mode = process.argv[2] || "--all";

const escapeXml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");
const escapeHtml = escapeXml;
const absoluteUrl = (source) => new URL(source, `${siteOrigin}/`).href;
const productUrl = (product) => `${siteOrigin}/products/${product.slug}/`;
const productDescription = (product) => product.descriptionZh || `${product.nameZh}花色型号319保温壶，提供1.6L和2.0L两种容量。`;

function structuredData(product) {
  const images = [product.mainImage, product.originalImage, ...(product.detailImages || [])]
    .filter(Boolean)
    .map(absoluteUrl);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl(product)}#product`,
    name: `${product.nameZh}保温壶（${product.slug}）`,
    alternateName: product.nameEn || undefined,
    description: productDescription(product),
    image: [...new Set(images)],
    sku: product.slug,
    mpn: product.slug,
    brand: { "@type": "Brand", name: "Hobby Lobby Ask for More" },
    category: categoryById.get(product.categoryId)?.nameZh || "保温壶",
    material: product.bodyType,
    offers: {
      "@type": "AggregateOffer",
      url: productUrl(product),
      priceCurrency: "CNY",
      lowPrice: "29",
      highPrice: "31",
      offerCount: 2,
      availability: "https://schema.org/InStock",
    },
  };
}

function writeDiscoveryFiles() {
  const publicDir = path.join(root, "public");
  const robots = `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/admin/\n\nSitemap: ${siteOrigin}/sitemap.xml\n`;
  writeFileSync(path.join(publicDir, "robots.txt"), robots);

  const urls = [
    `  <url>\n    <loc>${escapeXml(`${siteOrigin}/`)}</loc>\n    <image:image>\n      <image:loc>${escapeXml(`${siteOrigin}/assets/hero-reference-products.webp`)}</image:loc>\n      <image:title>型号319保温壶花色目录</image:title>\n    </image:image>\n  </url>`,
    ...products.map((product) => {
      const lastmod = String(product.updatedAt || product.createdAt || "").slice(0, 10);
      return `  <url>\n    <loc>${escapeXml(productUrl(product))}</loc>${lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""}\n    <image:image>\n      <image:loc>${escapeXml(absoluteUrl(product.mainImage))}</image:loc>\n      <image:title>${escapeXml(`${product.slug} ${product.nameZh}保温壶`)}</image:title>\n      <image:caption>${escapeXml(product.imageAltZh || productDescription(product))}</image:caption>\n    </image:image>\n  </url>`;
    }),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>\n`;
  writeFileSync(path.join(publicDir, "sitemap.xml"), sitemap);
  console.log(`Generated robots.txt and sitemap.xml for ${products.length} products.`);
}

function writeProductPages() {
  const clientDir = path.join(root, "dist", "client");
  const indexPath = path.join(clientDir, "index.html");
  if (!existsSync(indexPath)) throw new Error(`Missing client build output: ${indexPath}`);
  const template = readFileSync(indexPath, "utf8");

  for (const product of products) {
    const title = `${product.slug} ${product.nameZh}保温壶 | Hobby Lobby`;
    const description = productDescription(product);
    const canonical = productUrl(product);
    const image = absoluteUrl(product.mainImage);
    const jsonLd = JSON.stringify(structuredData(product)).replaceAll("<", "\\u003c");
    const fallback = `<div id="root"><main><article><h1>${escapeHtml(product.slug)} ${escapeHtml(product.nameZh)}保温壶</h1><img src="${escapeHtml(product.mainImage)}" alt="${escapeHtml(product.imageAltZh || `${product.nameZh}保温壶`)}" width="1600" height="1600"><p>${escapeHtml(description)}</p><p>1.6L ¥29 RMB / 24 pcs；2.0L ¥31 RMB / 20 pcs</p><a href="/#gallery">查看全部花色</a></article></main></div>`;
    const html = template
      .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${escapeHtml(description)}" />`)
      .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${escapeHtml(canonical)}" />`)
      .replace(/<meta property="og:type" content="[^"]*"\s*\/?>/, '<meta property="og:type" content="product" />')
      .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
      .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
      .replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${escapeHtml(image)}" />`)
      .replace("</head>", `    <script id="product-structured-data" type="application/ld+json">${jsonLd}</script>\n  </head>`)
      .replace('<div id="root"></div>', fallback);
    const pageDir = path.join(clientDir, "products", product.slug);
    mkdirSync(pageDir, { recursive: true });
    writeFileSync(path.join(pageDir, "index.html"), html);
  }
  console.log(`Generated ${products.length} static product pages.`);
}

if (mode === "--public" || mode === "--all") writeDiscoveryFiles();
if (mode === "--dist" || mode === "--all") writeProductPages();
