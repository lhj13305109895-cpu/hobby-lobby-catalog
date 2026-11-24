const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const catalogue=require('../miniprogram/utils/catalogue');
const selection=require('../miniprogram/utils/selection');
const {workbook}=require('../miniprogram/utils/selection-xlsx');
const {document:createPdf}=require('../miniprogram/utils/selection-pdf');
const exporter=require('../miniprogram/utils/export-selection');
const photoResources=require('../miniprogram/data/export-photos');
const photoLoaders=require('../miniprogram/data/export-photo-loaders');
const miniConfig=require('../miniprogram/config');
let storage={};
global.wx={getStorageSync:key=>storage[key],setStorageSync:(key,value)=>{storage[key]=value;},showToast(){}};

// Read the public ZIP container format and verify both local and central records.
function entries(buffer){
  const bytes=Buffer.from(buffer),out=new Map();let at=0;
  while(bytes.readUInt32LE(at)===0x04034b50){
    assert.equal(bytes.readUInt16LE(at+8),0);
    const size=bytes.readUInt32LE(at+18),nameSize=bytes.readUInt16LE(at+26),extra=bytes.readUInt16LE(at+28);
    const name=bytes.toString('utf8',at+30,at+30+nameSize),start=at+30+nameSize+extra;
    const data=bytes.subarray(start,start+size);let crc=0xffffffff;
    for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;}
    assert.equal((crc^0xffffffff)>>>0,bytes.readUInt32LE(at+14));out.set(name,data);at=start+size;
  }
  const end=bytes.length-22;assert.equal(bytes.readUInt32LE(end),0x06054b50);assert.equal(bytes.readUInt16LE(end+10),out.size);assert.equal(bytes.readUInt32LE(end+16),at);
  let count=0;while(at<end){assert.equal(bytes.readUInt32LE(at),0x02014b50);at+=46+bytes.readUInt16LE(at+28)+bytes.readUInt16LE(at+30)+bytes.readUInt16LE(at+32);count++;}assert.equal(count,out.size);return out;
}
function selected(){storage={};const p=catalogue.products.find(p=>p.model==='319'&&p.offers.length===2);for(const o of p.offers)selection.toggle(p.productId,o.id);return selection.items('zh');}
function photoFile(resource){return resource.package?path.resolve(__dirname,'../miniprogram',resource.path):path.resolve(__dirname,'../public',resource.path.slice(1));}
function nativeMocks(){
  const state={writes:[],opens:[],loads:[],downloads:[],reads:[],files:new Map()};
  // Native Mini Programs have require.async, not the Mini Game wx.loadSubpackage API.
  delete global.wx.loadSubpackage;
  const loaderFile=path.resolve(__dirname,'../miniprogram/data/export-photo-loaders.js');
  const nativeRequire=createRequire(loaderFile),loaded={exports:{}};
  nativeRequire.async=async modulePath=>{
    await Promise.resolve();
    const resolved=nativeRequire.resolve(modulePath);
    const app=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../miniprogram/app.json'),'utf8'));
    const pack=app.subPackages.find(pack=>resolved===path.resolve(__dirname,'../miniprogram',pack.root,'ready.js'));
    assert.ok(pack,'Async loader must target a registered photo subpackage');
    state.loads.push(pack.name);
    assert.equal(nativeRequire(modulePath),true);
    return true;
  };
  vm.runInNewContext(fs.readFileSync(loaderFile,'utf8'),{module:loaded,require:nativeRequire});
  Object.assign(photoLoaders,loaded.exports);
  const api={marker:true,
    readFile(o){assert.equal(this.marker,true);state.reads.push(o.filePath);let bytes=state.files.get(o.filePath);if(!bytes&&o.filePath.startsWith('export-photos-')){const resource=Object.values(photoResources).find(resource=>resource.path===o.filePath);assert.ok(state.loads.includes(resource.package),'Read bundled JPEG only after require.async completes');bytes=fs.readFileSync(path.resolve(__dirname,'../miniprogram',o.filePath));}if(!bytes){o.fail({errMsg:'ENOENT'});return;}o.success({data:Uint8Array.from(bytes).buffer});},
    writeFile(o){assert.equal(this.marker,true);state.writes.push(o);state.files.set(o.filePath,Buffer.from(o.data));o.success({});}
  };
  Object.assign(global.wx,{env:{USER_DATA_PATH:'/sandbox'},getImageInfo(){throw Error('Must not decode WebP on the phone');},canvasToTempFilePath(){throw Error('Must not use runtime canvas export');},downloadFile(o){state.downloads.push(o.url);const url=new URL(o.url);assert.equal(url.origin,miniConfig.assetOrigin);assert.equal(o.timeout,30000);const bytes=fs.readFileSync(path.resolve(__dirname,'../public',url.pathname.slice(1)));const tempFilePath='/temp/photo-'+state.downloads.length+'.jpg';state.files.set(tempFilePath,bytes);o.success({statusCode:200,tempFilePath});},getFileSystemManager(){return api;},openDocument(o){state.opens.push(o);o.success({});}});
  return state;
}
function websiteExporter(){
  const file=path.resolve(__dirname,'../src/miniprogram/utils/export-selection.js');const original=createRequire(file);const output={exports:{}};
  vm.runInNewContext(fs.readFileSync(file,'utf8'),{module:output,require:name=>name==='../config'?{...miniConfig,exportPhotoSource:'website'}:name==='../data/export-photos'?photoResources:name==='../data/export-photo-loaders'?photoLoaders:original(name),wx:global.wx,Uint8Array,Set,Map,console,setTimeout:callback=>setTimeout(callback,0)});
  return output.exports;
}

