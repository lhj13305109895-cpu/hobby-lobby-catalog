const catalogue = require('./catalogue');
const selection = require('./selection');
const language = require('./language');

module.exports = () => ({
  data: { product: null, missing: false },
  onLoad(options) { this.id = options.id; },
  onShow() {
    language.setup(this);
    this.refresh();
  },
  refresh() {
    const product = catalogue.find(this.id);
    this.setData({
      missing: !product,
      product: product ? { ...catalogue.display(product, this.data.lang), offers: selection.offers(product) } : null,
    });
  },
  preview() {
    const image = this.data.product?.image;
    if (image) wx.previewImage({ current: image, urls: [image] });
  },
  choose(e) {
    selection.toggle(this.id, e.currentTarget.dataset.capacity);
    this.refresh();
  },
  basket() { wx.switchTab({ url: '/pages/basket/index' }); },
  onShareAppMessage() {
    const product = this.data.product;
    return product
      ? { title: product.code + ' · ' + product.title, path: catalogue.detailUrl(product.productId), imageUrl: product.thumb }
      : { title: 'Hobby Lobby', path: '/pages/catalogue/index' };
  },
});
