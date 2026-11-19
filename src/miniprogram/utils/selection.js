const catalogue = require('./catalogue');
const key = 'hobby-lobby-mini-selection-v1';
function read() {
  let stored; try { stored=wx.getStorageSync(key); } catch(e) { return []; }
  if(!Array.isArray(stored)) return [];
  const seen = {};
  return stored.filter(row=> { if(!row || typeof row !== 'object') return false; const p=catalogue.find(row.productId); const id=row.productId+'|'+row.capacity; if(!p || !p.offers.some(o=>o.id===row.capacity && o.quoteReady) || seen[id]) return false; seen[id]=true; return true; }).map(row=>({productId:row.productId,capacity:row.capacity,quantity:validQuantity(row.quantity) ? Number(row.quantity) : 1}));
}
function toggle(productId,capacity) {
  const p=catalogue.find(productId);
  if(!p || !p.offers.some(o=>o.id===capacity && o.quoteReady)) return false;
  const rows=read(); const index=rows.findIndex(r=>r.productId===productId && r.capacity===capacity);
  if(index>=0) rows.splice(index,1); else rows.push({productId,capacity});
  try { wx.setStorageSync(key,rows); return true; } catch(e) { wx.showToast({title:'Could not save / 保存失败',icon:'none'}); return false; }
}
function offers(p) { const rows=read(); return p.offers.map(o=>Object.assign({},o,{selected:rows.some(r=>r.productId===p.productId && r.capacity===o.id)})); }
function validQuantity(value) { return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value)>=1 && Number(value)<=999999; }
function setQuantity(productId,capacity,value) {
  if(!validQuantity(value)) return false;
  const rows=read(); const row=rows.find(r=>r.productId===productId && r.capacity===capacity);
  if(!row) return false;
  row.quantity=Number(value);
  try { wx.setStorageSync(key,rows); return true; } catch(e) { wx.showToast({title:'Could not save / 保存失败',icon:'none'}); return false; }
}
function items(lang) { return read().map(row=> { const p=catalogue.display(catalogue.find(row.productId),lang);const offer=p.offers.find(o=>o.id===row.capacity);return Object.assign({},p,{key:row.productId+'|'+row.capacity,quantity:row.quantity,pieces:row.quantity*offer.pcsPerCarton,offer}); }); }
function text(lang) { return ['Hobby Lobby · '+(lang==='zh'?'选款清单':'Pattern selection'), ...items(lang).map((p,i)=>`${i+1}. ${p.code} ${p.title}\n${p.series} | ${p.offer.id} | ${p.offer.packing} / carton`),lang==='zh'?'此清单为选款参考，非已提交订单。':'Selection reference only; no order has been placed.'].join('\n\n'); }
module.exports={read,toggle,offers,items,text,setQuantity,validQuantity};