test('legacy selections default to one piece; quantities are validated and independent per capacity',()=>{
  const rows=selected(),p=rows[0];assert.equal(rows[0].quantity,1);
  assert.equal(selection.setQuantity(p.productId,p.offer.id,'48'),true);
  assert.equal(selection.items('zh')[0].quantity,48);assert.equal(selection.items('zh')[1].quantity,1);
  for(const value of ['',0,-1,'1.2','2e3','abc',1000000])assert.equal(selection.setQuantity(p.productId,p.offer.id,value),false);
  assert.equal(selection.items('zh')[0].quantity,48);
  selection.toggle(p.productId,rows[1].offer.id);assert.equal(selection.items('zh')[0].quantity,48);
});
test('selection quantities represent cartons using each capacity packing count',()=>{
  storage={};
  const cases=[['318','1.2L',2,48],['318','2.0L',1,20],['319','1.6L',4,96],['319','2.0L',3,60],['322','1.0L',2,60],['322','1.3L',3,72]];
  for(const [model,capacity,cartons,pieces] of cases){
    const p=catalogue.products.find(p=>p.model===model&&p.offers.some(o=>o.id===capacity));
    selection.toggle(p.productId,capacity);selection.setQuantity(p.productId,capacity,cartons);
    const row=selection.items('zh').find(row=>row.productId===p.productId&&row.offer.id===capacity);
    assert.equal(row.quantity,cartons);assert.equal(row.pieces,pieces);
  }
});
test('photographic model filters keep 318 capacities separate, include 322 and scope numeric search',()=>{
  const cards=catalogue.modelCards();assert.deepEqual(cards.map(c=>c.id),['318-1.2L','318-2.0L','319','322']);assert.ok(cards.every(c=>c.image.startsWith('/assets/models/')&&fs.existsSync(path.join(__dirname,'../miniprogram',c.image))));
  const model322=catalogue.groups('322','','zh').filter(group=>group.id!=='latest-arrivals').flatMap(group=>group.items);assert.ok(model322.length);assert.ok(model322.every(p=>p.model==='322'&&p.code.startsWith('322-')));for(const p of model322){const matches=catalogue.groups('322',p.code.split('-').pop(),'en').flatMap(group=>group.items);assert.ok(matches.length);assert.ok(matches.every(q=>q.productId===p.productId));}
  for(const id of ['318-1.2L','318-2.0L']){const groups=catalogue.groups(id,'','zh');assert.ok(groups.length);for(const group of groups)for(const p of group.items){assert.equal(p.model,'318');assert.ok(p.capacities.includes(id.slice(4)));const result=catalogue.groups(id,p.code.split('-').pop(),'zh');assert.ok(result.flatMap(g=>g.items).every(q=>q.capacities.includes(id.slice(4))));}}
});
test('Excel has three columns, numeric carton quantities, public codes and photos without pricing',()=>{
  const rows=selected();rows[0].quantity=48;rows[0].code='319套装-20 & <custom>';
  const source=catalogue.products.find(p=>p.image.endsWith('.jpg'));
  const filePath=path.resolve(__dirname,'../public',new URL(source.image).pathname.slice(1));const photo=new Uint8Array(fs.readFileSync(filePath));
  const files=entries(workbook(rows,[photo,photo],'zh'));const sheet=files.get('xl/worksheets/sheet1.xml').toString();
  assert.ok(sheet.includes('照片'));assert.ok(sheet.includes('货号'));assert.ok(sheet.includes('数量（件）'));assert.ok(sheet.includes('319套装-20 &amp; &lt;custom&gt;'));
  assert.match(sheet,/<c r="C2" s="0"><v>48<\/v>/);assert.match(sheet,/<dimension ref="A1:C3"/);assert.ok(!sheet.includes('r="D'));
  for(const lang of ['en','zh']){const files=entries(workbook(rows,[photo,photo],lang));for(const [name,data] of files)if(name.endsWith('.xml'))assert.doesNotMatch(data.toString(),/¥|RMB|单价|Unit price/);}
  const drawing=files.get('xl/drawings/drawing1.xml').toString();assert.equal((drawing.match(/<xdr:twoCellAnchor editAs="oneCell">/g)||[]).length,2);assert.ok(drawing.includes('<xdr:row>1</xdr:row>'));assert.ok(drawing.includes('<xdr:row>2</xdr:row>'));
  assert.deepEqual(files.get('xl/media/image1.jpg'),Buffer.from(photo));assert.deepEqual(files.get('xl/media/image2.jpg'),Buffer.from(photo));
  assert.ok(files.get('xl/drawings/_rels/drawing1.xml.rels').toString().includes('../media/image2.jpg'));
  assert.throws(()=>workbook(rows,[photo],'en'),/Missing/);assert.throws(()=>workbook([Object.assign({},rows[0],{quantity:0})],[photo],'en'),/Invalid/);
});
test('all visible products, including the failing WebP photo 318A-135, have prepared JPEG resources',()=>{
  assert.equal(Object.keys(photoResources).length,catalogue.products.length);
  const app=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../miniprogram/app.json'),'utf8'));
  const project=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../miniprogram/project.config.json'),'utf8'));
  for(const p of catalogue.products){
    const resource=photoResources[p.productId];
    if(resource.package){assert.ok(app.subPackages.some(pack=>pack.name===resource.package));assert.ok(project.packOptions.include.some(include=>resource.path.startsWith(include.value+'/')));}
    else{assert.equal(resource.path,resource.remotePath);}
    if(p.image.startsWith('/catalogue-photos/')) assert.ok(resource.package);
    else if(miniConfig.exportPhotoSource==='website') assert.equal(resource.package,undefined);
    assert.match(resource.remotePath,/^\/assets\/selection-photos\/[a-f0-9]{24}\.jpg$/);
    const bytes=fs.readFileSync(photoFile(resource));assert.equal(bytes.readUInt16BE(0),0xffd8);assert.equal(bytes.length,resource.bytes);
    let at=2,dimensions;
    while(at<bytes.length){const marker=bytes.readUInt16BE(at),length=bytes.readUInt16BE(at+2);if(marker===0xffc0){dimensions=[bytes.readUInt16BE(at+7),bytes.readUInt16BE(at+5)];break;}at+=2+length;}
    assert.deepEqual(dimensions,[640,480],p.code);
  }
  const failed=catalogue.products.find(p=>p.code==='318A-135');assert.ok(failed.image.endsWith('.webp'));assert.ok(photoResources[failed.productId].path.endsWith('.jpg'));
});
test('native export writes a binary Excel file, deduplicates shared images and enables document sharing menu',async()=>{
  const items=selected(),state=nativeMocks();
  const file=await exporter.createSelectionFile(items,'zh');assert.equal(state.loads.length+state.downloads.length,1);assert.equal(state.reads.filter(path=>!path.includes('/hl-selection-')).length,1);assert.equal(file,'/sandbox/Hobby-Lobby-Selection.xlsx');const writes=state.writes.filter(o=>o.filePath.endsWith('.xlsx'));assert.equal(writes.length,1);assert.equal(entries(writes[0].data).size,11);
  await exporter.openFile(file);assert.equal(state.opens[0].showMenu,true);assert.equal(state.opens[0].fileType,'xlsx');
  nativeMocks();for(const name of Object.keys(photoLoaders))photoLoaders[name]=async()=>{throw Error('offline');};wx.downloadFile=o=>o.fail({errMsg:'offline'});await assert.rejects(exporter.createSelectionFile(items,'zh'),e=>e.code==='PHOTO'&&e.stage===(photoResources[items[0].productId].package?'package':'download')&&e.detail==='offline'&&e.message===items[0].code);
});
test('new bundled products export both formats without downloading unpublished images',{
  skip:miniConfig.exportPhotoSource!=='hybrid'
},async()=>{
  const items=catalogue.products.filter(p=>photoResources[p.productId].package).map(p=>({...p,quantity:2,offer:p.offers[0]}));assert.ok(items.length);
  for(const format of ['pdf','xlsx']){
    const state=nativeMocks();wx.downloadFile=()=>{throw Error('Bundled photos must not request website files');};
    assert.equal(typeof wx.loadSubpackage,'undefined');
    await exporter.createSelectionFile(items,'zh',undefined,format);
    assert.equal(state.downloads.length,0);assert.equal(state.loads.length,new Set(items.map(p=>photoResources[p.productId].package)).size);
    const bytes=state.writes.find(row=>row.filePath.endsWith('.'+format)).data;
    if(format==='xlsx'){const files=entries(bytes);assert.equal([...files.keys()].filter(name=>name.startsWith('xl/media/')).length,items.length);}
    else assert.ok(Buffer.from(bytes).toString('ascii',0,8).startsWith('%PDF-1.6'));
  }
  assert.ok(items.every(p=>photoResources[p.productId].package));
});
test('bundled photo reports an async package failure before attempting a file read',{
  skip:!Object.values(photoResources).some(resource=>resource.package)
},async()=>{
  const product=catalogue.products.find(p=>p.code==='322-47'&&photoResources[p.productId].package)||catalogue.products.find(p=>photoResources[p.productId].package),resource=photoResources[product.productId];
  assert.ok(resource.package);const state=nativeMocks();
  photoLoaders[resource.package]=async()=>{throw Error('subpackage download failed');};
  await assert.rejects(exporter.createSelectionFile([{...product,quantity:1,offer:product.offers[0]}],'zh',undefined,'pdf'),
    error=>error.code==='PHOTO'&&error.message===product.code&&error.stage==='package'&&error.detail==='subpackage download failed');
  assert.equal(state.reads.length,0);assert.equal(state.writes.length,0);
});
test('website mode exports all newly hosted products, including 322-47, with a cached download per product',{
  skip:miniConfig.exportPhotoSource!=='website'
},async()=>{
  const localIds=new Set(require('../src/miniprogram/data/local-products.json').map(p=>p.productId));
  const items=catalogue.products.filter(p=>p.model==='322'||localIds.has(p.productId)).map(p=>({...p,quantity:2,offer:p.offers[0]}));
  assert.ok(items.some(p=>p.code==='322-47'));assert.ok(items.some(p=>p.code==='318B-25'));
  const state=nativeMocks();assert.equal(typeof wx.loadSubpackage,'undefined');
  for(const format of ['pdf','xlsx']){
    await exporter.createSelectionFile(items,'zh',undefined,format);
    const bytes=state.writes.find(row=>row.filePath.endsWith('.'+format)).data;
    if(format==='xlsx')assert.equal([...entries(bytes).keys()].filter(name=>name.startsWith('xl/media/')).length,items.length);
    else assert.ok(Buffer.from(bytes).toString('ascii',0,8).startsWith('%PDF-1.6'));
  }
  assert.equal(state.loads.length,0);assert.equal(state.downloads.length,new Set(items.map(p=>p.productId)).size);
});
test('basket refuses invalid drafts and always releases loading state on a failed export',async()=>{
  selected();const errors=[];let hidden=0,config;
  Object.assign(global.wx,{setTabBarItem(){},showToast(o){errors.push(o.title);},showLoading(){},hideLoading(){hidden++;},showModal(o){errors.push(o.title);}});
  const file=path.resolve(__dirname,'../miniprogram/pages/basket/index.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{require:createRequire(file),wx,Page:c=>{config=c;},encodeURIComponent});
  config.data=JSON.parse(JSON.stringify(config.data));config.setData=function(data){Object.assign(this.data,data);};config.onShow();
  const row=config.data.items[0];config.quantity({currentTarget:{dataset:{id:row.productId,capacity:row.offer.id}},detail:{value:''}});await config.exportSelection();assert.equal(errors.length,1);assert.equal(config.data.exporting,false);
  config.quantity({currentTarget:{dataset:{id:row.productId,capacity:row.offer.id}},detail:{value:'48'}});nativeMocks();for(const name of Object.keys(photoLoaders))photoLoaders[name]=async()=>{throw Error('offline');};wx.downloadFile=o=>o.fail({errMsg:'offline'});await config.exportSelection();assert.equal(config.data.exporting,false);assert.equal(hidden,1);assert.equal(errors.length,2);
});
test('the exact four rows in the reported failure export without image APIs or canvas',async()=>{
  const requested=[['318A-135','1.2L',24],['318A-134','1.2L',48],['319-334','1.6L',72],['319-334','2.0L',20]];
  const items=requested.map(([code,capacity,quantity])=>{
    const product=catalogue.products.find(p=>p.code===code);
    assert.ok(product,code);
    return Object.assign({},product,{quantity,offer:product.offers.find(o=>o.id===capacity)});
  });
  const state=nativeMocks();
  await exporter.createSelectionFile(items,'zh');const files=entries(state.writes.find(o=>o.filePath.endsWith('.xlsx')).data);
  assert.equal(state.reads.filter(path=>!path.includes('/hl-selection-')).length,3);assert.ok(state.loads.length+state.downloads.length>0);
  const sheet=files.get('xl/worksheets/sheet1.xml').toString();
  for(let i=0;i<items.length;i++){
    assert.ok(sheet.includes(items[i].code));assert.ok(sheet.includes(`<c r="C${i+2}" s="0"><v>${items[i].quantity}</v>`));
    assert.ok(!sheet.includes(`<c r="D${i+2}"`));
    assert.deepEqual(files.get(`xl/media/image${i+1}.jpg`),fs.readFileSync(photoFile(photoResources[items[i].productId])));
  }
});

test('website export downloads one JPEG per product, embeds photos and reuses the persistent cache',async()=>{
  const items=selected(),state=nativeMocks(),remote=websiteExporter();
  await remote.createSelectionFile(items,'zh');assert.equal(state.loads.length,0);assert.equal(state.downloads.length,1);
  const files=entries(state.writes.find(o=>o.filePath.endsWith('.xlsx')).data);assert.deepEqual(files.get('xl/media/image1.jpg'),files.get('xl/media/image2.jpg'));
  await remote.createSelectionFile(items,'zh');assert.equal(state.downloads.length,1);
});

test('website export rejects domain/network failures, non-200 responses and HTML masquerading as a photo',async()=>{
  const items=selected();
  for(const [stage,download] of [
    ['download',o=>o.fail({errMsg:'downloadFile:fail url not in domain list'})],
    ['download',o=>o.success({statusCode:404,tempFilePath:'/temp/error'})],
    ['format',o=>o.success({statusCode:200,tempFilePath:'/temp/error'})]
  ]){
    const state=nativeMocks();state.files.set('/temp/error',Buffer.from('<html>Not a JPEG</html>'));wx.downloadFile=download;
    await assert.rejects(websiteExporter().createSelectionFile(items,'zh'),error=>error.code==='PHOTO'&&error.stage===stage&&error.message===items[0].code);
    assert.equal(state.writes.filter(o=>o.filePath.endsWith('.xlsx')).length,0);
  }
});

test('website export refreshes corrupt cache and succeeds even when persistent cache writes fail',async()=>{
  const items=selected(),state=nativeMocks(),resource=photoResources[items[0].productId];
  state.files.set('/sandbox/hl-selection-'+resource.remotePath.split('/').pop(),Buffer.from('corrupt cache'));
  const api=wx.getFileSystemManager(),write=api.writeFile;api.writeFile=function(o){if(o.filePath.includes('/hl-selection-'))o.fail({errMsg:'storage full'});else write.call(this,o);};
  await websiteExporter().createSelectionFile(items,'zh');assert.equal(state.downloads.length,1);assert.equal(state.writes.filter(o=>o.filePath.endsWith('.xlsx')).length,1);
});

test('322-34 recovers from timeout and HTTP 503, keeps prior photos cached and exports both formats',async()=>{
  const items=['318B-23','318B-22','322-34'].map(code=>{const p=catalogue.products.find(p=>p.code===code);return {...p,quantity:1,offer:p.offers[0]};});
  const state=nativeMocks(),download=wx.downloadFile,requests=[],progress=[];
  const resource=photoResources[items[2].productId];let failures=0;
  wx.downloadFile=options=>{
    requests.push(options.url);
    if(new URL(options.url).pathname===resource.path&&failures++<2){
      if(failures===1)options.fail({errMsg:'downloadFile:fail timeout'});
      else options.success({statusCode:503,tempFilePath:'/temp/unavailable'});
    }else download(options);
  };
  const remote=websiteExporter();
  for(const format of ['pdf','xlsx']){
    await remote.createSelectionFile(items,'zh',(n,total,retry)=>{if(retry)progress.push({n,total,...retry});},format);
    const bytes=state.writes.find(row=>row.filePath.endsWith('.'+format)).data;
    if(format==='xlsx')assert.deepEqual(entries(bytes).get('xl/media/image3.jpg'),fs.readFileSync(photoFile(resource)));
    else assert.equal((Buffer.from(bytes).toString('latin1').match(/\/Subtype \/Image\b/g)||[]).length,3);
  }
  assert.equal(requests.length,5);assert.equal(state.downloads.length,3);
  assert.deepEqual(progress.map(p=>[p.code,p.attempt,p.n,p.total]),[['322-34',2,3,3],['322-34',3,3,3]]);
  assert.ok(requests.some(url=>url.endsWith('?retry=2')));assert.ok(requests.some(url=>url.endsWith('?retry=3')));
});

test('incomplete or unreadable temporary downloads are fetched again before export',async()=>{
  const product=catalogue.products.find(p=>p.code==='322-34'),items=[{...product,quantity:1,offer:product.offers[0]}];
  for(const mode of ['incomplete','read']){
    const state=nativeMocks(),download=wx.downloadFile,api=wx.getFileSystemManager(),read=api.readFile;let attempts=0,failedRead=false;
    state.files.set('/temp/incomplete',Buffer.from('<html>temporary error</html>'));
    wx.downloadFile=options=>{attempts++;if(mode==='incomplete'&&attempts===1)options.success({statusCode:200,tempFilePath:'/temp/incomplete'});else download(options);};
    api.readFile=function(options){if(mode==='read'&&!failedRead&&options.filePath.startsWith('/temp/')){failedRead=true;options.fail({errMsg:'readFile:fail temporary file unavailable'});}else read.call(this,options);};
    await websiteExporter().createSelectionFile(items,'zh',undefined,'pdf');
    assert.equal(attempts,2);assert.equal(state.writes.filter(row=>row.filePath.endsWith('.pdf')).length,1);
  }
});

test('persistent download errors keep the exact code and cause, while domain/404 errors stop immediately',async()=>{
  const product=catalogue.products.find(p=>p.code==='322-34'),items=[{...product,quantity:1,offer:product.offers[0]}];
  for(const [detail,status,expectedAttempts] of [['downloadFile:fail timeout',0,3],['downloadFile:fail url not in domain list',0,1],['Photo HTTP 404',404,1]]){
    const state=nativeMocks();let attempts=0;
    wx.downloadFile=options=>{attempts++;if(status)options.success({statusCode:status,tempFilePath:'/temp/error'});else options.fail({errMsg:detail});};
    await assert.rejects(websiteExporter().createSelectionFile(items,'zh',undefined,'pdf'),error=>error.message==='322-34'&&error.stage==='download'&&error.detail===detail&&error.attempts===expectedAttempts);
    assert.equal(attempts,expectedAttempts);assert.equal(state.writes.length,0);
  }
});

test('the basket shows the real photo failure in the selected language and releases export controls',async()=>{
  const product=catalogue.products.find(p=>p.code==='322-34');storage={};selection.toggle(product.productId,product.offers[0].id);
  for(const lang of ['zh','en']){
    storage['hobby-mini-language']=lang;nativeMocks();const modals=[];let hidden=0,page;
    Object.assign(wx,{setTabBarItem(){},showLoading(){},hideLoading(){hidden++;},showModal(options){modals.push(options);},downloadFile(options){options.fail({errMsg:'downloadFile:fail url not in domain list'});}});
    const file=path.join(__dirname,'../miniprogram/pages/basket/index.js');
    vm.runInNewContext(fs.readFileSync(file,'utf8'),{require:createRequire(file),wx,Page:config=>{page=config;},encodeURIComponent});
    page.data=JSON.parse(JSON.stringify(page.data));page.setData=function(data){Object.assign(this.data,data);};page.onShow();
    await page.exportSelection();
    assert.equal(page.data.exporting,false);assert.equal(hidden,1);assert.equal(modals.length,1);
    assert.ok(modals[0].content.includes('322-34'));assert.ok(modals[0].content.includes('downloadFile:fail url not in domain list'));
    assert.ok(modals[0].content.includes(lang==='zh'?'照片下载失败':'Photo download failed'));
    assert.ok(modals[0].content.includes(lang==='zh'?'合法域名':'domain'));
  }
});

test('mobile preview cell markers and absolute image positions agree in every product row',()=>{
  const requested=[['318B-7','2.0L'],['318B-6','2.0L'],['319-348','2.0L'],['319-347','1.6L'],['319-347','2.0L'],['318A-126','1.2L'],['319-255','1.6L']];
  const items=requested.map(([code,capacity])=>{const p=catalogue.products.find(p=>p.code===code);assert.ok(p,code);return {...p,quantity:1,offer:p.offers.find(o=>o.id===capacity)};});
  const photos=items.map(p=>new Uint8Array(fs.readFileSync(photoFile(photoResources[p.productId]))));
  const files=entries(workbook(items,photos,'zh')),drawing=files.get('xl/drawings/drawing1.xml').toString(),sheet=files.get('xl/worksheets/sheet1.xml').toString();
  const rowHeights=[...sheet.matchAll(/<row r="\d+" ht="([\d.]+)"/g)].map(m=>Number(m[1])*12700);
  const anchors=[...drawing.matchAll(/<xdr:twoCellAnchor[^>]*>(.*?)<\/xdr:twoCellAnchor>/g)];assert.equal(anchors.length,items.length);
  const names=new Set();let previousBottom=0;
  anchors.forEach(([_,anchor],index)=>{
    const from=anchor.match(/<xdr:from>(.*?)<\/xdr:from>/)[1],to=anchor.match(/<xdr:to>(.*?)<\/xdr:to>/)[1];
    const value=(block,tag)=>Number(block.match(new RegExp('<xdr:'+tag+'>(\\d+)</xdr:'+tag+'>'))[1]);
    assert.equal(value(from,'row'),index+1);assert.equal(value(to,'row'),index+1);assert.equal(value(from,'col'),0);assert.equal(value(to,'col'),0);
    const [,x,y]=anchor.match(/<a:off x="(\d+)" y="(\d+)"/),[,width,height]=anchor.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
    assert.equal(Number(x),value(from,'colOff'));assert.equal(Number(y),rowHeights.slice(0,index+1).reduce((a,b)=>a+b,0)+value(from,'rowOff'));
    assert.equal(Number(width),value(to,'colOff')-value(from,'colOff'));assert.equal(Number(height),value(to,'rowOff')-value(from,'rowOff'));
    assert.ok(value(to,'rowOff')<rowHeights[index+1]);assert.ok(Number(y)>previousBottom);previousBottom=Number(y)+Number(height);
    names.add(anchor.match(/<xdr:cNvPr[^>]* name="([^"]+)"/)[1]);
  });assert.equal(names.size,items.length);
});

test('continuous PDF embeds a font and photos, uses one page and opens at full width',()=>{
  const items=selected(),photos=items.map(p=>new Uint8Array(fs.readFileSync(photoFile(photoResources[p.productId]))));
  const bytes=Buffer.from(createPdf(items,photos,'zh')),content=bytes.toString('latin1');
  assert.ok(content.startsWith('%PDF-1.6'));assert.equal((content.match(/\/Type \/Page\b/g)||[]).length,1);assert.match(content,/\/Count 1\b/);assert.match(content,/\/OpenAction \[\d+ 0 R \/FitH /);
  assert.match(content,/\/FontFile2 \d+ 0 R/);assert.match(content,/\/ToUnicode \d+ 0 R/);assert.equal((content.match(/\/Subtype \/Image\b/g)||[]).length,1);
  const xref=Number(content.match(/startxref\n(\d+)\n%%EOF/)[1]);assert.equal(content.slice(xref,xref+4),'xref');
  const entries=content.slice(xref).match(/\d{10} 00000 n /g);for(const [i,entry] of entries.entries()){const offset=Number(entry.slice(0,10));assert.equal(content.slice(offset,offset+String(i+1).length+6),(i+1)+' 0 obj');}
  const font=require('../miniprogram/data/pdf-font'),characters=new Map(Object.entries(font.glyphs).map(([code,glyph])=>[glyph[0],String.fromCodePoint(Number(code))]));
  for(const lang of ['en','zh']){
    const pdf=Buffer.from(createPdf(items,photos,lang)).toString('latin1');
    const labels=[...pdf.matchAll(/Tm <([A-F0-9]+)> Tj ET/g)].map(match=>match[1].match(/.{4}/g).map(hex=>characters.get(parseInt(hex,16))).join('')).join('\n');
    assert.ok(labels.includes(items[0].code));assert.ok(labels.includes(lang==='zh'?'数量（件）':'(cartons)'));assert.doesNotMatch(labels,/¥|RMB|单价|Unit price/);
  }
  assert.throws(()=>createPdf(items,[],'zh'),/Missing/);
});

test('a long PDF list stays on one continuous page within supported page-box coordinates',()=>{
  const row=selected()[0],photo=new Uint8Array(fs.readFileSync(photoFile(photoResources[row.productId])));
  const items=Array.from({length:121},()=>({...row,quantity:999999}));
  const content=Buffer.from(createPdf(items,items.map(()=>photo),'en')).toString('latin1');
  assert.equal((content.match(/\/Type \/Page\b/g)||[]).length,1);const box=content.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\] \/UserUnit (\d+)/);
  assert.ok(Number(box[2])<=14400);assert.ok(Number(box[3])>1);assert.ok(Number(box[2])*Number(box[3])>14000);
});

