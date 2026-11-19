import { readFile, mkdir, cp, writeFile, readdir, stat, rm } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const root = resolve(import.meta.dirname, '..');
const output = join(root, 'miniprogram');
let existingAppId;
try { existingAppId = JSON.parse(await readFile(join(output, 'project.config.json'), 'utf8')).appid; }
catch(error) { if(error.code !== 'ENOENT') throw error; }
await mkdir(output, { recursive: true });
const sourceRoot = join(root, 'src/miniprogram');
const sourceApp = JSON.parse(await readFile(join(sourceRoot,'app.json'),'utf8'));
const miniConfig = (await import('node:module')).createRequire(import.meta.url)(join(sourceRoot,'config.js'));
const photoMode = process.env.MINIPROGRAM_EXPORT_PHOTO_SOURCE || miniConfig.exportPhotoSource || 'local';
if(!['local','website'].includes(photoMode)) throw new Error('Unknown export photo source: '+photoMode);
for(const page of sourceApp.pages) {
  for(const extension of ['js','wxml','json']) await stat(join(sourceRoot,page+'.'+extension));
  JSON.parse(await readFile(join(sourceRoot,page+'.json'),'utf8'));
}
// Keep the current valid app/package configuration during photo preparation;
// replace it only after the new resources and manifest are ready.
await cp(sourceRoot, output, { recursive: true, filter: source => !['app.json','project.config.json','project.private.config.json'].includes(relative(sourceRoot, source)) });
await writeFile(join(output,'config.js'),'module.exports = '+JSON.stringify({...miniConfig,exportPhotoSource:photoMode})+';\n');
const load = async name => JSON.parse(await readFile(join(root, 'src/data', name + '.json'), 'utf8'));
const [products, categories, models] = await Promise.all(['products', 'categories', 'models'].map(load));
const active = categories.filter(c => c.enabled && c.visible).sort((a,b) => a.sortOrder-b.sortOrder);
const visible = products.filter(p => p.visible && active.some(c => c.categoryId === p.categoryId));
await mkdir(join(output, 'data'), { recursive: true });
// The mini program is a price-free catalogue; keep website pricing in its source.
const miniModels=Object.fromEntries(Object.entries(models).map(([id,model])=>[id,{
  ...model,capacities:model.capacities.map(({price,priceNumber,...capacity})=>capacity)
}]));
await writeFile(join(output, 'data/catalogue.js'), 'module.exports = ' + JSON.stringify({ products: visible, categories: active, models:miniModels }) + ';\n');
const bundledPython = join(process.env.USERPROFILE || process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/python', process.platform === 'win32' ? 'python.exe' : 'bin/python');
const python = process.env.MINIPROGRAM_PYTHON || (existsSync(bundledPython) ? bundledPython : 'python');
const prepared = spawnSync(python, [join(root, 'scripts/prepare-miniprogram-photos.py'),'--mode',photoMode], { input: JSON.stringify(visible), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
if(prepared.status !== 0) throw new Error('导出照片准备失败（需要带 Pillow 的 Python）。' + (prepared.stderr || prepared.error || ''));
const photoResult = JSON.parse(prepared.stdout);
const thumbnails=spawnSync(python,[join(root,'scripts/prepare-miniprogram-thumbnails.py')],{input:JSON.stringify(visible),encoding:'utf8',maxBuffer:4*1024*1024});
if(thumbnails.status!==0)throw new Error('小程序缩略图准备失败。'+(thumbnails.stderr || thumbnails.error || ''));
const thumbnailResult=JSON.parse(thumbnails.stdout);
const app = sourceApp;
app.subPackages = photoResult.packages;
await writeFile(join(output, 'app.json'), JSON.stringify(app, null, 2) + '\n');
const project = JSON.parse(await readFile(join(sourceRoot, 'project.config.json'), 'utf8'));
if(project.appid === 'touristappid' && existingAppId) project.appid = existingAppId;
let privateSettings={};
try{privateSettings=JSON.parse(await readFile(join(output,'project.private.config.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
try{Object.assign(privateSettings,JSON.parse(await readFile(join(sourceRoot,'project.private.config.json'),'utf8')));}catch(error){if(error.code!=='ENOENT')throw error;}
if(privateSettings.appid)project.appid=privateSettings.appid;
if(Object.keys(privateSettings).length)await writeFile(join(output,'project.private.config.json'),JSON.stringify(privateSettings,null,2)+'\n');
project.packOptions.include = app.subPackages.map(pack => ({type:'folder',value:pack.root}));
await writeFile(join(output, 'project.config.json'), JSON.stringify(project, null, 2) + '\n');
// Remove only retired generated mini program files; never website GLB assets.
const activePhotoRoots=new Set(app.subPackages.map(pack=>pack.root));
const retiredPhotoRoots=(await readdir(output,{withFileTypes:true})).filter(entry=>entry.isDirectory()&&/^export-photos-\d+$/.test(entry.name)&&!activePhotoRoots.has(entry.name)).map(entry=>entry.name);
for(const retired of [...retiredPhotoRoots,'pages/studio','components/pot-viewer','studio-source','utils/studio-models.js','utils/studio-glb.js','utils/studio-resources.js','vendor/draco_decoder.js','vendor/DRACO-NOTICE.txt']) {
  const target=resolve(output,retired);
  if(!target.startsWith(output+sep)) throw new Error('Retired output path escapes miniprogram');
  await rm(target,{recursive:true,force:true});
}
async function size(dir, skip = new Set()) { let bytes = 0; for (const entry of await readdir(dir, {withFileTypes:true})) { if(skip.has(entry.name)) continue; const path = join(dir, entry.name); bytes += entry.isDirectory() ? await size(path) : (await stat(path)).size; } return bytes; }
const bytes = await size(output, new Set(app.subPackages.map(pack => pack.root)));
if(bytes >= 1500 * 1000) throw new Error('小程序主包超过代码质量建议的 1.5MB');
for(const pack of app.subPackages) if(await size(join(output,pack.root)) >= 2*1024*1024) throw new Error('照片分包超过 2MB：'+pack.root);
const total = await size(output);
if(total > 20 * 1024 * 1024) throw new Error('小程序总大小超过保守的 20MB 上限');
const mediaExtensions=/\.(jpg|jpeg|png|svg|webp|gif|flac|m4a|ogg|ape|amr|wma|wav|mp3|mp4|aac|aiff|caf)$/i;
async function mediaSize(dir){let count=0;for(const entry of await readdir(dir,{withFileTypes:true})){const file=join(dir,entry.name);count+=entry.isDirectory()?await mediaSize(file):mediaExtensions.test(entry.name)?(await stat(file)).size:0;}return count;}
const mediaBytes=await mediaSize(output);
console.log(`小程序已生成：${output}；${visible.length} 款商品，${active.length} 个系列；主包 ${(bytes / 1024).toFixed(0)} KB；${photoResult.photos} 张导出照片（${photoMode}），${app.subPackages.length} 个分包；总包 ${(total/1024/1024).toFixed(2)} MB；图片/音频累计 ${(mediaBytes/1024).toFixed(1)} KB`);
if(mediaBytes>=200*1024)console.warn(`已按用户选择保留本地照片；图片/音频累计 ${(mediaBytes/1024).toFixed(1)} KB，接受开发者工具 200KB 性能建议。`);
console.log(`列表缩略图：${thumbnailResult.photos} 张；总下载量 ${(thumbnailResult.before/1024/1024).toFixed(2)} → ${(thumbnailResult.after/1024/1024).toFixed(2)} MB`);
