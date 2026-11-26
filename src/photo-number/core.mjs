export const prefixes = ['318', '319', '322'];
const seriesPattern = /^[0-9]{1,24}$/;
const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });

export function validTail(tail) {
  return typeof tail === 'string' && seriesPattern.test(tail);
}

export function addToTail(tail, offset) {
  return (BigInt(tail) + BigInt(offset)).toString().padStart(tail.length, '0');
}

export function photoPlan(files, prefix, start, order) {
  if (!prefixes.includes(prefix) || !validTail(start)) return [];
  const sorted = [...files];
  if (order !== 'selected') {
    sorted.sort((first, second) => {
      if (order === 'modified' && first.lastModified !== second.lastModified) {
        return first.lastModified - second.lastModified;
      }
      return collator.compare(first.name, second.name);
    });
  }
  return sorted.map((file, index) => {
    const tail = addToTail(start, index);
    return { file, tail, code: `${prefix}-${tail}` };
  });
}

export function highestTail(first, second) {
  if (!first || BigInt(second) > BigInt(first)) return second;
  return first;
}

export function outputName(filename, extension, used) {
  const stem = filename.replace(/\.[^.]+$/u, '').replace(/[\u0000-\u001f<>:"/\\|?*]/gu, '_').trim().slice(0, 125) || '照片';
  const oldExtension = filename.split('.').pop();
  const ext = extension === 'jpg' && /^(jpg|jpeg)$/i.test(oldExtension) ? oldExtension : extension;
  let candidate = `${stem}.${ext}`;
  for (let suffix = 2; used.has(candidate.toLowerCase()); suffix++) {
    candidate = `${stem} (${suffix}).${ext}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let remainder = value;
  for (let bit = 0; bit < 8; bit++) {
    remainder = remainder & 1 ? (remainder >>> 1) ^ 0xedb88320 : remainder >>> 1;
  }
  return remainder;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}

// Store the already compressed images in a ZIP with UTF-8 filenames.
export async function photoZip(entries, timestamp = new Date()) {
  const encoder = new TextEncoder();
  const data = [];
  const central = [];
  let offset = 0;
  let directorySize = 0;
  const date = (Math.max(1980, timestamp.getFullYear()) - 1980) << 9 | (timestamp.getMonth() + 1) << 5 | timestamp.getDate();
  const time = timestamp.getHours() << 11 | timestamp.getMinutes() << 5 | timestamp.getSeconds() >> 1;
  if (entries.length > 65535) throw new Error('这批照片太多，请分批处理。');

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const size = entry.blob.size;
    if (offset + size + 30 + name.length > 0xffffffff) throw new Error('成品 ZIP 太大，请分批处理。');
    const crc = crc32(new Uint8Array(await entry.blob.arrayBuffer()));

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, name.length, true);

    const record = new DataView(new ArrayBuffer(46));
    record.setUint32(0, 0x02014b50, true);
    record.setUint16(4, 20, true);
    record.setUint16(6, 20, true);
    record.setUint16(8, 0x0800, true);
    record.setUint16(12, time, true);
    record.setUint16(14, date, true);
    record.setUint32(16, crc, true);
    record.setUint32(20, size, true);
    record.setUint32(24, size, true);
    record.setUint16(28, name.length, true);
    record.setUint32(42, offset, true);

    data.push(local.buffer, name, entry.blob);
    central.push(record.buffer, name);
    offset += 30 + name.length + size;
    directorySize += 46 + name.length;
  }

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, directorySize, true);
  end.setUint32(16, offset, true);
  return new Blob([...data, ...central, end.buffer], { type: 'application/zip' });
}