test('native PDF export uses the same downloaded JPEGs and opens as a shareable PDF',async()=>{
  const items=selected(),state=nativeMocks();const file=await exporter.createSelectionFile(items,'zh',undefined,'pdf');
  assert.match(file,/Hobby-Lobby-Selection-\d+\.pdf$/);assert.equal(state.downloads.length,1);
  const output=state.writes.find(o=>o.filePath.endsWith('.pdf'));assert.ok(Buffer.from(output.data).toString('ascii',0,8).startsWith('%PDF-1.6'));
  await exporter.openFile(file);assert.equal(state.opens[0].fileType,'pdf');assert.equal(state.opens[0].showMenu,true);
  await assert.rejects(exporter.createSelectionFile(items,'zh',undefined,'other'),/Unsupported/);
});

test('basket defaults to continuous PDF, keeps Excel separate and invalidates both after quantity edits',async()=>{
  selected();const created=[],opened=[];let config;
  Object.assign(global.wx,{setTabBarItem(){},showLoading(){},hideLoading(){},showModal(){},showToast(){}});
  const file=path.resolve(__dirname,'../miniprogram/pages/basket/index.js'),original=createRequire(file);
  vm.runInNewContext(fs.readFileSync(file,'utf8'),{require:name=>name==='../../utils/export-selection'?{async createSelectionFile(items,lang,progress,format){created.push({items,format});return '/saved/selection.'+format;},async openFile(file){opened.push(file);}}:original(name),wx,Page:c=>{config=c;},encodeURIComponent});
  config.data=JSON.parse(JSON.stringify(config.data));config.setData=function(data){Object.assign(this.data,data);};config.onShow();
  await config.exportSelection();assert.equal(created[0].format,'pdf');await config.exportSelection({currentTarget:{dataset:{format:'xlsx'}}});assert.equal(created[1].format,'xlsx');
  await config.exportSelection();assert.equal(created.length,2);assert.equal(opened.at(-1),'/saved/selection.pdf');
  const row=config.data.items[0];config.quantity({currentTarget:{dataset:{id:row.productId,capacity:row.offer.id}},detail:{value:'2'}});assert.equal(Object.keys(config.data.exportPaths).length,0);
  await config.exportSelection();assert.equal(created.length,3);assert.equal(created[2].items[0].quantity,2);
});
