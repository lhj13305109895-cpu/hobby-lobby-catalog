const catalogue=require('../../utils/catalogue');
const selection=require('../../utils/selection');
const language=require('../../utils/language');
const exporter=require('../../utils/export-selection');
Page({
  data:{items:[],exporting:false,exportPath:'',exportPaths:{},exportFormat:''},
  onShow(){language.setup(this);this.refresh();},
  refresh(){this.setData({items:selection.items(this.data.lang),exportPath:'',exportPaths:{}});},
  remove(e){if(this.data.exporting)return;selection.toggle(e.currentTarget.dataset.id,e.currentTarget.dataset.capacity);this.refresh();},
  quantity(e){
    if(this.data.exporting)return;
    const {id,capacity}=e.currentTarget.dataset;
    const value=e.detail.value;
    this.setData({items:this.data.items.map(p=>p.productId===id && p.offer.id===capacity?Object.assign({},p,{quantity:value,pieces:selection.validQuantity(value)?Number(value)*p.offer.pcsPerCarton:'—'}):p),exportPath:'',exportPaths:{}});
    if(selection.validQuantity(value))selection.setQuantity(id,capacity,value);
  },
  async exportSelection(e){
    if(this.data.exporting || !this.data.items.length)return;
    if(this.data.items.some(p=>!selection.validQuantity(p.quantity))){wx.showToast({title:this.data.t.quantityError,icon:'none'});return;}
    const format=e&&e.currentTarget&&e.currentTarget.dataset.format==='xlsx'?'xlsx':'pdf';
    this.setData({exporting:true,exportFormat:format});
    let filePath=this.data.exportPaths[format] || '';
    try {
      wx.showLoading({title:this.data.t.exporting,mask:true});
      if(!filePath){
        const items=this.data.items.map(p=>Object.assign({},p,{quantity:Number(p.quantity)}));
        filePath=await exporter.createSelectionFile(items,this.data.lang,(n,total)=>wx.showLoading({title:n+' / '+total,mask:true}),format);
        this.setData({exportPath:filePath,exportPaths:Object.assign({},this.data.exportPaths,{[format]:filePath})});
      }
      wx.hideLoading();
      await exporter.openFile(filePath);
    } catch(error) {
      wx.hideLoading();
      const detail=error.code==='PHOTO'?this.data.t.photoResourceError+' · '+error.message:this.data.t.retryExport;
      wx.showModal({title:filePath?this.data.t.exportReady:this.data.t.exportError,content:filePath?this.data.t.openError:detail,showCancel:false});
    } finally {this.setData({exporting:false});}
  },
  browse(){wx.switchTab({url:'/pages/catalogue/index'});},
  detail(e){wx.navigateTo({url:catalogue.detailUrl(e.currentTarget.dataset.id)});}
});
