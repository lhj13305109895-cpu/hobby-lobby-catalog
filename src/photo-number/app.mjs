import { prefixes, validTail, addToTail, photoPlan, highestTail, outputName, photoZip } from './core.mjs';

const ui = Object.fromEntries([
  'start', 'memory', 'corner', 'order', 'size', 'size-value', 'coordinates', 'x', 'y', 'x-value', 'y-value',
  'files', 'clear', 'dropzone', 'choose', 'count', 'photo-work', 'plan', 'sample', 'sample-stage',
  'sample-image', 'sample-caption', 'status', 'process', 'download', 'format', 'resolution', 'admin-link',
].map(id => [id, document.getElementById(id)]));
const radios = [...document.querySelectorAll('input[name="prefix"]')];
const storageKey = 'photo-numbering-1';
let storageAvailable = true;

function readMemory() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)) ?? {}; }
  catch { saved = {}; storageAvailable = false; }
  return {
    prefix: prefixes.includes(saved.prefix) ? saved.prefix : '319',
    last: Object.fromEntries(prefixes.map(prefix => [prefix, validTail(saved.last?.[prefix]) ? saved.last[prefix] : ''])),
  };
}

let memory = readMemory();
let prefix = memory.prefix;
let photos = [];
let selectedPhoto = null;
let busy = false;
let previewVersion = 0;
let sampleUrl = null;
let draggedPointer = null;
let previewTimer = null;
let archive = null;
const anchors = { right: [100, 100], left: [0, 100], 'top-right': [100, 0], 'top-left': [0, 0], center: [50, 50] };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function nextTail(series) {
  return memory.last[series] ? addToTail(memory.last[series], 1) : '1';
}

function updateMemoryText() {
  ui.memory.textContent = memory.last[prefix]
    ? `已记到 ${prefix}-${memory.last[prefix]}，下一号 ${prefix}-${nextTail(prefix)}`
    : `${prefix} 系列从 ${prefix}-1 开始，可手动接上已有进度。`;
  if (!storageAvailable) ui.memory.textContent += ' 当前浏览器无法长期保存尾号。';
}

function currentPlan() {
  return photoPlan(photos, prefix, ui.start.value.trim(), ui.order.value);
}

function updateControls() {
  ui.choose.disabled = busy;
  ui.clear.disabled = busy || photos.length === 0;
  ui.process.disabled = busy || photos.length === 0 || !validTail(ui.start.value.trim());
  for (const control of [...radios, ui.start, ui.corner, ui.order, ui.size, ui.x, ui.y, ui.format, ui.resolution]) control.disabled = busy;
}

function discardArchive() {
  if (archive) URL.revokeObjectURL(archive.url);
  archive = null;
  ui.download.hidden = true;
  ui.download.removeAttribute('href');
}

function labelStyle() {
  const mode = ui.corner.value;
  const [x, y] = anchors[mode] ?? [Number(ui.x.value), Number(ui.y.value)];
  return { x, y, size: Number(ui.size.value), position: ui.corner.selectedOptions[0].textContent,
    format: ui.format.value, resolution: ui.resolution.value };
}

function updateStyleControls() {
  ui['size-value'].value = `${ui.size.value}%`;
  ui['x-value'].value = `${ui.x.value}%`;
  ui['y-value'].value = `${ui.y.value}%`;
  ui.coordinates.hidden = ui.corner.value !== 'custom';
}

