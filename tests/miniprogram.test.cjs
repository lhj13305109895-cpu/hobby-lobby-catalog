const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.resolve(__dirname,'../miniprogram');
const catalogue=require('../miniprogram/utils/catalogue');const selection=require('../miniprogram/utils/selection');
let storage={};global.wx={getStorageSync:key=>storage[key],setStorageSync:(key,value)=>{storage[key]=value;},showToast(){}};
const websiteProducts=require('../src/data/products.json');
const localProducts=require('../src/miniprogram/data/local-products.json');
const miniConfig=require('../miniprogram/config');
const sourceProducts=new Map([...websiteProducts,...localProducts].map(product=>[product.productId,product]));
test('catalogue matches all visible source products and preserves public codes',()=>{
  const categories=require('../src/data/categories.json');
  const visible=[...sourceProducts.values()].filter(p=>p.visible&&categories.some(c=>c.categoryId===p.categoryId&&c.enabled&&c.visible));
  assert.equal(catalogue.products.length,visible.length);
  for(const [index,product] of catalogue.products.entries()){
    const source=visible[index];
    assert.equal(product.productId,source.productId);
    assert.equal(product.code,source.catalogueCode);
    assert.ok(product.offers.length);
    if(product.image.startsWith('/catalogue-photos/')){
      assert.equal(product.thumb,source.thumbnailImage);
      assert.equal(product.image,source.originalImage);
    }else{
      assert.ok(product.thumb.startsWith('https://'));
      assert.ok(product.image.startsWith('https://'));
    }
  }
});

