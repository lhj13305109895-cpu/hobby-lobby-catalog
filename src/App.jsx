import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import productsData from "./data/products.json";
import categoriesData from "./data/categories.json";
import {
  ArrowDown, ArrowLeft, ArrowRight, Check, Heart,
  DownloadSimple, MagnifyingGlassPlus, PaintBrush, ShieldCheck, ShoppingCart, Trash, X,
} from "@phosphor-icons/react";

const AdminApp = lazy(() => import("./admin/AdminApp.jsx").then((module) => ({ default: module.AdminApp })));

const versionUploadedAsset = (source, updatedAt) => {
  if (!source?.startsWith("/assets/uploads/")) return source;
  const version = Date.parse(updatedAt) || updatedAt || "1";
  return `${source}${source.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
};

const categories = [...categoriesData]
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
    image: versionUploadedAsset(product.originalImage, product.updatedAt),
    displayImage: versionUploadedAsset(product.mainImage, product.updatedAt),
    thumb: versionUploadedAsset(product.thumbnailImage, product.updatedAt),
  }));

const heroShowcasePatterns = catalogue.filter((product) => product.categoryId === "botanical-floral").slice(-10);
const heroFeaturedPattern = catalogue.find((product) => product.no === 54) || heroShowcasePatterns[0] || catalogue[0];

const filters = ["全部花色", "白色壶身", "316不锈钢", "混色套装"];

const capacities = [
  { id: "1.6L", price: "¥29 RMB", priceNumber: 29, packing: "24 pcs", pcsPerCarton: 24, cbm: 0.14 },
  { id: "2.0L", price: "¥31 RMB", priceNumber: 31, packing: "20 pcs", pcsPerCarton: 20, cbm: 0.15 },
];

const languageOptions = [
  { id: "zh", label: "中文" },
  { id: "en", label: "English" },
];

const quoteNumberKey = "hobby-lobby-319-quote-number";
const quoteNumberPrefix = "XSD202607";
const quoteNumberStart = 3;

const escapeXml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function textBytes(text) {
  return new TextEncoder().encode(text);
}

function dataUriToBytes(dataUri) {
  const [header, base64] = dataUri.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { bytes, extension: mime.includes("png") ? "png" : "jpg", contentType: mime.includes("png") ? "image/png" : "image/jpeg" };
}

async function dataUriToImageData(dataUri) {
  const imageBytes = dataUriToBytes(dataUri);
  const dimensions = await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 1, height: 1 });
    image.src = dataUri;
  });
  return { ...imageBytes, ...dimensions };
}

function loadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

const imageContentBoundsCache = new WeakMap();

function getImageContentBounds(image) {
  if (imageContentBoundsCache.has(image)) return imageContentBoundsCache.get(image);

  const fullBounds = { sx: 0, sy: 0, sw: image.naturalWidth, sh: image.naturalHeight };
  const analysisScale = Math.min(1, 480 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * analysisScale));
  const height = Math.max(1, Math.round(image.naturalHeight * analysisScale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);

  try {
    const pixels = context.getImageData(0, 0, width, height).data;
    const cornerSize = Math.max(2, Math.round(Math.min(width, height) * 0.035));
    const corners = [
      [0, 0],
      [width - cornerSize, 0],
      [0, height - cornerSize],
      [width - cornerSize, height - cornerSize],
    ].map(([startX, startY]) => {
      const total = [0, 0, 0];
      let count = 0;
      for (let y = startY; y < startY + cornerSize; y += 1) {
        for (let x = startX; x < startX + cornerSize; x += 1) {
          const offset = (y * width + x) * 4;
          total[0] += pixels[offset];
          total[1] += pixels[offset + 1];
          total[2] += pixels[offset + 2];
          count += 1;
        }
      }
      return total.map((value) => value / count);
    });
    const background = [0, 1, 2].map((channel) => corners.reduce((sum, color) => sum + color[channel], 0) / corners.length);
    const cornerSpread = Math.max(...corners.map((color) => Math.max(...color.map((value, channel) => Math.abs(value - background[channel])))));

    // Full-bleed photos have different corner colours and must not be cropped.
    // Uniform white or beige borders have matching corners and can be removed safely.
    if (cornerSpread <= 32) {
      const rowHits = new Uint16Array(height);
      const columnHits = new Uint16Array(width);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const offset = (y * width + x) * 4;
          const difference = Math.max(
            Math.abs(pixels[offset] - background[0]),
            Math.abs(pixels[offset + 1] - background[1]),
            Math.abs(pixels[offset + 2] - background[2]),
          );
          if (pixels[offset + 3] > 16 && difference > 14) {
            rowHits[y] += 1;
            columnHits[x] += 1;
          }
        }
      }

      const rowThreshold = Math.max(2, Math.floor(width * 0.008));
      const columnThreshold = Math.max(2, Math.floor(height * 0.008));
      const top = rowHits.findIndex((hits) => hits >= rowThreshold);
      let bottom = -1;
      for (let y = height - 1; y >= 0; y -= 1) {
        if (rowHits[y] >= rowThreshold) { bottom = y; break; }
      }
      const left = columnHits.findIndex((hits) => hits >= columnThreshold);
      let right = -1;
      for (let x = width - 1; x >= 0; x -= 1) {
        if (columnHits[x] >= columnThreshold) { right = x; break; }
      }

      if (top >= 0 && left >= 0 && bottom > top && right > left) {
        const contentWidth = right - left + 1;
        const contentHeight = bottom - top + 1;
        if (contentWidth >= width * 0.18 && contentHeight >= height * 0.18) {
          const paddingX = Math.max(2, Math.round(contentWidth * 0.025));
          const paddingY = Math.max(2, Math.round(contentHeight * 0.025));
          const cropLeft = Math.max(0, left - paddingX);
          const cropTop = Math.max(0, top - paddingY);
          const cropRight = Math.min(width - 1, right + paddingX);
          const cropBottom = Math.min(height - 1, bottom + paddingY);
          const bounds = {
            sx: cropLeft / analysisScale,
            sy: cropTop / analysisScale,
            sw: (cropRight - cropLeft + 1) / analysisScale,
            sh: (cropBottom - cropTop + 1) / analysisScale,
          };
          imageContentBoundsCache.set(image, bounds);
          return bounds;
        }
      }
    }
  } catch {
    // If canvas pixel inspection is unavailable, keep the complete source image.
  }

  imageContentBoundsCache.set(image, fullBounds);
  return fullBounds;
}

function drawContainedImage(context, image, x, y, width, height, padding = 0) {
  const { sx, sy, sw, sh } = getImageContentBounds(image);
  const availableWidth = Math.max(1, width - padding * 2);
  const availableHeight = Math.max(1, height - padding * 2);
  const scale = Math.min(availableWidth / sw, availableHeight / sh);
  const drawWidth = sw * scale;
  const drawHeight = sh * scale;
  context.drawImage(image, sx, sy, sw, sh, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawCoveredImage(context, image, x, y, width, height) {
  const { sx, sy, sw, sh } = getImageContentBounds(image);
  const scale = Math.max(width / sw, height / sh);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = sx + (sw - sourceWidth) / 2;
  const sourceY = sy + (sh - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

async function prepareQuoteImage(dataUri, targetAspect = 209 / 136, fillFrame = false) {
  const image = await loadCanvasImage(dataUri);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = 720;
  outputCanvas.height = Math.round(outputCanvas.width / targetAspect);
  const outputContext = outputCanvas.getContext("2d");
  outputContext.fillStyle = "#ffffff";
  outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

  if (fillFrame) drawCoveredImage(outputContext, image, 0, 0, outputCanvas.width, outputCanvas.height);
  else drawContainedImage(outputContext, image, 0, 0, outputCanvas.width, outputCanvas.height);
  return outputCanvas.toDataURL("image/jpeg", 0.86);
}

const quoteImageCache = new Map();

function concatByteArrays(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function makeImagePdf(pages) {
  const encoder = new TextEncoder();
  const objects = new Map();
  const pageReferences = pages.map((_, index) => `${3 + index * 3} 0 R`).join(" ");
  objects.set(1, encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.set(2, encoder.encode(`<< /Type /Pages /Kids [${pageReferences}] /Count ${pages.length} >>`));

  pages.forEach((page, index) => {
    const pageObject = 3 + index * 3;
    const imageObject = pageObject + 1;
    const contentObject = pageObject + 2;
    const jpeg = dataUriToBytes(page.dataUri).bytes;
    const content = encoder.encode("q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n");
    objects.set(pageObject, encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`));
    objects.set(imageObject, concatByteArrays([
      encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
      jpeg,
      encoder.encode("\nendstream"),
    ]));
    objects.set(contentObject, concatByteArrays([
      encoder.encode(`<< /Length ${content.length} >>\nstream\n`),
      content,
      encoder.encode("endstream"),
    ]));
  });

  const parts = [encoder.encode("%PDF-1.4\n%1234\n")];
  const offsets = [0];
  let byteOffset = parts[0].length;
  const objectCount = 2 + pages.length * 3;
  for (let objectNumber = 1; objectNumber <= objectCount; objectNumber += 1) {
    const objectBytes = concatByteArrays([
      encoder.encode(`${objectNumber} 0 obj\n`),
      objects.get(objectNumber),
      encoder.encode("\nendobj\n"),
    ]);
    offsets[objectNumber] = byteOffset;
    parts.push(objectBytes);
    byteOffset += objectBytes.length;
  }
  const xrefOffset = byteOffset;
  const xref = ["xref", `0 ${objectCount + 1}`, "0000000000 65535 f "];
  for (let objectNumber = 1; objectNumber <= objectCount; objectNumber += 1) {
    xref.push(`${String(offsets[objectNumber]).padStart(10, "0")} 00000 n `);
  }
  xref.push("trailer", `<< /Size ${objectCount + 1} /Root 1 0 R >>`, "startxref", String(xrefOffset), "%%EOF");
  parts.push(encoder.encode(`${xref.join("\n")}\n`));
  return new Blob([concatByteArrays(parts)], { type: "application/pdf" });
}

