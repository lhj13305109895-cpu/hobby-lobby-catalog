const {workbook} = require('./selection-xlsx');
const {document:createPdf} = require('./selection-pdf');
const photoResources = require('../data/export-photos');
const config = require('../config');
const call = (receiver, method, options) => new Promise((resolve, reject) => {
  receiver[method](Object.assign({}, options, {success: resolve, fail: reject}));
});
function jpeg(data, resource) {
  const bytes=new Uint8Array(data);
  if(bytes.length<4 || (resource.bytes && bytes.length!==resource.bytes) || bytes[0]!==255 || bytes[1]!==216 || bytes[bytes.length-2]!==255 || bytes[bytes.length-1]!==217)throw new Error('Invalid JPEG resource');
  return bytes;
}
async function downloadPhoto(resource,fs,progress) {
  const path=resource.remotePath || resource.path;
  if(!/^\/assets\/selection-photos\/[a-f0-9]{24}\.jpg$/.test(path))throw new Error('Missing website photo path');
  const origin=(config.exportPhotoOrigin || config.assetOrigin).replace(/\/$/,'');
  if(!/^https:\/\/[^/]+$/.test(origin))throw new Error('Photo origin must be an HTTPS domain');
  const cachePath=wx.env.USER_DATA_PATH+'/hl-selection-'+path.split('/').pop();
  try {
    const cached=await call(fs,'readFile',{filePath:cachePath});
    return jpeg(cached.data,resource);
  } catch(error) { /* Missing or invalid cache: download the prepared JPEG. */ }
  progress.stage='download';
  const downloaded=await call(wx,'downloadFile',{url:origin+path,timeout:30000});
  if(downloaded.statusCode!==200)throw new Error('Photo HTTP '+downloaded.statusCode);
  progress.stage='read';
  const result=await call(fs,'readFile',{filePath:downloaded.tempFilePath});
  progress.stage='format';
  const bytes=jpeg(result.data,resource);
  // The downloaded photo remains usable if the optional persistent cache is full.
  try {await call(fs,'writeFile',{filePath:cachePath,data:bytes.buffer});} catch(error) {console.warn('Selection photo cache unavailable');}
  return bytes;
}
async function createSelectionFile(items, lang, onProgress, format='xlsx') {
  if(!['pdf','xlsx'].includes(format))throw new Error('Unsupported selection format');
  const fs=wx.getFileSystemManager(),packages=new Set(),cache=new Map(),photos=[];
  for(let i=0;i<items.length;i++) {
    const item=items[i];if(onProgress)onProgress(i+1,items.length);
    if(!cache.has(item.productId)) {
      const resource=photoResources[item.productId],progress={stage:'manifest'};
      try {
        if(!resource)throw new Error('Missing export photo resource');
        if(config.exportPhotoSource==='website') {
          cache.set(item.productId,await downloadPhoto(resource,fs,progress));
        } else {
          progress.stage='package';
          if(!packages.has(resource.package)) {
            await call(wx,'loadSubpackage',{name:resource.package});
            packages.add(resource.package);
          }
          progress.stage='read';
          const result=await call(fs,'readFile',{filePath:resource.path});
          cache.set(item.productId,jpeg(result.data,resource));
        }
      } catch(cause) {
        const error=new Error(item.code);error.code='PHOTO';error.stage=progress.stage;error.detail=cause.errMsg||cause.message||String(cause);
        console.error('Selection photo export failed',{itemCode:item.code,stage:error.stage,detail:error.detail});throw error;
      }
    }
    photos.push(cache.get(item.productId));
  }
  const filePath=wx.env.USER_DATA_PATH+'/Hobby-Lobby-Selection'+(format==='pdf'?'-'+Date.now():'')+'.'+format;
  await call(fs,'writeFile',{filePath,data:format==='pdf'?createPdf(items,photos,lang):workbook(items,photos,lang)});return filePath;
}
function openFile(filePath){return call(wx,'openDocument',{filePath,fileType:/\.pdf$/i.test(filePath)?'pdf':'xlsx',showMenu:true});}
module.exports={createSelectionFile,openFile};
