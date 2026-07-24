import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown, ArrowRight, Check, Heart,
  DownloadSimple, MagnifyingGlassPlus, PaintBrush, ShieldCheck, ShoppingCart, Trash, X,
} from "@phosphor-icons/react";

const catalogue = [
  { no: 1, name: "彩色字母", family: "潮流字母系列", body: "白色壶身" },
  { no: 2, name: "蓝花不锈钢", family: "316不锈钢花卉系列", body: "316不锈钢" },
  { no: 3, name: "蓝棕几何", family: "民族几何系列", body: "白色壶身" },
  { no: 4, name: "秋叶果实", family: "花卉植物系列", body: "白色壶身" },
  { no: 5, name: "黄柠檬", family: "水果清新系列", body: "白色壶身" },
  { no: 6, name: "蓝花钢壶款", family: "316不锈钢花卉系列", body: "316不锈钢" },
  { no: 7, name: "墨枝淡花", family: "花卉植物系列", body: "白色壶身" },
  { no: 8, name: "黑白圆花", family: "316不锈钢花卉系列", body: "316不锈钢" },
  { no: 9, name: "粉牡丹钢壶", family: "316不锈钢花卉系列", body: "316不锈钢" },
  { no: 10, name: "沙漠椰影", family: "中东文字系列", body: "白色壶身" },
  { no: 11, name: "红玫瑰", family: "花卉植物系列", body: "白色壶身" },
  { no: 13, name: "棕叶白花钢壶", family: "316不锈钢花卉系列", body: "316不锈钢" },
  { no: 14, name: "几何文字", family: "中东文字系列", body: "白色壶身" },
  { no: 15, name: "小黄花", family: "花卉植物系列", body: "白色壶身" },
  { no: 16, name: "挂饰茶壶", family: "中东文字系列", body: "白色壶身" },
  { no: 17, name: "樱桃字母", family: "潮流字母系列", body: "白色壶身" },
  { no: 18, name: "粉色竖花", family: "花卉植物系列", body: "白色壶身" },
  { no: 19, name: "复古地毯纹", family: "民族几何系列", body: "316不锈钢" },
  { no: 20, name: "米色挂饰", family: "中东文字系列", body: "白色壶身" },
  { no: 21, name: "红色地毯纹", family: "民族几何系列", body: "316不锈钢" },
  { no: 22, name: "白牡丹钢壶", family: "316不锈钢花卉系列", body: "316不锈钢" },
  { no: 23, name: "满版小花", family: "花卉植物系列", body: "白色壶身" },
  { no: 24, name: "黑枝淡花", family: "花卉植物系列", body: "白色壶身" },
  { no: 25, name: "蓝粉竖花", family: "花卉植物系列", body: "白色壶身" },
  { no: 26, name: "山线茶壶", family: "中东文字系列", body: "白色壶身" },
  { no: 27, name: "粉玫花束", family: "花卉植物系列", body: "白色壶身" },
  { no: 28, name: "棕叶花钢壶", family: "316不锈钢花卉系列", body: "316不锈钢" },
  { no: 29, name: "柠檬满版", family: "水果清新系列", body: "白色壶身" },
  { no: 30, name: "橘圆钢壶", family: "316不锈钢花卉系列", body: "316不锈钢" },
  { no: 31, name: "粉蓝竖花", family: "花卉植物系列", body: "白色壶身" },
  { no: 32, name: "棕色几何", family: "民族几何系列", body: "白色壶身" },
  { no: 33, name: "柠檬蓝条", family: "水果清新系列", body: "白色壶身" },
  { no: 34, name: "骆驼咖啡", family: "中东文字系列", body: "白色壶身" },
  { no: 35, name: "彩穗文字", family: "中东文字系列", body: "316不锈钢" },
  { no: 36, name: "粉碎花", family: "花卉植物系列", body: "白色壶身" },
  { no: 37, name: "蓝条柠檬", family: "水果清新系列", body: "白色壶身" },
  { no: 38, name: "深蓝几何", family: "民族几何系列", body: "316不锈钢" },
  { no: 39, name: "复古棕植", family: "花卉植物系列", body: "白色壶身" },
  { no: 40, name: "欧式圆章", family: "民族几何系列", body: "316不锈钢" },
  { no: 41, name: "夕阳咖啡", family: "中东文字系列", body: "白色壶身" },
  { no: 42, name: "迷你小花", family: "花卉植物系列", body: "白色壶身" },
  { no: 43, name: "黑盖钢色光板", family: "素色光板系列", body: "316不锈钢" },
  { no: 44, name: "蓝色花枝", family: "花卉植物系列", body: "白色壶身" },
  { no: 45, name: "茶壶挂饰", family: "中东文字系列", body: "316不锈钢" },
  { no: 46, name: "紫色字母", family: "潮流字母系列", body: "白色壶身" },
  { no: 47, name: "红蓝字母", family: "潮流字母系列", body: "白色壶身" },
  { no: 48, name: "淡粉竖花", family: "花卉植物系列", body: "白色壶身" },
  { no: 49, name: "蓝色碎花", family: "花卉植物系列", body: "白色壶身" },
  { no: 50, name: "金棕棕榈", family: "316不锈钢花卉系列", body: "316不锈钢" },
  { no: 51, name: "浅粉小花", family: "花卉植物系列", body: "白色壶身" },
  { no: 52, name: "咖啡圆日", family: "中东文字系列", body: "白色壶身" },
  { no: 53, name: "红花满版", family: "花卉植物系列", body: "白色壶身" },
  { no: 54, name: "彩色小花", family: "花卉植物系列", body: "白色壶身" },
  { no: 55, name: "缤纷花束", family: "花卉植物系列", body: "白色壶身" },
  { no: 56, name: "蓝白瓷砖", family: "民族几何系列", body: "白色壶身" },
  { no: 57, name: "蓝绿花束", family: "花卉植物系列", body: "白色壶身" },
  { no: 58, name: "白色光板", family: "素色光板系列", body: "白色壶身" },
  { no: 59, name: "混色套装 01", family: "混色套装系列", body: "混色可选" },
  { no: 60, name: "混色套装 02", family: "混色套装系列", body: "混色可选" },
  { no: 61, name: "混色套装 03", family: "混色套装系列", body: "混色可选" },
  { no: 62, name: "混色套装 04", family: "混色套装系列", body: "混色可选" },
  { no: 63, name: "混色套装 05", family: "混色套装系列", body: "混色可选" },
  { no: 64, name: "混色套装 06", family: "混色套装系列", body: "混色可选" },
  { no: 65, name: "混色套装 07", family: "混色套装系列", body: "混色可选" },
  { no: 66, name: "混色套装 08", family: "混色套装系列", body: "混色可选" },
  { no: 67, name: "混色套装 09", family: "混色套装系列", body: "混色可选" },
  { no: 68, name: "混色套装 10", family: "混色套装系列", body: "混色可选" },
  { no: 69, name: "混色套装 11", family: "混色套装系列", body: "混色可选" },
  { no: 70, name: "混色套装 12", family: "混色套装系列", body: "混色可选" },
  { no: 71, name: "混色套装 13", family: "混色套装系列", body: "混色可选" },
  { no: 72, name: "蓝叶咖啡花", nameEn: "Blue Leaf Coffee Floral", family: "阿拉伯茶饮系列", body: "白色壶身", image: "/assets/new-pattern-72.jpg" },
  { no: 73, name: "黑叶奶茶花", nameEn: "Black Leaf Milk Tea Floral", family: "阿拉伯茶饮系列", body: "白色壶身", image: "/assets/new-pattern-73.jpg" },
  { no: 74, name: "红叶茶花", nameEn: "Red Leaf Tea Floral", family: "阿拉伯茶饮系列", body: "白色壶身", image: "/assets/new-pattern-74.jpg" },
  { no: 75, name: "阿拉伯茶饮混色套装", nameEn: "Arabic Beverage Mixed Set", family: "混色套装系列", body: "混色可选", image: "/assets/new-pattern-75.jpg" },
  { no: 76, name: "金月华灯", nameEn: "Golden Crescent Lanterns", family: "斋月祝福系列", body: "白色壶身", image: "/assets/new-pattern-76.png" },
  { no: 77, name: "花月清真寺", nameEn: "Floral Moon Mosque", family: "斋月祝福系列", body: "白色壶身", image: "/assets/new-pattern-77.png" },
  { no: 78, name: "蜂鸟花野", nameEn: "Hummingbird Meadow", family: "花鸟雅集系列", body: "白色壶身", image: "/assets/new-pattern-78.png" },
  { no: 79, name: "星月彩灯", nameEn: "Starlit Ramadan Lantern", family: "斋月祝福系列", body: "白色壶身", image: "/assets/new-pattern-79.png" },
  { no: 80, name: "秋果栖鸟", nameEn: "Autumn Fruit Songbird", family: "花鸟雅集系列", body: "白色壶身", image: "/assets/new-pattern-80.png" },
  { no: 81, name: "花鸟雅集混色套装", nameEn: "Bird & Bloom Mixed Set", family: "混色套装系列", body: "混色可选", image: "/assets/new-pattern-81.png" },
  { no: 82, name: "斋月祝福混色套装", nameEn: "Ramadan Blessings Mixed Set", family: "混色套装系列", body: "混色可选", image: "/assets/new-pattern-82.png" },
  { no: 83, name: "玫瑰蜂鸟", nameEn: "Rose Garden Hummingbirds", family: "花鸟雅集系列", body: "白色壶身", image: "/assets/new-pattern-83.png" },
  { no: 84, name: "复古蔷薇双鸟", nameEn: "Vintage Rose Aviary", family: "花鸟雅集系列", body: "白色壶身", image: "/assets/new-pattern-84.png" },
].map((item) => ({
  ...item,
  id: `pattern-${String(item.no).padStart(2, "0")}`,
  image: item.image || `/assets/today-pattern-${String(item.no).padStart(2, "0")}.jpg`,
  thumb: item.thumb || (item.image
    ? item.image.replace("new-pattern-", "new-thumb-").replace(/\.(png|jpg)$/i, ".jpg")
    : `/assets/today-thumb-${String(item.no).padStart(2, "0")}.jpg`),
}));

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