async function renderPhoto(file, code, style, preview = false) {
  const source = URL.createObjectURL(file);
  const image = new Image();
  const canvas = document.createElement('canvas');
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('当前浏览器无法读取这张照片。'));
      image.src = source;
    });

    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const limit = preview ? 920 : style.resolution === 'compatible' ? 4096 : longest;
    const scale = Math.min(1, limit / longest);
    const width = Math.max(1, Math.floor(image.naturalWidth * scale));
    const height = Math.max(1, Math.floor(image.naturalHeight * scale));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const sizeError = '当前浏览器无法导出这个尺寸，可选「最长边 4096 像素」重试。';
    if (!ctx) throw new Error(sizeError);
    const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
    const type = isPng || style.format === 'png' ? 'image/png' : 'image/jpeg';
    if (type === 'image/jpeg') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(image, 0, 0, width, height);

    const short = Math.min(width, height);
    const margin = Math.max(2, Math.round(short * .025));
    let size = Math.floor(short * .06 * style.size / 100);
    const setFont = () => { ctx.font = `700 ${size}px Arial, sans-serif`; };
    setFont();
    const availableWidth = width - 2 * margin - 2;
    if (ctx.measureText(code).width > availableWidth) {
      size = Math.floor(size * availableWidth / ctx.measureText(code).width);
      setFont();
    }
    if (size < 5) throw new Error('照片太小，放不下可读的货号。');

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(12,20,33,.92)';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, size * .12);
    const text = ctx.measureText(code);
    const halfWidth = text.width / 2 + ctx.lineWidth / 2;
    const ascent = text.actualBoundingBoxAscent || size * .8;
    const descent = text.actualBoundingBoxDescent || 0;
    const halfHeight = (ascent + descent + ctx.lineWidth) / 2;
    const x = clamp(width * style.x / 100, margin + halfWidth, width - margin - halfWidth);
    const centerY = clamp(height * style.y / 100, margin + halfHeight, height - margin - halfHeight);
    const baseline = centerY + (ascent - descent) / 2;
    ctx.strokeText(code, x, baseline);
    ctx.fillText(code, x, baseline);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, type, preview ? .9 : .98));
    if (!blob || !blob.size) throw new Error(sizeError);
    const extension = blob.type === 'image/png' ? 'png' : 'jpg';
    return { blob, extension };
  } finally {
    URL.revokeObjectURL(source);
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function showSample(item) {
  const version = ++previewVersion;
  ui.sample.hidden = !item;
  if (!item) {
    if (sampleUrl) URL.revokeObjectURL(sampleUrl);
    sampleUrl = null;
    ui['sample-image'].removeAttribute('src');
    ui['sample-image'].hidden = true;
    return;
  }
  if (!sampleUrl) ui['sample-caption'].textContent = '正在生成样图…';
  const style = labelStyle();
  try {
    const rendered = await renderPhoto(item.file, item.code, style, true);
    if (version !== previewVersion) return;
    if (sampleUrl) URL.revokeObjectURL(sampleUrl);
    sampleUrl = URL.createObjectURL(rendered.blob);
    ui['sample-image'].src = sampleUrl;
    ui['sample-image'].hidden = false;
    ui['sample-caption'].textContent = `${item.code} · ${style.position} · ${style.size}% ｜可拖动调整位置`;
  } catch (error) {
    if (version === previewVersion) {
      if (sampleUrl) URL.revokeObjectURL(sampleUrl);
      sampleUrl = null;
      ui['sample-image'].removeAttribute('src');
      ui['sample-image'].hidden = true;
      ui['sample-caption'].textContent = error.message;
    }
  }
}

function updatePlan() {
  const plan = currentPlan().slice(0, 6);
  const selected = plan.find(item => item.file === selectedPhoto) ?? plan[0];
  selectedPhoto = selected?.file ?? null;
  ui['photo-work'].hidden = plan.length === 0;
  ui.count.textContent = photos.length ? `共 ${photos.length} 张${photos.length > 6 ? '，预览前 6 张' : ''}` : '还没选照片';
  ui.plan.replaceChildren(...plan.map(item => {
    const row = document.createElement('li');
    const button = document.createElement('button');
    const name = document.createElement('span');
    const code = document.createElement('strong');
    name.className = 'filename';
    name.textContent = item.file.name;
    code.textContent = item.code;
    button.type = 'button';
    button.setAttribute('aria-pressed', String(item === selected));
    button.append(name, code);
    button.addEventListener('click', () => {
      if (busy) return;
      selectedPhoto = item.file;
      for (const entry of ui.plan.querySelectorAll('button')) entry.setAttribute('aria-pressed', String(entry === button));
      showSample(item);
    });
    row.append(button);
    return row;
  }));
  showSample(selected);
  updateControls();
}

function changePlan() {
  discardArchive();
  updatePlan();
  ui.status.textContent = !photos.length ? '选好照片后可以预览编号。' : validTail(ui.start.value.trim())
    ? '核对编号和样图后，可以生成照片。' : '起始尾号请填写数字。';
}

function importPhotos(files) {
  if (busy) return;
  const key = file => JSON.stringify([file.name, file.size, file.lastModified]);
  const existing = new Set(photos.map(key));
  let added = 0;
  for (const file of files) {
    const identity = key(file);
    if ((!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif|avif|bmp|gif|tiff?)$/i.test(file.name)) || existing.has(identity)) continue;
    photos.push(file);
    existing.add(identity);
    added++;
  }
  if (added) changePlan();
  else ui.status.textContent = '没有新增照片。';
}

ui.choose.addEventListener('click', () => ui.files.click());
ui.files.addEventListener('change', () => { importPhotos(ui.files.files); ui.files.value = ''; });
ui.clear.addEventListener('click', () => { photos = []; selectedPhoto = null; changePlan(); });
ui.dropzone.addEventListener('dragover', event => {
  if (!busy && event.dataTransfer.types.includes('Files')) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    ui.dropzone.classList.add('dragging');
  }
});
ui.dropzone.addEventListener('dragleave', () => ui.dropzone.classList.remove('dragging'));
ui.dropzone.addEventListener('drop', event => {
  event.preventDefault();
  ui.dropzone.classList.remove('dragging');
  importPhotos(event.dataTransfer.files);
});
document.addEventListener('paste', event => {
  if (event.clipboardData?.files.length && !busy) {
    event.preventDefault();
    importPhotos(event.clipboardData.files);
  }
});
for (const radio of radios) radio.addEventListener('change', () => {
  prefix = radio.value;
  ui.start.value = nextTail(prefix);
  updateMemoryText();
  changePlan();
});
ui.start.addEventListener('input', changePlan);
ui.order.addEventListener('change', changePlan);
function changeLabelStyle() {
  discardArchive();
  updateStyleControls();
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => showSample(currentPlan().find(item => item.file === selectedPhoto)), 90);
  if (photos.length && validTail(ui.start.value.trim())) ui.status.textContent = '核对字号和位置后，可以批量添加货号。';
}
ui.corner.addEventListener('change', changeLabelStyle);
ui.format.addEventListener('change', changeLabelStyle);
ui.resolution.addEventListener('change', changeLabelStyle);
for (const slider of [ui.size, ui.x, ui.y]) slider.addEventListener('input', changeLabelStyle);

