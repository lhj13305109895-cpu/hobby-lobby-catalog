const source = require('../data/catalogue');
const config = require('../config');
const thumbnails = require('../data/thumbnails');
function asset(path, updatedAt) {
  if (!path) return '';
  const url = /^https:\/\//.test(path) ? path : config.assetOrigin + path;
  return path.indexOf('/assets/uploads/') >= 0 ? url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(Date.parse(updatedAt) || updatedAt || '1') : url;
}
function capacities(p) {
  if (p.model === '318' && p.capacities.indexOf('2.0L') >= 0) return [{id:'2.0L', packing:'20 pcs', pcsPerCarton:20, cbm:0.13, quoteReady:true}];
  return (source.models[p.model] || {capacities:[]}).capacities.filter(c => p.capacities.indexOf(c.id) >= 0);
}
const products = source.products.map((p, order) => Object.assign({}, p, {
  order, code:p.catalogueCode || p.slug, offers:capacities(p),
  thumb:asset(config.optimizedThumbnails && thumbnails[p.productId] ? thumbnails[p.productId].path : p.thumbnailImage || p.mainImage, p.updatedAt),
  image:asset(p.originalImage || p.mainImage, p.updatedAt)
}));
function shanghaiDay(time) { return new Date(time + 8*3600000).toISOString().slice(0,10); }
function monthWindow(now) {
  const today = shanghaiDay(now);
  const parts = today.split('-').map(Number);
  const first = new Date(Date.UTC(parts[0],parts[1]-2,1));
  first.setUTCDate(Math.min(parts[2],new Date(Date.UTC(parts[0],parts[1]-1,0)).getUTCDate()));
  return {start:first.toISOString().slice(0,10),end:today};
}
function groups(model, query, lang, now) {
  const window = monthWindow(now || Date.now());
  const term = String(query || '').trim().toLowerCase();
  const recent = p => { const date = Date.parse(p.createdAt); const day = date ? shanghaiDay(date) : ''; return day && day >= window.start && day <= window.end; };
  const filtered = products.filter(p => matchesModel(p,model) && (!term || (/^\d+$/.test(term) ? p.code.split('-').pop() === String(Number(term)) : [p.code,p.nameZh,p.nameEn].join(' ').toLowerCase().indexOf(term) >= 0)));
  const newest = (a,b) => (Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0) || b.order-a.order;
  const result = source.categories.map((c, index) => {
    const items = filtered.filter(p=>p.categoryId === c.categoryId).sort(newest);
    return {id:c.categoryId, name:lang === 'zh' ? c.nameZh : c.nameEn || c.nameZh, items, additions:items.filter(recent).length,index};
  }).filter(c=>c.items.length).sort((a,b)=> Number(a.id==='mixed-set')-Number(b.id==='mixed-set') || b.additions-a.additions || (a.additions ? newest(a.items[0],b.items[0]) : 0) || a.index-b.index);
  const arrivals = filtered.filter(recent).sort(newest);
  if(arrivals.length) result.unshift({id:'latest-arrivals',name:lang==='zh'?'最新上新':'New Arrivals',items:arrivals});
  return result;
}
function find(id) { return products.find(p=>p.productId===id); }
function matchesModel(p,model) { if(!model) return true; if(model==='318-1.2L') return p.model==='318' && p.capacities.indexOf('1.2L')>=0; if(model==='318-2.0L') return p.model==='318' && p.capacities.indexOf('2.0L')>=0; return p.model===model; }
function modelCards() { return [{id:'318-1.2L',label:'318 1.2L',image:'/assets/models/318-12.png'},{id:'318-2.0L',label:'318 2.0L',image:'/assets/models/318-20.png'},{id:'319',label:'319',image:'/assets/models/319-lemon.png'}]; }
function display(p,lang) { const c = source.categories.find(c=>c.categoryId===p.categoryId); return Object.assign({},p,{title:lang==='zh'?p.nameZh:p.nameEn || p.nameZh,series:lang==='zh'?c.nameZh:c.nameEn || c.nameZh}); }
module.exports = {products,groups,find,display,asset,monthWindow,modelCards};