async function cropImageForExcel(dataUri, targetAspect = 1.33, isMixedSet = false) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUri;
  });
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = 720;
  outputCanvas.height = Math.round(outputCanvas.width / targetAspect);
  const outputContext = outputCanvas.getContext("2d");
  outputContext.fillStyle = "#ffffff";
  outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  sourceContext.drawImage(image, 0, 0);
  const pixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

  if (isMixedSet) {
    // Scene/set images often contain a flat beige presentation band above and
    // below the actual photograph. Find the first and last rows with real
    // visual detail, then stretch that complete-width scene into the cell.
    // Keeping the full width preserves the top-left logo.
    const detailedRows = [];
    for (let y = 0; y < pixels.height; y += 2) {
      let minRed = 255;
      let minGreen = 255;
      let minBlue = 255;
      let maxRed = 0;
      let maxGreen = 0;
      let maxBlue = 0;
      for (let x = 0; x < pixels.width; x += 3) {
        const offset = (y * pixels.width + x) * 4;
        const alpha = pixels.data[offset + 3];
        if (alpha < 20) continue;
        const red = pixels.data[offset];
        const green = pixels.data[offset + 1];
        const blue = pixels.data[offset + 2];
        minRed = Math.min(minRed, red);
        minGreen = Math.min(minGreen, green);
        minBlue = Math.min(minBlue, blue);
        maxRed = Math.max(maxRed, red);
        maxGreen = Math.max(maxGreen, green);
        maxBlue = Math.max(maxBlue, blue);
      }
      if (maxRed - minRed > 34 || maxGreen - minGreen > 34 || maxBlue - minBlue > 34) detailedRows.push(y);
    }
    const sourceTop = detailedRows.length ? Math.max(0, detailedRows[0] - 2) : 0;
    const sourceBottom = detailedRows.length ? Math.min(image.naturalHeight, detailedRows[detailedRows.length - 1] + 4) : image.naturalHeight;
    outputContext.drawImage(
      image,
      0,
      sourceTop,
      image.naturalWidth,
      Math.max(1, sourceBottom - sourceTop),
      0,
      0,
      outputCanvas.width,
      outputCanvas.height,
    );
  } else {
    // Count foreground pixels per row/column instead of trusting the first
    // non-white pixel. This ignores isolated JPEG noise around the white
    // background and centers the visible product body itself.
    const columnCounts = new Uint32Array(pixels.width);
    const rowCounts = new Uint32Array(pixels.height);
    for (let y = 0; y < pixels.height; y += 2) {
      for (let x = 0; x < pixels.width; x += 2) {
        const offset = (y * pixels.width + x) * 4;
        const red = pixels.data[offset];
        const green = pixels.data[offset + 1];
        const blue = pixels.data[offset + 2];
        const alpha = pixels.data[offset + 3];
        if (alpha > 20 && (red < 245 || green < 245 || blue < 245 || Math.max(red, green, blue) - Math.min(red, green, blue) > 10)) {
          columnCounts[x] += 1;
          rowCounts[y] += 1;
        }
      }
    }

    const minColumnCount = Math.max(2, Math.round(pixels.height * 0.006));
    const minRowCount = Math.max(2, Math.round(pixels.width * 0.006));
    let minX = columnCounts.findIndex((count) => count >= minColumnCount);
    let minY = rowCounts.findIndex((count) => count >= minRowCount);
    let maxX = -1;
    let maxY = -1;
    for (let x = columnCounts.length - 1; x >= 0; x -= 1) {
      if (columnCounts[x] >= minColumnCount) {
        maxX = x;
        break;
      }
    }
    for (let y = rowCounts.length - 1; y >= 0; y -= 1) {
      if (rowCounts[y] >= minRowCount) {
        maxY = y;
        break;
      }
    }
    if (minX >= maxX || minY >= maxY) {
      minX = 0;
      minY = 0;
      maxX = image.naturalWidth;
      maxY = image.naturalHeight;
    }
    const paddingX = (maxX - minX) * 0.06;
    const paddingY = (maxY - minY) * 0.06;
    minX = Math.max(0, minX - paddingX);
    minY = Math.max(0, minY - paddingY);
    maxX = Math.min(image.naturalWidth, maxX + paddingX);
    maxY = Math.min(image.naturalHeight, maxY + paddingY);
    const cropWidth = maxX - minX;
    const cropHeight = maxY - minY;
    const scale = Math.min(outputCanvas.width / cropWidth, outputCanvas.height / cropHeight);
    const drawWidth = cropWidth * scale;
    const drawHeight = cropHeight * scale;
    const drawX = (outputCanvas.width - drawWidth) / 2;
    const drawY = (outputCanvas.height - drawHeight) / 2;
    outputContext.drawImage(image, minX, minY, cropWidth, cropHeight, drawX, drawY, drawWidth, drawHeight);
  }
  return outputCanvas.toDataURL("image/jpeg", 0.9);
}