async function buildQuotePageImages(entries, quoteNo, dateDisplay) {
  const rowsPerPage = 7;
  const pageCount = Math.ceil(entries.length / rowsPerPage);
  const uniquePatterns = [...new Map(entries.map(({ pattern }) => [pattern.id, pattern])).values()];
  const loadedImages = new Map(await Promise.all(uniquePatterns.map(async (pattern) => [
    pattern.id,
    await loadCanvasImage(pattern.thumb),
  ])));
  const totals = entries.reduce((summary, { capacity, quantity }) => ({
    cartons: summary.cartons + quantity,
    pieces: summary.pieces + capacity.pcsPerCarton * quantity,
    amount: summary.amount + capacity.pcsPerCarton * quantity * capacity.priceNumber,
    cbm: summary.cbm + capacity.cbm * quantity,
  }), { cartons: 0, pieces: 0, amount: 0, cbm: 0 });
  const pages = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = 1240;
    canvas.height = 1754;
    const context = canvas.getContext("2d");
    context.fillStyle = "#fffdfa";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#c90816";
    context.fillRect(0, 0, canvas.width, 18);
    context.fillStyle = "#211d1a";
    context.font = '700 50px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText("型号 319 花色报价单", 58, 88);
    context.fillStyle = "#6e655f";
    context.font = '26px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText(`报价单号：${quoteNo}    日期：${dateDisplay}`, 60, 137);
    context.textAlign = "right";
    context.fillText(`第 ${pageIndex + 1} / ${pageCount} 页`, 1180, 137);
    context.textAlign = "left";

    const headerY = 176;
    context.fillStyle = "#211d1a";
    context.fillRect(42, headerY, 1156, 62);
    context.fillStyle = "#ffffff";
    context.font = '700 23px "Microsoft YaHei", "PingFang SC", sans-serif';
    const headings = [[60, "产品图片"], [260, "型号 / 花色"], [650, "容量 / 装箱"], [820, "箱数"], [925, "数量"], [1040, "金额"]];
    headings.forEach(([x, label]) => context.fillText(label, x, headerY + 40));

    const pageEntries = entries.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    pageEntries.forEach(({ pattern, capacity, quantity }, rowIndex) => {
      const y = 238 + rowIndex * 190;
      context.fillStyle = rowIndex % 2 ? "#faf5ee" : "#ffffff";
      context.fillRect(42, y, 1156, 190);
      context.strokeStyle = "#e0d7cf";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(42, y + 190);
      context.lineTo(1198, y + 190);
      context.stroke();
      drawContainedImage(context, loadedImages.get(pattern.id), 48, y + 4, 190, 182, 2);
      context.fillStyle = "#c90816";
      context.font = '700 24px "Microsoft YaHei", "PingFang SC", sans-serif';
      context.fillText(`319-${String(pattern.no).padStart(2, "0")}`, 260, y + 52);
      context.fillStyle = "#211d1a";
      context.font = '700 30px "Microsoft YaHei", "PingFang SC", sans-serif';
      context.fillText(pattern.name, 260, y + 96);
      context.fillStyle = "#6e655f";
      context.font = '22px "Microsoft YaHei", "PingFang SC", sans-serif';
      context.fillText(pattern.family, 260, y + 138);
      context.fillStyle = "#211d1a";
      context.font = '700 28px "Microsoft YaHei", "PingFang SC", sans-serif';
      context.fillText(capacity.id, 650, y + 76);
      context.fillStyle = "#6e655f";
      context.font = '22px "Microsoft YaHei", "PingFang SC", sans-serif';
      context.fillText(`${capacity.pcsPerCarton}只/箱 · ¥${capacity.priceNumber}/只`, 650, y + 117);
      context.fillStyle = "#211d1a";
      context.font = '700 30px "Microsoft YaHei", "PingFang SC", sans-serif';
      context.fillText(String(quantity), 830, y + 98);
      context.fillText(String(quantity * capacity.pcsPerCarton), 935, y + 98);
      context.fillStyle = "#c90816";
      context.fillText(`¥${quantity * capacity.pcsPerCarton * capacity.priceNumber}`, 1040, y + 98);
    });

    context.fillStyle = "#c90816";
    context.fillRect(42, 1590, 1156, 112);
    context.fillStyle = "#ffffff";
    context.font = '700 25px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText(`合计  ${totals.cartons} 箱  |  ${totals.pieces} 只  |  ${totals.cbm.toFixed(2)} CBM`, 70, 1658);
    context.textAlign = "right";
    context.font = '700 36px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText(`总金额 ¥${totals.amount}`, 1168, 1664);
    context.textAlign = "left";
    pages.push({ dataUri: canvas.toDataURL("image/jpeg", 0.88), width: canvas.width, height: canvas.height });
  }
  return pages;
}