function moveLabel(event) {
  const image = ui['sample-image'];
  const bounds = image.getBoundingClientRect();
  const scale = Math.min(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const left = bounds.left + (bounds.width - width) / 2;
  const top = bounds.top + (bounds.height - height) / 2;
  ui.x.value = Math.round(clamp((event.clientX - left) * 100 / width, 0, 100));
  ui.y.value = Math.round(clamp((event.clientY - top) * 100 / height, 0, 100));
  ui.corner.value = 'custom';
  changeLabelStyle();
}

ui['sample-stage'].addEventListener('pointerdown', event => {
  if (busy || draggedPointer !== null || !ui['sample-image'].naturalWidth || event.button !== 0) return;
  draggedPointer = event.pointerId;
  ui['sample-stage'].setPointerCapture(draggedPointer);
  moveLabel(event);
});
ui['sample-stage'].addEventListener('pointermove', event => {
  if (event.pointerId === draggedPointer && !busy) moveLabel(event);
});
ui['sample-stage'].addEventListener('pointerup', event => {
  if (event.pointerId !== draggedPointer) return;
  if (!busy) moveLabel(event);
  draggedPointer = null;
});
ui['sample-stage'].addEventListener('lostpointercapture', () => { draggedPointer = null; });

ui.process.addEventListener('click', async () => {
  const plan = currentPlan();
  if (!plan.length || busy) return;
  if (!window.confirm(`生成 ${plan.length} 张照片\n编号从 ${plan[0].code} 到 ${plan.at(-1).code}。继续？`)) return;
  const series = prefix;
  const style = labelStyle();
  discardArchive();
  busy = true;
  updateControls();
  const entries = [];
  const used = new Set();
  const rows = ['状态\t原文件名\t货号\t成品文件名或失败原因'];
  const oneLine = value => value.replace(/[\t\r\n]/g, ' ');
  let last = '';
  try {
    for (const [index, item] of plan.entries()) {
      ui.status.textContent = `正在处理 ${index + 1} / ${plan.length} 张…`;
      try {
        const result = await renderPhoto(item.file, item.code, style);
        const name = outputName(item.file.name, result.extension, used);
        entries.push({ name, blob: result.blob });
        rows.push(`成功\t${oneLine(item.file.name)}\t${item.code}\t${name}`);
        last = item.tail;
      } catch (error) {
        rows.push(`失败\t${oneLine(item.file.name)}\t${item.code}\t${oneLine(error.message)}`);
      }
    }
    const count = entries.length;
    ui.status.textContent = `已生成 ${count} 张，失败 ${plan.length - count} 张。`;
    if (!count) {
      ui.status.textContent += ' 可尝试选用 JPG 或 PNG 照片。';
      return;
    }
    entries.push({ name: '货号添加记录.txt', blob: new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/plain;charset=utf-8' }) });
    const blob = await photoZip(entries);
    archive = { url: URL.createObjectURL(blob), series, last, saved: false };
    ui.download.href = archive.url;
    ui.download.download = `已加货号_${plan[0].code}至${series}-${last}.zip`;
    ui.download.hidden = false;
    ui.download.focus();
    ui.status.textContent += ' 下载后会记住本批尾号。';
  } catch (error) {
    ui.status.textContent = `打包失败。${error.message}`;
  } finally {
    busy = false;
    updateControls();
  }
});

ui.download.addEventListener('click', () => {
  if (!archive || archive.saved) return;
  const saved = readMemory();
  const { series, last } = archive;
  for (const key of prefixes) {
    const latest = saved.last[key];
    if (latest) memory.last[key] = highestTail(memory.last[key], latest);
  }
  memory.last[series] = highestTail(memory.last[series], last);
  memory.prefix = series;
  try { localStorage.setItem(storageKey, JSON.stringify(memory)); storageAvailable = true; }
  catch { storageAvailable = false; }
  archive.saved = true;
  ui.start.value = nextTail(series);
  updateMemoryText();
  updatePlan();
  ui.status.textContent = storageAvailable
    ? `下载已发起。${series} 系列已记到 ${series}-${memory.last[series]}。`
    : `下载已发起。请记下当前尾号 ${series}-${last}，此浏览器无法长期保存。`;
});

radios.find(radio => radio.value === prefix).checked = true;
ui.start.value = nextTail(prefix);
updateMemoryText();
updateControls();
updateStyleControls();
if (location.pathname.startsWith('/photo-number/')) ui['admin-link'].hidden = false;
