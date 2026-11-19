const catalogue=require('../../utils/catalogue');
const selection=require('../../utils/selection');
const language=require('../../utils/language');
Page({
 data:{model:'',query:'',category:'',sections:[],directory:[],limit:24,total:0,hasMore:false,models:catalogue.modelCards(),directoryAnchor:''},
 onShow(){language.setup(this);this.refresh();},
 refresh(after){
  const groups=this._groups=catalogue.groups(this.data.model,this.data.query,this.data.lang);
  let remaining=this.data.limit;
  const sections=[];
  const selected=selection.read();
  for(const group of groups){
    if(remaining<=0)break;
    const items=group.items.slice(0,remaining).map(p=>({
      productId:p.productId,code:p.code,title:catalogue.display(p,this.data.lang).title,thumb:p.thumb,model:p.model,capacities:p.capacities,
      offers:p.offers.map(o=>({id:o.id,selected:selected.some(r=>r.productId===p.productId && r.capacity===o.id)}))
    }));
    remaining-=items.length;
    sections.push({id:group.id,name:group.name,total:group.items.length,items});
  }
  const category=groups.some(g=>g.id===this.data.category)?this.data.category:(groups[0]||{}).id||'';
  const total=new Set(groups.flatMap(g=>g.items.map(p=>p.productId))).size;
  this.setData({category,sections,directory:groups.map(g=>({id:g.id,name:g.name,count:g.items.length})),total,hasMore:groups.reduce((n,g)=>n+g.items.length,0)>this.data.limit},after);
 },
 switchLanguage(){language.toggle(this);this.refresh();},
 filter(e){this.setData({model:e.currentTarget.dataset.model,category:'',limit:24});this.refresh(()=>wx.pageScrollTo({scrollTop:0,duration:0}));},
 search(e){this.setData({query:e.detail.value,category:'',limit:24});this.refresh(()=>wx.pageScrollTo({scrollTop:0,duration:0}));},
 category(e){
  const id=e.currentTarget.dataset.id;let preceding=0;
  for(const group of this._groups||[]){if(group.id===id)break;preceding+=group.items.length;}
  this.setData({category:id,limit:Math.max(this.data.limit,preceding+24)});
  this.refresh(()=>wx.pageScrollTo({selector:'#series-'+id,duration:250}));
 },
 more(){if(!this.data.hasMore)return;this.setData({limit:this.data.limit+32});this.refresh();},
 onReachBottom(){this.more();},
 onPageScroll(){
  const now=Date.now();if(this._measuring || now-(this._lastMeasure||0)<120)return;
  this._measuring=true;this._lastMeasure=now;
  this.createSelectorQuery().selectAll('.series-section').fields({rect:true,dataset:true}).exec(result=>{
   this._measuring=false;const rects=result&&result[0]||[];
   const visible=rects.find(r=>r.top<=80 && r.bottom>80)||rects.find(r=>r.bottom>0);
   if(visible && visible.dataset.id!==this.data.category)this.setData({category:visible.dataset.id,directoryAnchor:'directory-'+visible.dataset.id});
  });
 },
 detail(e){wx.navigateTo({url:'/pages/detail/index?id='+encodeURIComponent(e.currentTarget.dataset.id)});},
 choose(e){selection.toggle(e.currentTarget.dataset.id,e.currentTarget.dataset.capacity);this.refresh();},
 onShareAppMessage(){return {title:'Hobby Lobby · Patterns, made yours',path:'/pages/catalogue/index'};}
});