function writeUint16(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function createZip(entries) {
  const fileParts = [];
  const centralParts = [];
  let offset = 0;

  entries.forEach(({ name, content }) => {
    const nameBytes = textBytes(name);
    const contentBytes = typeof content === "string" ? textBytes(content) : content;
    const checksum = crc32(contentBytes);
    const local = new Uint8Array(30 + nameBytes.length);
    writeUint32(local, 0, 0x04034b50);
    writeUint16(local, 4, 20);
    writeUint16(local, 6, 0x0800);
    writeUint16(local, 8, 0);
    writeUint32(local, 14, checksum);
    writeUint32(local, 18, contentBytes.length);
    writeUint32(local, 22, contentBytes.length);
    writeUint16(local, 26, nameBytes.length);
    local.set(nameBytes, 30);
    fileParts.push(local, contentBytes);

    const central = new Uint8Array(46 + nameBytes.length);
    writeUint32(central, 0, 0x02014b50);
    writeUint16(central, 4, 20);
    writeUint16(central, 6, 20);
    writeUint16(central, 8, 0x0800);
    writeUint16(central, 10, 0);
    writeUint32(central, 16, checksum);
    writeUint32(central, 20, contentBytes.length);
    writeUint32(central, 24, contentBytes.length);
    writeUint16(central, 28, nameBytes.length);
    writeUint32(central, 42, offset);
    central.set(nameBytes, 46);
    centralParts.push(central);
    offset += local.length + contentBytes.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 8, entries.length);
  writeUint16(end, 10, entries.length);
  writeUint32(end, 12, centralSize);
  writeUint32(end, 16, offset);
  return new Blob([...fileParts, ...centralParts, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function inlineStringCell(ref, value, style = 0) {
  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t>${escapeXml(value)}</t></is></c>`;
}

function numberCell(ref, value, style = 0) {
  return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
}

function currencyCell(ref, value) {
  return `<c r="${ref}" s="6"><v>${value}</v></c>`;
}

function formulaCurrencyCell(ref, formula, value) {
  return `<c r="${ref}" s="6"><f>${escapeXml(formula)}</f><v>${value}</v></c>`;
}

function emptyCell(ref, style = 1) {
  return `<c r="${ref}" s="${style}"/>`;
}

function makeQuoteXlsx({ entries, quoteNo, dateDisplay, imageData }) {
  const dataStartRow = 9;
  const totalRow = dataStartRow + entries.length;
  const tailRow = totalRow + 1;
  const bankRow = totalRow + 2;
  const rowXml = [];
  const merges = ["A1:K1", "A2:K2", "B3:D3", "F3:H3", "J3:K3", "B4:D4", "F4:H4", "J4:K4", "B5:K5", "B6:K6", "B7:F7", "H7:K7"];

  rowXml.push(`<row r="1" ht="94" customHeight="1">${inlineStringCell("A1", "OWN GREAT INDUSTRIAL GROUP LIMITED\nADD:Xiqiao Industrial Zone, Sharon Road, Jiujiang Town, Nanhai District, Foshan City, Guangdong Province\nADD:国际商贸城二区20号门3楼12街16213商位", 2)}</row>`);
  rowXml.push(`<row r="2" ht="37" customHeight="1">${inlineStringCell("A2", "拥    越    销    售    单", 3)}</row>`);
  rowXml.push(`<row r="3" ht="23" customHeight="1">${inlineStringCell("A3", "客户:", 0)}${emptyCell("B3", 0)}${inlineStringCell("E3", "日期:", 0)}${inlineStringCell("F3", dateDisplay, 0)}${inlineStringCell("I3", "编号:", 0)}${inlineStringCell("J3", quoteNo, 0)}</row>`);
  rowXml.push(`<row r="4" ht="23" customHeight="1">${inlineStringCell("A4", "联系人:", 0)}${emptyCell("B4", 0)}${inlineStringCell("E4", "联系方式：", 0)}${emptyCell("F4", 0)}${inlineStringCell("I4", "交货日期:", 0)}${emptyCell("J4", 0)}</row>`);
  rowXml.push(`<row r="5" ht="36" customHeight="1">${inlineStringCell("A5", "交货地点:", 0)}${emptyCell("B5", 0)}</row>`);
  rowXml.push(`<row r="6" ht="15.75" customHeight="1">${inlineStringCell("A6", "付款方式：", 0)}${emptyCell("B6", 0)}</row>`);
  rowXml.push(`<row r="7" ht="54" customHeight="1">${inlineStringCell("A7", "唛头:\nMARK:", 7)}${emptyCell("B7", 1)}${emptyCell("C7", 1)}${emptyCell("D7", 1)}${emptyCell("E7", 1)}${emptyCell("F7", 1)}${inlineStringCell("G7", "小标签", 1)}${inlineStringCell("H7", "无", 4)}${emptyCell("I7", 4)}${emptyCell("J7", 4)}${emptyCell("K7", 4)}</row>`);
  rowXml.push(`<row r="8" ht="31.5" customHeight="1">${inlineStringCell("A8", "商品名称\nITEM NO", 5)}${inlineStringCell("B8", "产品图片\nPHOTO", 5)}${inlineStringCell("C8", "件数\nCTNS", 5)}${inlineStringCell("D8", "内装量\nPCS/CTN", 5)}${inlineStringCell("E8", "数量\nTOTAL", 5)}${inlineStringCell("F8", "单价\nPRICE", 5)}${inlineStringCell("G8", "价税合计\nTT AMT", 5)}${inlineStringCell("H8", "单件体积\nCBM/CTN", 5)}${inlineStringCell("I8", "总体积\nTT CBM", 5)}${inlineStringCell("J8", "备注\nREMARKS", 5)}${emptyCell("K8", 5)}</row>`);
  merges.push("J8:K8");

  entries.forEach(({ pattern, capacity, quantity }, index) => {
    const row = dataStartRow + index;
    const totalPieces = capacity.pcsPerCarton * quantity;
    const totalAmount = totalPieces * capacity.priceNumber;
    const totalCbm = Number((quantity * capacity.cbm).toFixed(2));
    merges.push(`J${row}:K${row}`);
    rowXml.push(`<row r="${row}" ht="105" customHeight="1">${inlineStringCell(`A${row}`, `319-${String(pattern.no).padStart(2, "0")} ${pattern.name} ${capacity.id}\n${pattern.family}`, 8)}${emptyCell(`B${row}`, 1)}${numberCell(`C${row}`, quantity, 4)}${numberCell(`D${row}`, capacity.pcsPerCarton, 4)}${numberCell(`E${row}`, totalPieces, 4)}${numberCell(`F${row}`, capacity.priceNumber, 4)}${formulaCurrencyCell(`G${row}`, `E${row}*F${row}`, totalAmount)}${numberCell(`H${row}`, capacity.cbm.toFixed(2), 4)}${numberCell(`I${row}`, totalCbm.toFixed(2), 4)}${inlineStringCell(`J${row}`, `型号319\n\n${capacity.id}`, 4)}${emptyCell(`K${row}`, 4)}</row>`);
  });

  const totals = entries.reduce((summary, { capacity, quantity }) => {
    const pieces = capacity.pcsPerCarton * quantity;
    summary.cartons += quantity;
    summary.pieces += pieces;
    summary.amount += pieces * capacity.priceNumber;
    summary.cbm += quantity * capacity.cbm;
    return summary;
  }, { cartons: 0, pieces: 0, amount: 0, cbm: 0 });
  merges.push(`J${totalRow}:K${totalRow}`, `C${tailRow}:F${tailRow}`, `J${tailRow}:K${tailRow}`, `A${bankRow}:K${bankRow}`);
  rowXml.push(`<row r="${totalRow}" ht="23" customHeight="1">${inlineStringCell(`A${totalRow}`, "合计:", 7)}${emptyCell(`B${totalRow}`, 7)}${numberCell(`C${totalRow}`, totals.cartons, 7)}${emptyCell(`D${totalRow}`, 7)}${numberCell(`E${totalRow}`, totals.pieces, 7)}${emptyCell(`F${totalRow}`, 7)}${formulaCurrencyCell(`G${totalRow}`, `SUM(G${dataStartRow}:G${totalRow - 1})`, totals.amount)}${emptyCell(`H${totalRow}`, 7)}${numberCell(`I${totalRow}`, totals.cbm.toFixed(2), 7)}${emptyCell(`J${totalRow}`, 7)}${emptyCell(`K${totalRow}`, 7)}</row>`);
  rowXml.push(`<row r="${tailRow}" ht="23" customHeight="1">${inlineStringCell(`A${tailRow}`, "部门:", 1)}${inlineStringCell(`B${tailRow}`, "业务员:", 1)}${emptyCell(`C${tailRow}`, 1)}${emptyCell(`D${tailRow}`, 1)}${emptyCell(`E${tailRow}`, 1)}${emptyCell(`F${tailRow}`, 1)}${inlineStringCell(`G${tailRow}`, "制单人:", 1)}${emptyCell(`H${tailRow}`, 1)}${inlineStringCell(`I${tailRow}`, "审核人:", 1)}${emptyCell(`J${tailRow}`, 1)}${emptyCell(`K${tailRow}`, 1)}</row>`);
  rowXml.push(`<row r="${bankRow}" ht="56" customHeight="1">${inlineStringCell(`A${bankRow}`, "收款账号：\n郭宝宝，6228480388950363373，ABC，义乌解放之行\n陈亚平，6230910799115975545，东阳农商银行上卢支行", 1)}${emptyCell(`B${bankRow}`, 1)}${emptyCell(`C${bankRow}`, 1)}${emptyCell(`D${bankRow}`, 1)}${emptyCell(`E${bankRow}`, 1)}${emptyCell(`F${bankRow}`, 1)}${emptyCell(`G${bankRow}`, 1)}${emptyCell(`H${bankRow}`, 1)}${emptyCell(`I${bankRow}`, 1)}${emptyCell(`J${bankRow}`, 1)}${emptyCell(`K${bankRow}`, 1)}</row>`);

  const drawingAnchors = imageData.map((image, index) => {
    const rowZero = dataStartRow + index - 1;
    const insetEmu = 2 * 9525;
    const widthEmu = 209 * 9525;
    const heightEmu = 136 * 9525;
    return `<xdr:oneCellAnchor><xdr:from><xdr:col>1</xdr:col><xdr:colOff>${insetEmu}</xdr:colOff><xdr:row>${rowZero}</xdr:row><xdr:rowOff>${insetEmu}</xdr:rowOff></xdr:from><xdr:ext cx="${widthEmu}" cy="${heightEmu}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${index + 1}" name="Product ${index + 1}" descr="Model 319 product image"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${index + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
  }).join("");

  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0" showGridLines="1"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="23.64" customWidth="1"/><col min="2" max="2" width="25.88" customWidth="1"/><col min="3" max="3" width="12.54" customWidth="1"/><col min="4" max="4" width="11.2" customWidth="1"/><col min="5" max="5" width="11.1" customWidth="1"/><col min="6" max="6" width="11.1" customWidth="1"/><col min="7" max="7" width="15.75" customWidth="1"/><col min="8" max="8" width="11.1" customWidth="1"/><col min="9" max="9" width="10.8" customWidth="1"/><col min="10" max="10" width="9" customWidth="1"/><col min="11" max="11" width="7.86" customWidth="1"/></cols><sheetData>${rowXml.join("")}</sheetData><mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.3" footer="0.3"/><drawing r:id="rId1"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="¥ #,##0.00"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font><font><b/><u/><sz val="16"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9EEF2"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border><border><left style="thin"><color rgb="FFE6E6E6"/></left><right style="thin"><color rgb="FFE6E6E6"/></right><top style="thin"><color rgb="FFE6E6E6"/></top><bottom style="thin"><color rgb="FFE6E6E6"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyFill="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyNumberFormat="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  const drawing = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${drawingAnchors}</xdr:wsDr>`;
  const drawingRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${imageData.map((image, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${index + 1}.${image.extension}"/>`).join("")}</Relationships>`;
  const worksheetRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`;

  const entriesForZip = [
    { name: "[Content_Types].xml", content: contentTypes },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets><calcPr calcMode="auto"/></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", content: styles },
    { name: "xl/worksheets/sheet1.xml", content: worksheet },
    { name: "xl/worksheets/_rels/sheet1.xml.rels", content: worksheetRels },
    { name: "xl/drawings/drawing1.xml", content: drawing },
    { name: "xl/drawings/_rels/drawing1.xml.rels", content: drawingRels },
    ...imageData.map((image, index) => ({ name: `xl/media/image${index + 1}.${image.extension}`, content: image.bytes })),
  ];
  return createZip(entriesForZip);
}

const copy = {
  zh: {
    navGallery: "花色目录",
    navSteel: "不锈钢款",
    navSpecs: "型号价格",
    headerCta: "查看全部花色",
    heroEyebrow: "花色定制 · 型号319",
    heroTitleTop: "花色，",
    heroTitleBottom: "由你定义",
    heroLead: "83 款现有花色随心选择，也支持根据图片、配色或品牌需求定制专属图案。",
    browseAll: "探索花色",
    viewSpecs: "了解定制",
    heroNotePatterns: "真实产品花色自动滚动展示",
    heroNoteModel: "现有花色可选 · 支持来图定制",
    heroCarouselLabel: "真实产品花色滚动展示",
    previousPatterns: "查看前面的花色",
    nextPatterns: "查看更多花色",
    stripModel: "型号",
    stripPatterns: "花色",
    stripPatternCount: "83款",
    galleryEyebrow: "完整花色库",
    galleryTitle: "按系列查看花色",
    galleryText: "每张卡片都是今天提供的新图。单击图片直接放大查看，下面可选择容量和箱数。",
    directory: "系列目录",
    itemUnit: "款",
    patternUnit: "款花色",
    zoomHint: "单击放大",
    currentShowing: "当前显示",
    currentSuffix: "款花色。单击任意图片可查看大图，按 Esc 或点击背景关闭。",
    specsEyebrow: "型号319",
    specsTitle: "价格与规格",
    specOneTitle: "1.6L 容量",
    specOneText: "型号319，目录价 ¥29 RMB，24 pcs/箱，CBM 0.14。",
    specTwoTitle: "2.0L 容量",
    specTwoText: "型号319，目录价 ¥31 RMB，20 pcs/箱，CBM 0.15。",
    specThreeTitle: "花色分类",
    specThreeText: "花卉、几何、水果、文字、不锈钢与素色光板系列。",
    steelEyebrow: "316不锈钢系列",
    steelTitle: <>黑盖钢色款，<br />单独成系列展示。</>,
    steelText: "今天的不锈钢款已经整理成独立系列，客人可以直接从筛选里只看钢色壶身。",
    steelLink: "只看不锈钢花色",
    footerText: "Hobby Lobby Ask for More · 型号319产品花色目录",
    languageLabel: "语言",
    modelLabel: "型号",
    filterLabels: {
      "全部花色": "全部花色",
      "白色壶身": "白色壶身",
      "316不锈钢": "316不锈钢",
      "混色套装": "混色套装",
    },
    familyLabels: {
      "潮流字母系列": "潮流字母系列",
      "316不锈钢花卉系列": "316不锈钢花卉系列",
      "民族几何系列": "民族几何系列",
      "花卉植物系列": "花卉植物系列",
      "水果清新系列": "水果清新系列",
      "中东文字系列": "中东文字系列",
      "素色光板系列": "素色光板系列",
      "混色套装系列": "混色套装系列",
      "阿拉伯茶饮系列": "阿拉伯茶饮系列",
      "斋月祝福系列": "斋月祝福系列",
      "花鸟雅集系列": "花鸟雅集系列",
    },
    bodyLabels: {
      "白色壶身": "白色壶身",
      "316不锈钢": "316不锈钢",
      "混色可选": "混色可选",
    },
    benefits: [
      { icon: ShieldCheck, title: "316内胆", text: "型号319，316不锈钢内胆，适合日常保温使用。" },
      { icon: PaintBrush, title: "花色专属定制", text: "现有花色可直接选款，也支持根据图片、配色或品牌需求定制。" },
      { icon: MagnifyingGlassPlus, title: "单击放大", text: "单击任意图片即可看大图，滚轮可继续放大查看细节。" },
      { icon: Heart, title: "两种容量", text: "1.6L ¥29 RMB，2.0L ¥31 RMB，价格清楚直接。" },
    ],
  },
  en: {
    navGallery: "Pattern Catalogue",
    navSteel: "Stainless Steel",
    navSpecs: "Prices",
    headerCta: "View All Patterns",
    heroEyebrow: "Pattern Customization · Model 319",
    heroTitleTop: "Patterns,",
    heroTitleBottom: "Defined by You",
    heroLead: "Choose from 83 ready patterns, or create an exclusive design from your artwork, colors, and brand identity.",
    browseAll: "Explore Patterns",
    viewSpecs: "Customization",
    heroNotePatterns: "Real catalogue products in motion",
    heroNoteModel: "Ready patterns · Custom artwork supported",
    heroCarouselLabel: "Scrolling showcase of real catalogue products",
    previousPatterns: "View previous patterns",
    nextPatterns: "View more patterns",
    stripModel: "Model",
    stripPatterns: "Patterns",
    stripPatternCount: "83 styles",
    galleryEyebrow: "Complete Pattern Library",
    galleryTitle: "Browse by series",
    galleryText: "All cards use the latest product images. Click an image to enlarge it, then select capacity and carton quantity below.",
    directory: "Series",
    itemUnit: "styles",
    patternUnit: "styles",
    zoomHint: "Click to enlarge",
    currentShowing: "Showing",
    currentSuffix: "patterns. Click any image to view larger; press Esc or click the backdrop to close.",
    specsEyebrow: "Model 319",
    specsTitle: "Price & Specifications",
    specOneTitle: "1.6L Capacity",
    specOneText: "Model 319, catalogue price ¥29 RMB, 24 pcs/carton, CBM 0.14.",
    specTwoTitle: "2.0L Capacity",
    specTwoText: "Model 319, catalogue price ¥31 RMB, 20 pcs/carton, CBM 0.15.",
    specThreeTitle: "Pattern Categories",
    specThreeText: "Floral, geometric, fruit, lettering, stainless steel, and plain-body series.",
    steelEyebrow: "316 Stainless Steel Series",
    steelTitle: <>Black-lid stainless finish,<br />shown as its own series.</>,
    steelText: "The stainless-steel options are grouped separately, so buyers can filter directly to the steel body styles.",
    steelLink: "View stainless patterns only",
    footerText: "Hobby Lobby Ask for More · Model 319 Pattern Catalogue",
    languageLabel: "Language",
    modelLabel: "Model",
    filterLabels: {
      "全部花色": "All Patterns",
      "白色壶身": "White Body",
      "316不锈钢": "316 Stainless Steel",
      "混色套装": "Mixed Sets",
    },
    familyLabels: {
      "潮流字母系列": "Trendy Lettering Series",
      "316不锈钢花卉系列": "316 Stainless Floral Series",
      "民族几何系列": "Ethnic Geometric Series",
      "花卉植物系列": "Floral Botanical Series",
      "水果清新系列": "Fresh Fruit Series",
      "中东文字系列": "Middle Eastern Lettering Series",
      "素色光板系列": "Plain Body Series",
      "混色套装系列": "Mixed Set Series",
      "阿拉伯茶饮系列": "Arabic Tea & Coffee Series",
      "斋月祝福系列": "Ramadan Blessings Series",
      "花鸟雅集系列": "Bird & Bloom Series",
    },
    bodyLabels: {
      "白色壶身": "White body",
      "316不锈钢": "316 stainless steel",
      "混色可选": "Mixed colors available",
    },
    benefits: [
      { icon: ShieldCheck, title: "316 inner liner", text: "Model 319 uses a 316 stainless-steel inner liner for everyday thermal use." },
      { icon: PaintBrush, title: "Custom pattern service", text: "Choose existing patterns or customize artwork, colors, and branded designs." },
      { icon: MagnifyingGlassPlus, title: "Click to enlarge", text: "Click any image for a larger preview, then use the mouse wheel to zoom in." },
      { icon: Heart, title: "Two capacities", text: "1.6L ¥29 RMB and 2.0L ¥31 RMB, with clear catalogue pricing." },
    ],
  },
};

function Storefront() {
  const [language, setLanguage] = useState("zh");
  const [filter, setFilter] = useState("全部花色");
  const [selectedId, setSelectedId] = useState("pattern-01");
  const [selectedCapacities, setSelectedCapacities] = useState({});
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [exportStatus, setExportStatus] = useState("");
  const [quotePreview, setQuotePreview] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [catalogueReady, setCatalogueReady] = useState(false);
  const heroCarouselRef = useRef(null);
  const t = copy[language];
  const filteredPatterns = useMemo(() => (
    filter === "全部花色"
      ? catalogue
      : catalogue.filter((pattern) => pattern.body === filter || pattern.family === `${filter}系列`)
  ), [filter]);
  const selected = useMemo(() => (
    catalogue.find((pattern) => pattern.id === selectedId) || catalogue[0]
  ), [selectedId]);
  const expanded = useMemo(() => (
    catalogue.find((pattern) => pattern.id === expandedId) || null
  ), [expandedId]);
  const groupedPatterns = useMemo(() => Object.entries(filteredPatterns.reduce((groups, pattern) => {
    (groups[pattern.family] ||= []).push(pattern);
    return groups;
  }, {})), [filteredPatterns]);
  const selectedEntries = useMemo(() => (
    Object.entries(selectedCapacities).flatMap(([patternId, capacityIds]) => {
      const pattern = catalogue.find((item) => item.id === patternId);
      if (!pattern) return [];
      return capacityIds.map((capacityId) => ({
        pattern,
        capacity: capacities.find((item) => item.id === capacityId) || capacities[0],
        quantity: selectedQuantities[`${patternId}-${capacityId}`] || 1,
      }));
    })
  ), [selectedCapacities, selectedQuantities]);
  const totalCartons = selectedEntries.reduce((sum, item) => sum + item.quantity, 0);
  const displayFilter = (value) => t.filterLabels[value] || value;
  const displayFamily = (value) => language === "zh" ? value : (categoryByNameZh.get(value)?.nameEn || t.familyLabels[value] || value);
  const displayBody = (value) => t.bodyLabels[value] || value;
  const displayPatternName = (pattern) => {
    if (language === "zh") return pattern.name;
    if (pattern.nameEn) return pattern.nameEn;
    if (pattern.family === "混色套装系列") return `Mixed Set ${String(pattern.no - 58).padStart(2, "0")}`;
    if (pattern.no === 43) return "Black Lid Stainless Plain Body";
    if (pattern.no === 58) return "White Plain Body";
    return `${displayFamily(pattern.family).replace(" Series", "")} · 319-${String(pattern.no).padStart(2, "0")}`;
  };

  useEffect(() => {
    function closeWithEscape(event) {
      if (event.key === "Escape") {
        closeExpanded();
        setCartOpen(false);
        setQuotePreview((current) => {
          if (current?.pdfUrl) URL.revokeObjectURL(current.pdfUrl);
          return null;
        });
      }
    }
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, []);

  useEffect(() => {
    setZoom(1);
  }, [expandedId]);

  useEffect(() => {
    let idleId;
    let timeoutId;
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => setCatalogueReady(true), { timeout: 400 });
    } else {
      timeoutId = window.setTimeout(() => setCatalogueReady(true), 80);
    }
    return () => {
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  function chooseFilter(nextFilter) {
    setFilter(nextFilter);
    const nextPattern = nextFilter === "全部花色"
      ? catalogue[0]
      : catalogue.find((pattern) => pattern.body === nextFilter || pattern.family === `${nextFilter}系列`);
    setSelectedId(nextPattern?.id || catalogue[0].id);
  }

  function selectPattern(pattern) {
    setSelectedId(pattern.id);
  }

  function openExpanded(pattern) {
    setExpandedId(pattern.id);
  }

  function toggleCapacity(pattern, capacityId) {
    setSelectedId(pattern.id);
    setExportStatus("");
    setSelectedCapacities((current) => {
      const currentSizes = current[pattern.id] || [];
      const exists = currentSizes.includes(capacityId);
      const nextSizes = exists ? currentSizes.filter((id) => id !== capacityId) : [...currentSizes, capacityId];
      const next = { ...current };
      if (nextSizes.length) next[pattern.id] = nextSizes;
      else delete next[pattern.id];
      setSelectedQuantities((quantityCurrent) => {
        const key = `${pattern.id}-${capacityId}`;
        const quantityNext = { ...quantityCurrent };
        if (exists) delete quantityNext[key];
        else quantityNext[key] ||= 1;
        return quantityNext;
      });
      return next;
    });
  }

  function removeSelectedCapacity(patternId, capacityId) {
    setExportStatus("");
    setSelectedCapacities((current) => {
      const nextSizes = (current[patternId] || []).filter((id) => id !== capacityId);
      const next = { ...current };
      if (nextSizes.length) next[patternId] = nextSizes;
      else delete next[patternId];
      return next;
    });
    setSelectedQuantities((current) => {
      const next = { ...current };
      delete next[`${patternId}-${capacityId}`];
      return next;
    });
  }

  function isCapacitySelected(patternId, capacityId) {
    return Boolean(selectedCapacities[patternId]?.includes(capacityId));
  }

  function getSelectedQuantity(patternId, capacityId) {
    return selectedQuantities[`${patternId}-${capacityId}`] || 1;
  }

  function updateQuantity(patternId, capacityId, nextQuantity) {
    const cleanedQuantity = Math.min(999, Math.max(1, Number.parseInt(nextQuantity, 10) || 1));
    setExportStatus("");
    setSelectedQuantities((current) => ({
      ...current,
      [`${patternId}-${capacityId}`]: cleanedQuantity,
    }));
  }

  async function imageToDataUri(src) {
    const response = await fetch(src);
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  async function exportSelectedDocument() {
    if (!selectedEntries.length) return;
    setExportStatus("正在生成报价表...");
    try {
      const lastQuoteNumber = Number.parseInt(window.localStorage.getItem(quoteNumberKey), 10);
      const nextQuoteNumber = Number.isFinite(lastQuoteNumber) && lastQuoteNumber >= quoteNumberStart ? lastQuoteNumber + 1 : quoteNumberStart;
      const quoteNo = `${quoteNumberPrefix}${String(nextQuoteNumber).padStart(5, "0")}`;
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const dateDisplay = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
      const uniquePatterns = [...new Map(selectedEntries.map(({ pattern }) => [pattern.id, pattern])).values()];
      const imageByPattern = new Map(await Promise.all(uniquePatterns.map(async (pattern) => {
        const source = pattern.thumb;
        if (!quoteImageCache.has(source)) {
          quoteImageCache.set(source, imageToDataUri(source)
            .then((dataUri) => prepareQuoteImage(dataUri, 209 / 136, pattern.family === "混色套装系列"))
            .then((dataUri) => dataUriToImageData(dataUri))
            .catch((error) => {
              quoteImageCache.delete(source);
              throw error;
            }));
        }
        return [pattern.id, await quoteImageCache.get(source)];
      })));
      const imageData = selectedEntries.map(({ pattern }) => imageByPattern.get(pattern.id));
      const blob = makeQuoteXlsx({ entries: selectedEntries, quoteNo, dateDisplay, imageData });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Hobby-Lobby-319-报价表-${today}.xlsx`;
      link.rel = "noopener";
      document.body.appendChild(link);
      window.localStorage.setItem(quoteNumberKey, String(nextQuoteNumber));
      window.__lastHobbyLobbyExport = { fileName: link.download, itemCount: selectedEntries.length, quoteNo };
      link.click();
      link.remove();
      setExportStatus(`Excel 已生成：${link.download}`);
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error(error);
      setExportStatus("生成失败，请刷新后重试");
    }
  }

  async function exportWechatPdf() {
    if (!selectedEntries.length) return;
    setExportStatus("正在生成微信 PDF...");
    try {
      const lastQuoteNumber = Number.parseInt(window.localStorage.getItem(quoteNumberKey), 10);
      const nextQuoteNumber = Number.isFinite(lastQuoteNumber) && lastQuoteNumber >= quoteNumberStart ? lastQuoteNumber + 1 : quoteNumberStart;
      const quoteNo = `${quoteNumberPrefix}${String(nextQuoteNumber).padStart(5, "0")}`;
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const dateDisplay = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
      const pages = await buildQuotePageImages(selectedEntries, quoteNo, dateDisplay);
      const pdfBlob = makeImagePdf(pages);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const fileName = `Hobby-Lobby-319-报价单-${today}.pdf`;
      setQuotePreview((current) => {
        if (current?.pdfUrl) URL.revokeObjectURL(current.pdfUrl);
        return { pages, pdfUrl, fileName };
      });
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = fileName;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.localStorage.setItem(quoteNumberKey, String(nextQuoteNumber));
      window.__lastHobbyLobbyPdfExport = { pageCount: pages.length, itemCount: selectedEntries.length, quoteNo, size: pdfBlob.size };
      setExportStatus("PDF 已生成；苹果 Safari 和微信均可打开");
    } catch (error) {
      console.error(error);
      setExportStatus("PDF 生成失败，请刷新后重试");
    }
  }

  function closeQuotePreview() {
    setQuotePreview((current) => {
      if (current?.pdfUrl) URL.revokeObjectURL(current.pdfUrl);
      return null;
    });
  }

  function closeExpanded() {
    setExpandedId(null);
  }

  function zoomLightbox(event) {
    event.preventDefault();
    const step = event.deltaY < 0 ? 0.18 : -0.18;
    setZoom((currentZoom) => Math.min(3, Math.max(1, Number((currentZoom + step).toFixed(2)))));
  }

  return (
    <div className={`site-shell ${language === "zh" ? "static-reference-active" : ""}`} lang={language}>
      <section className="hero-reference-exact" aria-label="花色，由你定义">
        <img className="hero-reference-base" src="/assets/hero-reference-exact.png" alt="花色由你定义，型号319花色定制展示" width="1586" height="1024" fetchPriority="high" decoding="async" />
        {[0, 1].map((slotIndex) => (
          <div className={`hero-reference-slot hero-reference-slot-${slotIndex + 1}`} aria-hidden="true" key={`reference-slot-${slotIndex}`}>
            {heroShowcasePatterns.map((pattern, index) => (
              <figure
                className="hero-reference-slot-item"
                key={`reference-slot-${slotIndex}-${pattern.id}`}
                style={{ animationDelay: `${-((index * 3) + (slotIndex * 4.5))}s` }}
              >
                <img src={pattern.thumb} alt="" width="640" height="640" decoding="async" loading={index < 4 ? "eager" : "lazy"} />
              </figure>
            ))}
          </div>
        ))}
        <a className="hero-reference-hotspot hero-reference-gallery-nav" href="#gallery" aria-label="花色目录" />
        <a className="hero-reference-hotspot hero-reference-custom-nav" href="#customization" aria-label="定制服务" />
        <a className="hero-reference-hotspot hero-reference-gallery-cta" href="#gallery" aria-label="探索花色" />
        <a className="hero-reference-hotspot hero-reference-custom-cta" href="#customization" aria-label="了解定制" />
        <button className="hero-reference-hotspot hero-reference-english" type="button" onClick={() => setLanguage("en")} aria-label="English" />
      </section>
      <header className="topbar">
        <a className="brand-link" href="#top" aria-label="Hobby Lobby home"><img src="/assets/brand-logo.webp" alt="Hobby Lobby Ask for More" width="256" height="256" decoding="async" /></a>
        <nav aria-label={language === "zh" ? "主导航" : "Main navigation"}>
          <a href="#gallery">{t.navGallery}</a><a href="#details">{t.navSteel}</a><a href="#specifications">{t.navSpecs}</a>
        </nav>
        <div className="language-switcher" role="group" aria-label={t.languageLabel}>
          {languageOptions.map((option) => (
            <button type="button" key={option.id} className={language === option.id ? "active" : ""} onClick={() => setLanguage(option.id)} aria-pressed={language === option.id}>{option.label}</button>
          ))}
        </div>
        <a className="button button-primary header-cta" href="#gallery">{t.headerCta}</a>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">{t.heroEyebrow}</p>
            <h1 id="hero-title"><span>{t.heroTitleTop}</span><br /><span className="hero-title-accent">{t.heroTitleBottom}</span></h1>
            <p className="hero-lede">{t.heroLead}</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#gallery">{t.browseAll} <ArrowDown weight="bold" /></a>
              <a className="button button-secondary" href="#customization">{t.viewSpecs} <ArrowRight weight="bold" /></a>
            </div>
            <div className="hero-notes" aria-label={language === "zh" ? "产品摘要" : "Product summary"}>
              <span><PaintBrush weight="regular" /> {t.heroNotePatterns}</span>
              <span><ShieldCheck weight="regular" /> {t.heroNoteModel}</span>
            </div>
          </div>
          <div className="hero-media">
            <div className="hero-runway" id="hero-product-runway" ref={heroCarouselRef} aria-label={t.heroCarouselLabel}>
              <div className="hero-runway-track">
                {[...heroShowcasePatterns, ...heroShowcasePatterns].map((pattern, index) => (
                  <figure className="hero-runway-item" key={`${pattern.id}-${index}`} aria-hidden={index >= heroShowcasePatterns.length}>
                    <img src={pattern.thumb} alt={index < heroShowcasePatterns.length ? displayPatternName(pattern) : ""} width="640" height="640" decoding="async" loading={index < 4 ? "eager" : "lazy"} />
                  </figure>
                ))}
              </div>
            </div>
            <div className="hero-featured-product">
              <img src="/assets/hero-featured-product.png" alt={language === "zh" ? `${displayPatternName(heroFeaturedPattern)}真实产品` : `${displayPatternName(heroFeaturedPattern)} real product`} width="1254" height="1254" loading="eager" decoding="async" fetchPriority="high" />
            </div>
            <div className="hero-runway-controls">
              <button type="button" aria-label={t.previousPatterns} onClick={() => heroCarouselRef.current?.scrollBy({ left: -260, behavior: "smooth" })}><ArrowLeft weight="bold" /></button>
              <button type="button" aria-label={t.nextPatterns} onClick={() => heroCarouselRef.current?.scrollBy({ left: 260, behavior: "smooth" })}><ArrowRight weight="bold" /></button>
            </div>
          </div>
        </section>

        <div className="catalog-strip" aria-label={language === "zh" ? "目录摘要" : "Catalogue summary"}><span><small>{t.stripModel}</small><strong>319</strong></span><span><small>1.6L</small><strong>¥29 RMB</strong></span><span><small>2.0L</small><strong>¥31 RMB</strong></span><span><small>{t.stripPatterns}</small><strong>{t.stripPatternCount}</strong></span></div>

        <section className="gallery-section section" id="gallery" aria-labelledby="gallery-title">
          <div className="section-heading">
            <div><p className="eyebrow">{t.galleryEyebrow}</p><h2 id="gallery-title">{t.galleryTitle}</h2><p>{t.galleryText}</p></div>
            <div className="finish-tabs three-tabs" role="group" aria-label={language === "zh" ? "筛选壶身" : "Filter body finish"}>
              {filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => chooseFilter(item)} aria-pressed={filter === item}>{displayFilter(item)}</button>)}
            </div>
          </div>
          {catalogueReady ? <div className="catalogue-layout">
            <aside className="series-directory" aria-label={language === "zh" ? "花色系列目录" : "Pattern series directory"}>
              <span>{t.directory}</span>
              {groupedPatterns.map(([series, seriesPatterns], seriesIndex) => (
                <a href={`#series-${seriesIndex + 1}`} key={series}>
                  <strong>{displayFamily(series)}</strong>
                  <small>{seriesPatterns.length} {t.itemUnit}</small>
                </a>
              ))}
            </aside>
            <div className="series-list" aria-live="polite">
            {groupedPatterns.map(([series, seriesPatterns], seriesIndex) => <section className="pattern-series" id={`series-${seriesIndex + 1}`} key={series} aria-label={`${series}`}>
              <div className="series-heading"><span>{displayFamily(series)}</span><small>{seriesPatterns.length} {t.patternUnit}</small></div>
              <div className="pattern-grid">
                {seriesPatterns.map((pattern) => {
                  const active = Boolean(selectedCapacities[pattern.id]?.length);
                  const catalogueCode = `319-${String(pattern.no).padStart(2, "0")}`;
                  return (
                    <article className={`pattern-card ${active ? "selected" : ""}`} id={pattern.id} key={pattern.id}>
                      <button className="pattern-image-wrap" type="button" onClick={() => openExpanded(pattern)} aria-label={`${displayPatternName(pattern)}，${displayFamily(pattern.family)}，${t.zoomHint}。`}><img src={pattern.thumb} srcSet={`${pattern.thumb} 720w, ${pattern.displayImage} 1600w`} sizes="(max-width: 700px) 46vw, (max-width: 1100px) 30vw, 240px" alt={language === "zh" ? pattern.imageAltZh : (pattern.imageAltEn || displayPatternName(pattern))} width="640" height="640" loading={seriesIndex === 0 ? "eager" : "lazy"} decoding="async" fetchPriority={seriesIndex === 0 ? "high" : undefined} />{active && <span className="check-mark"><Check weight="bold" /></span>}<span className="zoom-hint"><MagnifyingGlassPlus weight="bold" /> {t.zoomHint}</span></button>
                      <span className="pattern-code">MODEL 319 · {catalogueCode}</span><span className="pattern-name">{displayPatternName(pattern)}</span><span className="pattern-family">{displayBody(pattern.body)} · 1.6L ¥29 · 2.0L ¥31</span>
                      <div className="capacity-picker" aria-label={`${pattern.name} 容量选择`}>
                        {capacities.map((capacity) => (
                          <button className={isCapacitySelected(pattern.id, capacity.id) ? "active" : ""} type="button" key={capacity.id} onClick={() => toggleCapacity(pattern, capacity.id)} aria-pressed={isCapacitySelected(pattern.id, capacity.id)}>
                            <strong>{capacity.id}</strong><span>{capacity.price}</span>{isCapacitySelected(pattern.id, capacity.id) && <em>{getSelectedQuantity(pattern.id, capacity.id)} 箱</em>}
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>)}
            </div>
          </div> : <div className="gallery-loading" role="status">{language === "zh" ? "正在准备花色目录…" : "Preparing pattern catalogue…"}</div>}
          <p className="gallery-note">{t.currentShowing} {filteredPatterns.length} {t.currentSuffix}</p>
        </section>

        <section className="process-section section" id="specifications" aria-labelledby="process-title">
          <div className="process-title-wrap"><p className="eyebrow">{t.specsEyebrow}</p><h2 id="process-title">{t.specsTitle}</h2></div>
          <ol><li><span>01</span><h3>{t.specOneTitle}</h3><p>{t.specOneText}</p></li><li><span>02</span><h3>{t.specTwoTitle}</h3><p>{t.specTwoText}</p></li><li><span>03</span><h3>{t.specThreeTitle}</h3><p>{t.specThreeText}</p></li></ol>
        </section>

        <section className="steel-band" id="details">
          <img src="/assets/steel-pattern-09.webp" alt={language === "zh" ? "316不锈钢黑盖粉牡丹花色保温壶" : "316 stainless steel black-lid floral thermal pot"} width="1000" height="1000" loading="lazy" decoding="async" />
          <div><p className="eyebrow">{t.steelEyebrow}</p><h2>{t.steelTitle}</h2><p>{t.steelText}</p><a href="#gallery" onClick={() => chooseFilter("316不锈钢")}>{t.steelLink} <ArrowRight weight="bold" /></a></div>
        </section>

        <section className="benefit-row section" id="customization" aria-label={language === "zh" ? "产品卖点" : "Product benefits"}>{t.benefits.map(({ icon: Icon, title, text }) => <article key={title}><Icon weight="regular" /><h3>{title}</h3><p>{text}</p></article>)}</section>
      </main>

      <aside className={`selection-cart ${cartOpen ? "is-open" : "is-collapsed"}`} aria-label="已选花色">
        {!cartOpen ? (
          <button className="cart-fab" type="button" onClick={() => setCartOpen(true)} aria-expanded="false" aria-label={`展开购物车，当前共 ${totalCartons} 箱`}>
            <ShoppingCart weight="bold" />
            <span>购物车</span>
            <strong aria-live="polite">{totalCartons}</strong>
          </button>
        ) : <>
          <div className="selection-cart-head">
            <span><ShoppingCart weight="bold" /> 已选花色</span>
            <div className="cart-head-actions">
              <strong aria-live="polite">{totalCartons}</strong>
              <button className="cart-collapse" type="button" onClick={() => setCartOpen(false)} aria-expanded="true" aria-label="收起购物车"><X weight="bold" /></button>
            </div>
          </div>
          {selectedEntries.length === 0 ? (
            <p className="cart-empty">点击花色卡片里的容量按钮，这里会自动汇总客户选择的花色和容量。</p>
          ) : (
            <>
              <div className="cart-list">
                {selectedEntries.map(({ pattern, capacity, quantity }) => (
                  <div className="cart-item" key={`${pattern.id}-${capacity.id}`}>
                    <img src={pattern.thumb} alt="" width="640" height="640" loading="lazy" decoding="async" />
                    <div>
                      <strong>{pattern.name}</strong>
                      <small>319-{String(pattern.no).padStart(2, "0")} · {capacity.id} · {capacity.price} · {capacity.packing}</small>
                      <div className="qty-control">
                        <span>箱数</span>
                        <button type="button" onClick={(event) => { event.stopPropagation(); updateQuantity(pattern.id, capacity.id, quantity - 1); }} aria-label={`${pattern.name} ${capacity.id} 减少一箱`}>−</button>
                        <input value={quantity} inputMode="numeric" min="1" max="999" onChange={(event) => updateQuantity(pattern.id, capacity.id, event.target.value)} aria-label={`${pattern.name} ${capacity.id} 箱数`} />
                        <button type="button" onClick={(event) => { event.stopPropagation(); updateQuantity(pattern.id, capacity.id, quantity + 1); }} aria-label={`${pattern.name} ${capacity.id} 增加一箱`}>+</button>
                      </div>
                    </div>
                    <button className="cart-remove" type="button" onClick={() => removeSelectedCapacity(pattern.id, capacity.id)} aria-label={`移出 ${pattern.name} ${capacity.id}`}><Trash weight="bold" /></button>
                  </div>
                ))}
              </div>
              <div className="cart-actions">
                <button className="cart-export" type="button" onClick={exportWechatPdf}><DownloadSimple weight="bold" /> PDF 报价表</button>
                <button className="cart-export cart-export-secondary" type="button" onClick={exportSelectedDocument}><DownloadSimple weight="bold" /> Excel 报价表</button>
                <button className="cart-clear" type="button" onClick={() => { setSelectedCapacities({}); setSelectedQuantities({}); setExportStatus(""); }}>清空选款</button>
              </div>
              {exportStatus && <p className="export-status">{exportStatus}</p>}
            </>
          )}
        </>}
      </aside>

      <footer><img src="/assets/brand-logo.webp" alt="" width="256" height="256" loading="lazy" decoding="async" /><p>{t.footerText}</p><a href="#top">{language === "zh" ? "回到顶部" : "Back to top"} <ArrowRight weight="bold" /></a></footer>

      {expanded && <div className="lightbox-backdrop" role="presentation" onClick={closeExpanded}>
        <div className="lightbox-panel" role="dialog" aria-modal="true" aria-label={`${displayPatternName(expanded)} 大图`} onClick={(event) => event.stopPropagation()} onWheel={zoomLightbox}>
          <button className="lightbox-close" type="button" onClick={closeExpanded} aria-label="关闭大图"><X weight="bold" /></button>
          <span className="zoom-meter">{Math.round(zoom * 100)}% · {language === "zh" ? "滚轮缩放" : "Wheel to zoom"}</span>
          <div className="lightbox-image"><img src={expanded.displayImage} srcSet={`${expanded.thumb} 720w, ${expanded.displayImage} 1600w`} sizes="(max-width: 700px) 96vw, 80vw" alt={`${displayPatternName(expanded)} 大图`} decoding="async" fetchPriority="high" style={{ transform: `scale(${zoom})` }} /></div>
          <div className="lightbox-info">
            <div className="lightbox-pack">
              <span>PRICE / PACKING</span>
              {capacities.map((capacity) => (
                <button className={`pack-option ${isCapacitySelected(expanded.id, capacity.id) ? "active" : ""}`} type="button" key={capacity.id} onClick={() => toggleCapacity(expanded, capacity.id)} aria-pressed={isCapacitySelected(expanded.id, capacity.id)}>
                  <strong>{capacity.id}</strong><small>{capacity.price} · {capacity.packing}{isCapacitySelected(expanded.id, capacity.id) ? ` · ${getSelectedQuantity(expanded.id, capacity.id)} 箱` : ""}</small>
                </button>
              ))}
            </div>
            <div className="lightbox-meta">
              <span>MODEL 319 · {String(expanded.no).padStart(2, "0")}</span>
              <strong>{displayPatternName(expanded)}</strong>
              <small>{displayFamily(expanded.family)} · {displayBody(expanded.body)} · 1.6L ¥29 RMB · 2.0L ¥31 RMB</small>
            </div>
          </div>
        </div>
      </div>}

      {quotePreview && <div className="quote-preview-backdrop" role="presentation" onClick={closeQuotePreview}>
        <div className="quote-preview-panel" role="dialog" aria-modal="true" aria-label="PDF 报价单预览" onClick={(event) => event.stopPropagation()}>
          <div className="quote-preview-head">
            <div><strong>PDF 报价单</strong><small>适用于苹果 Safari、微信和电脑，照片已嵌入文件</small></div>
            <button className="quote-preview-close" type="button" onClick={closeQuotePreview} aria-label="关闭 PDF 预览"><X weight="bold" /></button>
          </div>
          <a className="quote-preview-tip" href={quotePreview.pdfUrl} download={quotePreview.fileName} target="_blank" rel="noopener">没有自动下载？点这里再次打开 / 下载 PDF</a>
          <div className="quote-preview-pages">
            {quotePreview.pages.map((page, index) => <img key={index} src={page.dataUri} alt={`报价单第 ${index + 1} 页`} width={page.width} height={page.height} />)}
          </div>
        </div>
      </div>}
    </div>
  );
}


export function App() {
  return window.location.pathname.startsWith("/admin")
    ? <Suspense fallback={<main style={{ padding: 24 }}>正在加载管理后台…</main>}><AdminApp /></Suspense>
    : <Storefront />;
}
