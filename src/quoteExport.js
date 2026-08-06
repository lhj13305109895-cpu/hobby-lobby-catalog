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

async function imageToDataUri(src) {
  const response = await fetch(src);
  const blob = await response.blob();
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export async function createQuoteXlsx({ entries, quoteNo, dateDisplay }) {
  const uniquePatterns = [...new Map(entries.map(({ pattern }) => [pattern.id, pattern])).values()];
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
  const imageData = entries.map(({ pattern }) => imageByPattern.get(pattern.id));
  return makeQuoteXlsx({ entries, quoteNo, dateDisplay, imageData });
}

export async function createQuotePdf({ entries, quoteNo, dateDisplay }) {
  const pages = await buildQuotePageImages(entries, quoteNo, dateDisplay);
  return { pages, pdfBlob: makeImagePdf(pages) };
}