function imageCropAttributes(image, targetAspect = 1.33) {
  if (!image?.width || !image?.height) return "";
  const imageAspect = image.width / image.height;
  if (Math.abs(imageAspect - targetAspect) < 0.02) return "";
  if (imageAspect > targetAspect) {
    const crop = Math.round(((1 - targetAspect / imageAspect) / 2) * 100000);
    return ` l="${crop}" r="${crop}"`;
  }
  const crop = Math.round(((1 - imageAspect / targetAspect) / 2) * 100000);
  return ` t="${crop}" b="${crop}"`;
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
  const imageInset = 19050;
  const imageCellWidth = 1676400;
  const imageCellHeight = 1295400;
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
    const cropAttributes = imageCropAttributes(image);
    return `<xdr:oneCellAnchor><xdr:from><xdr:col>1</xdr:col><xdr:colOff>${imageInset}</xdr:colOff><xdr:row>${rowZero}</xdr:row><xdr:rowOff>${imageInset}</xdr:rowOff></xdr:from><xdr:ext cx="${imageCellWidth}" cy="${imageCellHeight}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${index + 2}" name="Product ${index + 1}" descr="Model 319 product image"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${index + 1}" cstate="print"/><a:srcRect${cropAttributes}/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${imageCellWidth}" cy="${imageCellHeight}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:noFill/></a:ln></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
  }).join("");

  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0" showGridLines="1"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="23.64" customWidth="1"/><col min="2" max="2" width="25.88" customWidth="1"/><col min="3" max="3" width="12.54" customWidth="1"/><col min="4" max="4" width="11.2" customWidth="1"/><col min="5" max="5" width="11.1" customWidth="1"/><col min="6" max="6" width="11.1" customWidth="1"/><col min="7" max="7" width="15.75" customWidth="1"/><col min="8" max="8" width="11.1" customWidth="1"/><col min="9" max="9" width="10.8" customWidth="1"/><col min="10" max="10" width="9" customWidth="1"/><col min="11" max="11" width="7.86" customWidth="1"/></cols><sheetData>${rowXml.join("")}</sheetData><mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells><drawing r:id="rId1"/><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.3" footer="0.3"/></worksheet>`;
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
    heroEyebrow: "2026 · 产品目录 · 型号319",
    heroTitleTop: "319花色",
    heroTitleBottom: "产品目录",
    heroLead: "用于给客人快速查看全部花色：按系列分类，单击图片可放大查看，1.6L / 2.0L 价格直接标清。",
    browseAll: "浏览全部花色",
    viewSpecs: "查看型号价格",
    heroNotePatterns: "83 个当前花色，已按系列分类",
    heroNoteModel: "型号319 · 1.6L ¥29 RMB / 2.0L ¥31 RMB",
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
      { icon: PaintBrush, title: "全花色目录", text: "按系列查看 83 个当前花色，方便给客人快速选款。" },
      { icon: MagnifyingGlassPlus, title: "单击放大", text: "单击任意图片即可看大图，滚轮可继续放大查看细节。" },
      { icon: Heart, title: "两种容量", text: "1.6L ¥29 RMB，2.0L ¥31 RMB，价格清楚直接。" },
    ],
  },
  en: {
    navGallery: "Pattern Catalogue",
    navSteel: "Stainless Steel",
    navSpecs: "Prices",
    headerCta: "View All Patterns",
    heroEyebrow: "2026 · Product Catalogue · Model 319",
    heroTitleTop: "Model 319",
    heroTitleBottom: "Pattern Catalogue",
    heroLead: "A premium catalogue for buyers to browse every available pattern by series. Click any image to enlarge, then select 1.6L or 2.0L directly.",
    browseAll: "Browse Patterns",
    viewSpecs: "View Prices",
    heroNotePatterns: "83 current patterns grouped by series",
    heroNoteModel: "Model 319 · 1.6L ¥29 RMB / 2.0L ¥31 RMB",
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
      { icon: PaintBrush, title: "Full pattern catalogue", text: "83 current patterns are grouped by series for faster buyer selection." },
      { icon: MagnifyingGlassPlus, title: "Click to enlarge", text: "Click any image for a larger preview, then use the mouse wheel to zoom in." },
      { icon: Heart, title: "Two capacities", text: "1.6L ¥29 RMB and 2.0L ¥31 RMB, with clear catalogue pricing." },
    ],
  },
};