test('products synchronized to the website appear once with images for the selected photo mode',()=>{
  const websiteById=new Map(websiteProducts.map(product=>[product.productId,product]));
  const shared=localProducts.filter(product=>websiteById.has(product.productId));
  assert.ok(shared.length>0);
  for(const local of shared){
    const website=websiteById.get(local.productId);
    const matches=catalogue.products.filter(product=>product.productId===local.productId);
    assert.equal(matches.length,1);
    const [product]=matches;
    assert.equal(product.code,website.catalogueCode);
    assert.deepEqual(product.capacities,website.capacities);
    assert.equal(product.categoryId,website.categoryId);
    if(miniConfig.exportPhotoSource==='website'){
      assert.ok(product.thumb.startsWith(miniConfig.assetOrigin+'/assets/miniprogram-thumbs/'));
      assert.equal(product.image,miniConfig.assetOrigin+website.originalImage);
    }else{
      assert.equal(product.thumb,local.thumbnailImage);
      assert.equal(product.image,local.originalImage);
    }
  }
});
test('numeric search is exact and respects model filters',()=>{for(const p of catalogue.products){const suffix=p.code.split('-').pop();const groups=catalogue.groups(p.model,suffix,'zh');assert.ok(groups.length);for(const g of groups)for(const found of g.items){assert.equal(found.model,p.model);assert.equal(found.code.split('-').pop(),suffix);}}assert.deepEqual(catalogue.groups('319','nonexistent-pattern-xyz','en'),[]);});
test('Shanghai month window clamps months, arrivals duplicate only into showcase, mixed sets last',()=>{assert.deepEqual(catalogue.monthWindow(Date.parse('2026-03-30T16:00:00Z')),{start:'2026-02-28',end:'2026-03-31'});const groups=catalogue.groups('','','zh',Date.parse('2026-11-11T04:00:00Z'));assert.equal(groups.at(-1).id,'mixed-set');if(groups[0].id==='latest-arrivals')for(const p of groups[0].items)assert.ok(groups.slice(1).some(g=>g.items.some(q=>q.productId===p.productId)));});
test('mini program capacities keep packing counts without website price fields',()=>{const packing={'318|1.2L':24,'318|2.0L':20,'319|1.6L':24,'319|2.0L':20,'322|1.0L':30,'322|1.3L':24};for(const p of catalogue.products){assert.deepEqual(p.offers.map(o=>o.id),p.capacities);for(const o of p.offers){assert.equal(Object.hasOwn(o,'price'),false);assert.equal(Object.hasOwn(o,'priceNumber'),false);assert.equal(o.pcsPerCarton,packing[p.model+'|'+o.id]);if(p.model==='322')assert.equal(o.cbm,undefined);}}const data=require('../miniprogram/data/catalogue');for(const model of Object.values(data.models))for(const offer of model.capacities){assert.equal(Object.hasOwn(offer,'price'),false);assert.equal(Object.hasOwn(offer,'priceNumber'),false);}});
test('capacity selection persists independently, removes only one and rejects invalid stored rows',()=>{storage={};const p=catalogue.products.find(p=>p.offers.length===2);const a=p.offers[0].id,b=p.offers[1].id;assert.equal(selection.toggle(p.productId,a),true);assert.equal(selection.toggle(p.productId,b),true);assert.equal(selection.items('zh').length,2);assert.equal(selection.offers(p).filter(o=>o.selected).length,2);selection.toggle(p.productId,a);assert.equal(selection.items('en')[0].offer.id,b);const text=selection.text('zh');assert.ok(text.includes(p.code));assert.ok(text.includes(b));assert.equal(selection.toggle(p.productId,'invalid'),false);storage['hobby-lobby-mini-selection-v1']=[null,{}, {productId:'deleted',capacity:b},{productId:p.productId,capacity:b},{productId:p.productId,capacity:b}];assert.equal(selection.read().length,1);});
test('page lifecycle, filters, basket and encoded share routes execute',()=>{let page;const routes=[];Object.assign(global.wx,{setTabBarItem(){},pageScrollTo(){},navigateTo:arg=>routes.push(arg.url),switchTab:arg=>routes.push(arg.url),previewImage(){},setClipboardData(){}});function load(name){page=null;const file=path.join(root,'pages',name,'index.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{require:require('node:module').createRequire(file),Page:config=>{page=config;},wx:global.wx,encodeURIComponent});page.data=JSON.parse(JSON.stringify(page.data));page.setData=function(data){Object.assign(this.data,data);};return page;}const c=load('catalogue');c.onShow();assert.ok(c.data.sections.flatMap(s=>s.items).length);c.filter({currentTarget:{dataset:{model:'318'}}});assert.ok(c.data.sections.flatMap(s=>s.items).every(p=>p.model==='318'));c.search({detail:{value:'nonexistent-pattern-xyz'}});assert.equal(c.data.sections.flatMap(s=>s.items).length,0);c.search({detail:{value:''}});const id=c.data.sections.flatMap(s=>s.items)[0].productId;const d=load('detail');d.onLoad({id});d.onShow();assert.equal(d.data.product.productId,id);assert.ok(d.onShareAppMessage().path.endsWith(encodeURIComponent(id)));d.onLoad({id:'missing'});d.onShow();assert.equal(d.data.missing,true);load('basket').onShow();load('contact').onShow();});
test('all pages and photo subpackages exist; main/individual packages stay below 2MB',()=>{
  const app=JSON.parse(fs.readFileSync(path.join(root,'app.json')));
  assert.equal(app.lazyCodeLoading,'requiredComponents');
  for(const route of app.pages){
    for(const ext of ['js','wxml','json'])assert.ok(fs.existsSync(path.join(root,route+'.'+ext)),route+'.'+ext);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,route+'.json'),'utf8')).usingComponents,{});
  }
  function size(dir,skip=new Set()){let bytes=0;for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(e.name))continue;const p=path.join(dir,e.name);bytes+=e.isDirectory()?size(p):fs.statSync(p).size;}return bytes;}
  const packages=app.subPackages||[];
  assert.ok(size(root,new Set(packages.map(p=>p.root)))<1500*1000,'main package below quality recommendation of 1.5 MB');
  for(const pack of packages){assert.ok(size(path.join(root,pack.root))<2*1024*1024);for(const page of pack.pages)for(const ext of ['js','json','wxml'])assert.ok(fs.existsSync(path.join(root,pack.root,page+'.'+ext)));}
  assert.ok(size(root)<20*1024*1024);
});

test('main-package media stays below 200 KB',()=>{
  let mediaBytes=0;
  const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'))),packages=new Set((app.subPackages||[]).map(p=>p.root));
  function inspect(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory()){if(directory===root&&packages.has(entry.name))continue;inspect(file);}else if(/\.(jpg|jpeg|png|svg|webp|gif|flac|m4a|ogg|ape|amr|wma|wav|mp3|mp4|aac|aiff|caf)$/i.test(entry.name))mediaBytes+=fs.statSync(file).size;}}
  inspect(root);assert.ok(mediaBytes<200*1024,'main-package media below 200 KB');
});

