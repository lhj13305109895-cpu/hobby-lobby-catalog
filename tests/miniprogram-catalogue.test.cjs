const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const {createRequire}=require('node:module');
const catalogue=require('../miniprogram/utils/catalogue');
function page(){
 const scrolls=[],storage={};let result;
 const wx={getStorageSync:k=>storage[k],setStorageSync:(k,v)=>{storage[k]=v;},setTabBarItem(){},pageScrollTo:o=>scrolls.push(o)};
 global.wx=wx;
 const file=path.resolve(__dirname,'../miniprogram/pages/catalogue/index.js');
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{require:createRequire(file),Page:p=>{result=p;},wx,Date,Set,encodeURIComponent});
 result.data=JSON.parse(JSON.stringify(result.data));result.setData=function(data,callback){Object.assign(this.data,data);if(callback)callback();};
 result.onShow();return {page:result,scrolls,wx};
}
test('page scrolling continuously loads every series in order through mixed sets',()=>{
 const {page:p}=page();const expected=catalogue.groups('','','en');
 assert.equal(p.data.sections.flatMap(s=>s.items).length,24);
 const firstLimit=p.data.limit;p.onReachBottom();assert.equal(p.data.limit,firstLimit+32);
 let safety=0;while(p.data.hasMore && safety++<100)p.onReachBottom();
 assert.ok(safety<100);assert.deepEqual(Array.from(p.data.sections,s=>s.id),expected.map(s=>s.id));
 assert.equal(p.data.sections.at(-1).id,'mixed-set');
 for(let i=0;i<expected.length;i++)assert.deepEqual(Array.from(p.data.sections[i].items,p=>p.productId),expected[i].items.map(p=>p.productId));
 assert.ok(Buffer.byteLength(JSON.stringify(p.data))<1024*1024,'entire native page update stays within setData limit');
});
test('directory click scrolls to a rendered section rather than filtering other series out',()=>{
 const {page:p,scrolls}=page();const target=p.data.directory.at(-1).id;
 p.category({currentTarget:{dataset:{id:target}}});assert.ok(p.data.sections.some(s=>s.id===target));assert.equal(p.data.sections[0].id,p.data.directory[0].id);
 assert.equal(scrolls.at(-1).selector,'#series-'+target);
 p.filter({currentTarget:{dataset:{model:'318-2.0L'}}});assert.ok(p.data.sections.flatMap(s=>s.items).every(p=>p.capacities.includes('2.0L')));assert.equal(scrolls.at(-1).scrollTop,0);
});
test('scrolling across a series boundary updates the directory highlight',()=>{
 const {page:p}=page();const next=p.data.directory[1].id;
 p.createSelectorQuery=()=>({selectAll(){return this;},fields(){return this;},exec(callback){callback([[{top:-300,bottom:-20,dataset:{id:p.data.directory[0].id}},{top:20,bottom:400,dataset:{id:next}}]]);}});
 p.onPageScroll();assert.equal(p.data.category,next);assert.equal(p.data.directoryAnchor,'directory-'+next);
});
test('language changes page text and current-language label together',()=>{
 const {page:p}=page();assert.equal(p.data.lang,'en');assert.equal(p.data.t.catalogue,'Catalogue');p.switchLanguage();assert.equal(p.data.lang,'zh');assert.equal(p.data.t.catalogue,'花色目录');p.switchLanguage();assert.equal(p.data.lang,'en');
});

test('initial catalogue and filter changes hydrate only the first 24 cards',()=>{
 const {page:p}=page();assert.equal(p.data.limit,24);assert.equal(p.data.sections.flatMap(s=>s.items).length,24);assert.ok(p.data.hasMore);
 p.more();assert.ok(p.data.limit>24);p.filter({currentTarget:{dataset:{model:'319'}}});assert.equal(p.data.limit,24);assert.equal(p.data.sections.flatMap(s=>s.items).length,24);
});
test('mini program has only catalogue and selection tabs with retired 3D code removed',()=>{
 const root=path.resolve(__dirname,'../miniprogram');const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
 assert.deepEqual(app.tabBar.list.map(tab=>tab.pagePath),['pages/catalogue/index','pages/basket/index']);
 assert.ok(!app.pages.some(page=>page.includes('studio')));assert.ok(!app.subPackages.some(pack=>pack.root==='studio-source'));
 for(const retired of ['pages/studio/index.js','components/pot-viewer/index.js','utils/studio-resources.js','utils/studio-glb.js','vendor/draco_decoder.js','studio-source/pot.glb'])assert.equal(fs.existsSync(path.join(root,retired)),false,retired);
});