export function App() {
  const [language, setLanguage] = useState("zh");
  const [filter, setFilter] = useState("全部花色");
  const [selectedId, setSelectedId] = useState("pattern-01");
  const [selectedCapacities, setSelectedCapacities] = useState({});
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [exportStatus, setExportStatus] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [zoom, setZoom] = useState(1);
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
  const displayFamily = (value) => t.familyLabels[value] || value;
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
      if (event.key === "Escape") closeExpanded();
    }
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, []);

  useEffect(() => {
    setZoom(1);
  }, [expandedId]);

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
    const lastQuoteNumber = Number.parseInt(window.localStorage.getItem(quoteNumberKey), 10);
    const nextQuoteNumber = Number.isFinite(lastQuoteNumber) && lastQuoteNumber >= quoteNumberStart ? lastQuoteNumber + 1 : quoteNumberStart;
    const quoteNo = `${quoteNumberPrefix}${String(nextQuoteNumber).padStart(5, "0")}`;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const dateDisplay = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
    const imageData = await Promise.all(selectedEntries.map(async ({ pattern }) => dataUriToImageData(await cropImageForExcel(
      await imageToDataUri(pattern.thumb),
      1.33,
      pattern.family === "混色套装系列",
    ))));
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
    setExportStatus(`已生成：${link.download}`);
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
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
    <div className="site-shell" lang={language}>
      <header className="topbar">
        <a className="brand-link" href="#top" aria-label="Hobby Lobby home"><img src="/assets/brand-logo.png" alt="Hobby Lobby Ask for More" /></a>
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
            <h1 id="hero-title">{t.heroTitleTop}<br />{t.heroTitleBottom}</h1>
            <p className="hero-lede">{t.heroLead}</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#gallery">{t.browseAll} <ArrowDown weight="bold" /></a>
              <a className="button button-secondary" href="#specifications">{t.viewSpecs} <ArrowRight weight="bold" /></a>
            </div>
            <div className="hero-notes" aria-label={language === "zh" ? "产品摘要" : "Product summary"}>
              <span><PaintBrush weight="regular" /> {t.heroNotePatterns}</span>
              <span><ShieldCheck weight="regular" /> {t.heroNoteModel}</span>
            </div>
          </div>
          <div className="hero-media"><img src="/assets/today-pattern-02.jpg" alt={language === "zh" ? "316不锈钢保温壶花色展示" : "316 stainless steel thermal pot pattern display"} /></div>
        </section>

        <div className="catalog-strip" aria-label={language === "zh" ? "目录摘要" : "Catalogue summary"}><span><small>{t.stripModel}</small><strong>319</strong></span><span><small>1.6L</small><strong>¥29 RMB</strong></span><span><small>2.0L</small><strong>¥31 RMB</strong></span><span><small>{t.stripPatterns}</small><strong>{t.stripPatternCount}</strong></span></div>

        <section className="gallery-section section" id="gallery" aria-labelledby="gallery-title">
          <div className="section-heading">
            <div><p className="eyebrow">{t.galleryEyebrow}</p><h2 id="gallery-title">{t.galleryTitle}</h2><p>{t.galleryText}</p></div>
            <div className="finish-tabs three-tabs" role="group" aria-label={language === "zh" ? "筛选壶身" : "Filter body finish"}>
              {filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => chooseFilter(item)} aria-pressed={filter === item}>{displayFilter(item)}</button>)}
            </div>
          </div>
          <div className="catalogue-layout">
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
                    <article className={`pattern-card ${active ? "selected" : ""}`} key={pattern.id}>
                      <button className="pattern-image-wrap" type="button" onClick={() => openExpanded(pattern)} aria-label={`${displayPatternName(pattern)}，${displayFamily(pattern.family)}，${t.zoomHint}。`}><img src={pattern.thumb} alt="" loading="lazy" decoding="async" />{active && <span className="check-mark"><Check weight="bold" /></span>}<span className="zoom-hint"><MagnifyingGlassPlus weight="bold" /> {t.zoomHint}</span></button>
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
          </div>
          <p className="gallery-note">{t.currentShowing} {filteredPatterns.length} {t.currentSuffix}</p>
        </section>

        <section className="process-section section" id="specifications" aria-labelledby="process-title">
          <div className="process-title-wrap"><p className="eyebrow">{t.specsEyebrow}</p><h2 id="process-title">{t.specsTitle}</h2></div>
          <ol><li><span>01</span><h3>{t.specOneTitle}</h3><p>{t.specOneText}</p></li><li><span>02</span><h3>{t.specTwoTitle}</h3><p>{t.specTwoText}</p></li><li><span>03</span><h3>{t.specThreeTitle}</h3><p>{t.specThreeText}</p></li></ol>
        </section>

        <section className="steel-band" id="details">
          <img src="/assets/today-pattern-09.jpg" alt={language === "zh" ? "316不锈钢黑盖粉牡丹花色保温壶" : "316 stainless steel black-lid floral thermal pot"} />
          <div><p className="eyebrow">{t.steelEyebrow}</p><h2>{t.steelTitle}</h2><p>{t.steelText}</p><a href="#gallery" onClick={() => chooseFilter("316不锈钢")}>{t.steelLink} <ArrowRight weight="bold" /></a></div>
        </section>

        <section className="benefit-row section" aria-label={language === "zh" ? "产品卖点" : "Product benefits"}>{t.benefits.map(({ icon: Icon, title, text }) => <article key={title}><Icon weight="regular" /><h3>{title}</h3><p>{text}</p></article>)}</section>
      </main>

      <aside className="selection-cart" aria-label="已选花色">
        <div className="selection-cart-head">
          <span><ShoppingCart weight="bold" /> 已选花色</span>
          <strong>{totalCartons}</strong>
        </div>
        {selectedEntries.length === 0 ? (
          <p className="cart-empty">点击花色卡片里的容量按钮，这里会自动汇总客户选择的花色和容量。</p>
        ) : (
          <>
            <div className="cart-list">
              {selectedEntries.map(({ pattern, capacity, quantity }) => (
                <div className="cart-item" key={`${pattern.id}-${capacity.id}`}>
                  <img src={pattern.thumb} alt="" />
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
              <button className="cart-export" type="button" onClick={exportSelectedDocument}><DownloadSimple weight="bold" /> 导出报价表</button>
              <button className="cart-clear" type="button" onClick={() => { setSelectedCapacities({}); setSelectedQuantities({}); setExportStatus(""); }}>清空选款</button>
            </div>
            {exportStatus && <p className="export-status">{exportStatus}</p>}
          </>
        )}
      </aside>

      <footer><img src="/assets/brand-logo.png" alt="" /><p>{t.footerText}</p><a href="#top">{language === "zh" ? "回到顶部" : "Back to top"} <ArrowRight weight="bold" /></a></footer>

      {expanded && <div className="lightbox-backdrop" role="presentation" onClick={closeExpanded}>
        <div className="lightbox-panel" role="dialog" aria-modal="true" aria-label={`${displayPatternName(expanded)} 大图`} onClick={(event) => event.stopPropagation()} onWheel={zoomLightbox}>
          <button className="lightbox-close" type="button" onClick={closeExpanded} aria-label="关闭大图"><X weight="bold" /></button>
          <span className="zoom-meter">{Math.round(zoom * 100)}% · {language === "zh" ? "滚轮缩放" : "Wheel to zoom"}</span>
          <div className="lightbox-image"><img src={expanded.image} alt={`${displayPatternName(expanded)} 大图`} style={{ transform: `scale(${zoom})` }} /></div>
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
    </div>
  );
}