test('website photo mode leaves no product JPEGs in any package and keeps cumulative media below 200 KB',{
  skip:miniConfig.exportPhotoSource!=='website'
},()=>{
  let mediaBytes=0;
  function inspect(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())inspect(file);else if(/\.(jpg|jpeg|png|svg|webp|gif|flac|m4a|ogg|ape|amr|wma|wav|mp3|mp4|aac|aiff|caf)$/i.test(entry.name))mediaBytes+=fs.statSync(file).size;}}
  inspect(root);assert.ok(mediaBytes<200*1024,'all packages combined, not just the main package');
  assert.ok(!fs.existsSync(path.join(root,'catalogue-photos/images')));
  assert.ok(!fs.existsSync(path.join(root,'assets/catalogue-local')));
  assert.ok(!fs.readdirSync(root).some(name=>/^export-photos-\d+$/.test(name)));
  assert.ok(fs.existsSync(path.join(root,'assets/models/322-floral.jpg')));
});

test('phone thumbnails are bounded JPEGs and high-resolution detail URLs are preserved',()=>{
  const thumbs=require('../miniprogram/data/thumbnails'),config=require('../miniprogram/config');
  assert.equal(Object.keys(thumbs).length,catalogue.products.length);
  for(const p of catalogue.products){
    const thumb=thumbs[p.productId],original=sourceProducts.get(p.productId);
    const data=fs.readFileSync(path.join(thumb.local?root:path.resolve(__dirname,'../public'),thumb.path.slice(1)));assert.equal(data.length,thumb.bytes);
    if(thumb.local){
      assert.equal(thumb.path,original.thumbnailImage);
      assert.equal(data.readUInt16BE(0),0xffd8);
      assert.ok(thumb.width<=360&&thumb.height<=360);
      const detail=fs.readFileSync(path.join(root,p.image.slice(1)));
      assert.equal(detail.readUInt16BE(0),0xffd8);
      assert.ok(detail.length>data.length);
      assert.equal(p.image,original.originalImage);
      continue;
    }
    if(thumb.original){assert.equal(thumb.path,original.thumbnailImage||original.mainImage);assert.ok(data.length<128*1024);}
    else{assert.match(thumb.path,/^\/assets\/miniprogram-thumbs\/[a-f0-9]{24}\.jpg$/);assert.equal(data.readUInt16BE(0),0xffd8);assert.ok(data.length<64*1024);assert.ok(thumb.width<=360&&thumb.height<=360&&Math.max(thumb.width,thumb.height)===360);}
    if(config.optimizedThumbnails)assert.equal(new URL(p.thumb).pathname,thumb.path);
    const source=miniConfig.exportPhotoSource==='website'?(websiteProducts.find(source=>source.productId===p.productId)||original):original;
    assert.equal(new URL(p.image).pathname,source.originalImage || source.mainImage);
  }
});

test('detail opens from the catalogue and selection, previews its image and keeps legacy shared routes valid',()=>{
  const product=catalogue.products.find(p=>p.code==='318B-25');
  const route=(miniConfig.exportPhotoSource==='website'?'/pages/detail/index':'/catalogue-photos/detail/index')+'?id='+encodeURIComponent(product.productId);
  const navigated=[],previews=[];
  Object.assign(global.wx,{setTabBarItem(){},navigateTo:({url})=>navigated.push(url),previewImage:options=>previews.push(options)});
  function load(relative){
    let page;
    const file=path.join(root,relative+'.js');
    vm.runInNewContext(fs.readFileSync(file,'utf8'),{require:require('node:module').createRequire(file),Page:config=>{page=config;},wx:global.wx});
    page.setData=function(data){Object.assign(this.data,data);};
    return page;
  }
  const event={currentTarget:{dataset:{id:product.productId}}};
  load('pages/catalogue/index').detail(event);
  load('pages/basket/index').detail(event);
  assert.deepEqual(navigated,[route,route]);
  const detail=load('catalogue-photos/detail/index');
  detail.onLoad({id:product.productId});
  detail.onShow();
  detail.preview();
  assert.equal(previews[0].current,product.image);
  assert.equal(detail.onShareAppMessage().path,route);
  assert.ok(catalogue.groups('318-2.0L','25','zh').every(group=>group.items.every(item=>item.productId===product.productId)));
});
