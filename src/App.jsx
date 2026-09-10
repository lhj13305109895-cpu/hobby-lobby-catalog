import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import productsData from "./data/products.json";
import categoriesData from "./data/categories.json";
import {
  ArrowDown, ArrowLeft, ArrowRight, Check, Heart,
  DownloadSimple, FacebookLogo, InstagramLogo, MagnifyingGlassPlus, PaintBrush,
  ShieldCheck, ShoppingCart, SquaresFour, Trash, WechatLogo, WhatsappLogo, X,
} from "@phosphor-icons/react";

const AdminApp = lazy(() => import("./admin/AdminApp.jsx").then((module) => ({ default: module.AdminApp })));
const PatternStudio = lazy(() => import("./PatternStudio.tsx").then((module) => ({ default: module.PotStudio })));

const versionUploadedAsset = (source, updatedAt) => {
  if (!source?.startsWith("/assets/uploads/")) return source;
  const version = Date.parse(updatedAt) || updatedAt || "1";
  return `${source}${source.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
};

const categories = [...categoriesData]
  .filter((category) => category.enabled && category.visible)
  .sort((a, b) => a.sortOrder - b.sortOrder);
const categoryById = new Map(categoriesData.map((category) => [category.categoryId, category]));
const categoryByNameZh = new Map(categoriesData.map((category) => [category.nameZh, category]));
const catalogue = [...productsData]
  .filter((product) => product.visible && categoryById.get(product.categoryId)?.enabled && categoryById.get(product.categoryId)?.visible)
  .sort((a, b) => (categoryById.get(a.categoryId)?.sortOrder || 9999) - (categoryById.get(b.categoryId)?.sortOrder || 9999)
    || Number(b.pinned) - Number(a.pinned) || a.sortOrder - b.sortOrder)
  .map((product) => ({
    ...product,
    id: product.productId,
    no: Number(product.slug.split("-").at(-1)),
    name: product.nameZh,
    nameEn: product.nameEn,
    family: categoryById.get(product.categoryId)?.nameZh || "待分类",
    body: product.bodyType,
    image: versionUploadedAsset(product.originalImage, product.updatedAt),
    displayImage: versionUploadedAsset(product.mainImage, product.updatedAt),
    thumb: versionUploadedAsset(product.thumbnailImage, product.updatedAt),
  }));

const heroShowcasePatterns = catalogue
  .filter((product) => product.bodyType === "白色壶身")
  .sort((a, b) => a.sortOrder - b.sortOrder)
  .slice(-4);
const heroFeaturedPattern = catalogue.find((product) => product.no === 54) || heroShowcasePatterns[0] || catalogue[0];

const filters = ["全部花色", "白色壶身", "316不锈钢", "混色套装"];

const capacities = [
  { id: "1.6L", price: "¥29 RMB", priceNumber: 29, packing: "24 pcs", pcsPerCarton: 24, cbm: 0.14 },
  { id: "2.0L", price: "¥31 RMB", priceNumber: 31, packing: "20 pcs", pcsPerCarton: 20, cbm: 0.15 },
];

const languageOptions = [
  { id: "en", label: "English" },
  { id: "zh", label: "中文" },
  { id: "ar", label: "العربية" },
];

const localize = (language, zh, en, ar) => {
  if (language === "zh") return zh;
  if (language === "ar") return ar;
  return en;
};

const quoteNumberKey = "hobby-lobby-319-quote-number";
const quoteNumberPrefix = "XSD202607";
const quoteNumberStart = 3;
const siteOrigin = "https://hobby-lobby-catalog.pages.dev";
const productUrl = (product) => `${siteOrigin}/products/${product.slug}/`;

const copy = {
  zh: {
    navGallery: "花色目录",
    navSteel: "不锈钢款",
    navSpecs: "型号价格",
    headerCta: "查看全部花色",
    heroEyebrow: "花色定制 · 型号319",
    heroTitleTop: "花色，",
    heroTitleBottom: "由你定义",
    heroLead: `${catalogue.length} 款现有花色随心选择，也支持根据图片、配色或品牌需求定制专属图案。`,
    browseAll: "探索花色",
    viewSpecs: "了解定制",
    heroNotePatterns: "真实产品花色自动滚动展示",
    heroNoteModel: "现有花色可选 · 支持来图定制",
    heroCarouselLabel: "真实产品花色滚动展示",
    previousPatterns: "查看前面的花色",
    nextPatterns: "查看更多花色",
    stripModel: "型号",
    stripPatterns: "花色",
    stripPatternCount: `${catalogue.length}款`,
    galleryEyebrow: "完整花色库",
    galleryTitle: "按系列查看花色",
    galleryText: "每张卡片都是今天提供的新图。单击图片直接放大查看，下面可选择容量和箱数。",
    directory: "系列目录",
    itemUnit: "款",
    patternUnit: "款花色",
    zoomHint: "单击放大",
    currentShowing: "当前显示",
    currentSuffix: "款花色。单击任意图片可查看大图，按 Esc 或点击背景关闭。",
    specsEyebrow: "型号319",
    specsTitle: "价格与规格",
    specOneTitle: "1.6L 容量",
    specOneText: "型号319，目录价 ¥29 RMB，24 pcs/箱，CBM 0.14。",
    specTwoTitle: "2.0L 容量",
    specTwoText: "型号319，目录价 ¥31 RMB，20 pcs/箱，CBM 0.15。",
    specThreeTitle: "花色分类",
    specThreeText: "花卉、几何、水果、文字、不锈钢与素色光板系列。",
    steelEyebrow: "316不锈钢系列",
    steelTitle: <>黑盖钢色款，<br />单独成系列展示。</>,
    steelText: "今天的不锈钢款已经整理成独立系列，客人可以直接从筛选里只看钢色壶身。",
    steelLink: "只看不锈钢花色",
    footerText: "Hobby Lobby Ask for More · 型号319产品花色目录",
    languageLabel: "语言",
    modelLabel: "型号",
    filterLabels: {
      "全部花色": "全部花色",
      "白色壶身": "白色壶身",
      "316不锈钢": "316不锈钢",
      "混色套装": "混色套装",
    },
    familyLabels: {
      "潮流字母系列": "潮流字母系列",
      "316不锈钢花卉系列": "316不锈钢花卉系列",
      "民族几何系列": "民族几何系列",
      "花卉植物系列": "花卉植物系列",
      "水果清新系列": "水果清新系列",
      "中东文字系列": "中东文字系列",
      "素色光板系列": "素色光板系列",
      "混色套装系列": "混色套装系列",
      "阿拉伯茶饮系列": "阿拉伯茶饮系列",
      "斋月祝福系列": "斋月祝福系列",
      "花鸟雅集系列": "花鸟雅集系列",
    },
    bodyLabels: {
      "白色壶身": "白色壶身",
      "316不锈钢": "316不锈钢",
      "混色可选": "混色可选",
    },
    benefits: [
      { icon: ShieldCheck, title: "316内胆", text: "型号319，316不锈钢内胆，适合日常保温使用。" },
      { icon: PaintBrush, title: "花色专属定制", text: "现有花色可直接选款，也支持根据图片、配色或品牌需求定制。" },
      { icon: MagnifyingGlassPlus, title: "单击放大", text: "单击任意图片即可看大图，滚轮可继续放大查看细节。" },
      { icon: Heart, title: "两种容量", text: "1.6L ¥29 RMB，2.0L ¥31 RMB，价格清楚直接。" },
    ],
  },
  en: {
    navGallery: "Pattern Catalogue",
    navSteel: "Stainless Steel",
    navSpecs: "Prices",
    headerCta: "View All Patterns",
    heroEyebrow: "Pattern Customization · Model 319",
    heroTitleTop: "Patterns,",
    heroTitleBottom: "Defined by You",
    heroLead: `Choose from ${catalogue.length} ready patterns, or create an exclusive design from your artwork, colors, and brand identity.`,
    browseAll: "Explore Patterns",
    viewSpecs: "Customization",
    heroNotePatterns: "Real catalogue products in motion",
    heroNoteModel: "Ready patterns · Custom artwork supported",
    heroCarouselLabel: "Scrolling showcase of real catalogue products",
    previousPatterns: "View previous patterns",
    nextPatterns: "View more patterns",
    stripModel: "Model",
    stripPatterns: "Patterns",
    stripPatternCount: `${catalogue.length} styles`,
    galleryEyebrow: "Complete Pattern Library",
    galleryTitle: "Browse by series",
    galleryText: "All cards use the latest product images. Click an image to enlarge it, then select capacity and carton quantity below.",
    directory: "Series",
    itemUnit: "styles",
    patternUnit: "styles",
    zoomHint: "Click to enlarge",
    currentShowing: "Showing",
    currentSuffix: "patterns. Click any image to view larger; press Esc or click the backdrop to close.",
    specsEyebrow: "Model 319",
    specsTitle: "Price & Specifications",
    specOneTitle: "1.6L Capacity",
    specOneText: "Model 319, catalogue price ¥29 RMB, 24 pcs/carton, CBM 0.14.",
    specTwoTitle: "2.0L Capacity",
    specTwoText: "Model 319, catalogue price ¥31 RMB, 20 pcs/carton, CBM 0.15.",
    specThreeTitle: "Pattern Categories",
    specThreeText: "Floral, geometric, fruit, lettering, stainless steel, and plain-body series.",
    steelEyebrow: "316 Stainless Steel Series",
    steelTitle: <>Black-lid stainless finish,<br />shown as its own series.</>,
    steelText: "The stainless-steel options are grouped separately, so buyers can filter directly to the steel body styles.",
    steelLink: "View stainless patterns only",
    footerText: "Hobby Lobby Ask for More · Model 319 Pattern Catalogue",
    languageLabel: "Language",
    modelLabel: "Model",
    filterLabels: {
      "全部花色": "All Patterns",
      "白色壶身": "White Body",
      "316不锈钢": "316 Stainless Steel",
      "混色套装": "Mixed Sets",
    },
    familyLabels: {
      "潮流字母系列": "Trendy Lettering Series",
      "316不锈钢花卉系列": "316 Stainless Floral Series",
      "民族几何系列": "Ethnic Geometric Series",
      "花卉植物系列": "Floral Botanical Series",
      "水果清新系列": "Fresh Fruit Series",
      "中东文字系列": "Middle Eastern Lettering Series",
      "素色光板系列": "Plain Body Series",
      "混色套装系列": "Mixed Set Series",
      "阿拉伯茶饮系列": "Arabic Tea & Coffee Series",
      "斋月祝福系列": "Ramadan Blessings Series",
      "花鸟雅集系列": "Bird & Bloom Series",
    },
    bodyLabels: {
      "白色壶身": "White body",
      "316不锈钢": "316 stainless steel",
      "混色可选": "Mixed colors available",
    },
    benefits: [
      { icon: ShieldCheck, title: "316 inner liner", text: "Model 319 uses a 316 stainless-steel inner liner for everyday thermal use." },
      { icon: PaintBrush, title: "Custom pattern service", text: "Choose existing patterns or customize artwork, colors, and branded designs." },
      { icon: MagnifyingGlassPlus, title: "Click to enlarge", text: "Click any image for a larger preview, then use the mouse wheel to zoom in." },
      { icon: Heart, title: "Two capacities", text: "1.6L ¥29 RMB and 2.0L ¥31 RMB, with clear catalogue pricing." },
    ],
  },
  ar: {
    navGallery: "كتالوج التصاميم",
    navSteel: "ستانلس ستيل",
    navSpecs: "الأسعار",
    headerCta: "عرض كل التصاميم",
    heroEyebrow: "تخصيص التصاميم · موديل 319",
    heroTitleTop: "تصاميمك،",
    heroTitleBottom: "كما تريد",
    heroLead: `اختر من بين ${catalogue.length} تصميماً جاهزاً، أو أنشئ تصميماً خاصاً من صورك وألوانك وهوية علامتك التجارية.`,
    browseAll: "استكشف التصاميم",
    viewSpecs: "خدمة التخصيص",
    heroNotePatterns: "عرض متحرك لمنتجات الكتالوج الحقيقية",
    heroNoteModel: "تصاميم جاهزة · ندعم تصاميم العملاء",
    heroCarouselLabel: "عرض متحرك لمنتجات الكتالوج الحقيقية",
    previousPatterns: "التصاميم السابقة",
    nextPatterns: "المزيد من التصاميم",
    stripModel: "الموديل",
    stripPatterns: "التصاميم",
    stripPatternCount: `${catalogue.length} تصميماً`,
    galleryEyebrow: "مكتبة التصاميم الكاملة",
    galleryTitle: "تصفح حسب المجموعة",
    galleryText: "تعرض كل بطاقة أحدث صور المنتجات. اضغط على الصورة لتكبيرها، ثم اختر السعة وعدد الكراتين.",
    directory: "دليل المجموعات",
    itemUnit: "منتج",
    patternUnit: "تصميماً",
    zoomHint: "اضغط للتكبير",
    currentShowing: "نعرض حالياً",
    currentSuffix: "تصميماً. اضغط على أي صورة لعرضها بحجم أكبر؛ واضغط Esc أو الخلفية للإغلاق.",
    specsEyebrow: "موديل 319",
    specsTitle: "الأسعار والمواصفات",
    specOneTitle: "سعة 1.6 لتر",
    specOneText: "موديل 319، سعر الكتالوج ¥29 RMB، عدد 24 قطعة/كرتون، CBM 0.14.",
    specTwoTitle: "سعة 2.0 لتر",
    specTwoText: "موديل 319، سعر الكتالوج ¥31 RMB، عدد 20 قطعة/كرتون، CBM 0.15.",
    specThreeTitle: "فئات التصاميم",
    specThreeText: "زهور، أشكال هندسية، فواكه، حروف، ستانلس ستيل، وألوان سادة.",
    steelEyebrow: "مجموعة ستانلس ستيل 316",
    steelTitle: <>هيكل ستانلس بغطاء أسود،<br />ضمن مجموعة مستقلة.</>,
    steelText: "تم تجميع خيارات الستانلس ستيل بشكل مستقل لتسهيل عرض تصاميم الهيكل المعدني فقط.",
    steelLink: "عرض تصاميم الستانلس فقط",
    footerText: "Hobby Lobby Ask for More · كتالوج تصاميم موديل 319",
    languageLabel: "اللغة",
    modelLabel: "الموديل",
    filterLabels: {
      "全部花色": "كل التصاميم",
      "白色壶身": "هيكل أبيض",
      "316不锈钢": "ستانلس ستيل 316",
      "混色套装": "أطقم مختلطة",
    },
    familyLabels: {
      "潮流字母系列": "مجموعة الحروف العصرية",
      "316不锈钢花卉系列": "مجموعة زهور ستانلس ستيل 316",
      "民族几何系列": "مجموعة الزخارف الهندسية",
      "花卉植物系列": "مجموعة الزهور والنباتات",
      "柔彩花园系列": "مجموعة الحديقة الناعمة",
      "水果清新系列": "مجموعة الفواكه المنعشة",
      "中东文字系列": "مجموعة الخط العربي",
      "素色光板系列": "مجموعة الألوان السادة",
      "瓷韵华纹系列": "مجموعة الزخارف الخزفية",
      "民俗繁花系列": "مجموعة الزهور التراثية",
      "东方意境系列": "مجموعة المشاهد الشرقية",
      "极简艺术系列": "مجموعة الفن البسيط",
      "欢乐童趣系列": "مجموعة المرح",
      "田园萌兔系列": "مجموعة أرانب الريف",
      "咖啡美食系列": "مجموعة القهوة والطعام",
      "丝路故事系列": "مجموعة حكايات طريق الحرير",
      "混色套装系列": "مجموعة الأطقم المختلطة",
      "阿拉伯茶饮系列": "مجموعة الضيافة العربية",
      "斋月祝福系列": "مجموعة تهاني رمضان",
      "花鸟雅集系列": "مجموعة الطيور والزهور",
    },
    bodyLabels: {
      "白色壶身": "هيكل أبيض",
      "316不锈钢": "ستانلس ستيل 316",
      "混色可选": "ألوان مختلطة متاحة",
    },
    benefits: [
      { icon: ShieldCheck, title: "بطانة داخلية 316", text: "يستخدم موديل 319 بطانة داخلية من ستانلس ستيل 316 للحفظ الحراري اليومي." },
      { icon: PaintBrush, title: "خدمة تصميم مخصص", text: "اختر تصميماً جاهزاً أو خصص الصور والألوان وهوية علامتك التجارية." },
      { icon: MagnifyingGlassPlus, title: "اضغط للتكبير", text: "اضغط على أي صورة للمعاينة الكبيرة، ثم استخدم عجلة الفأرة لمشاهدة التفاصيل." },
      { icon: Heart, title: "سعتان", text: "1.6 لتر بسعر ¥29 RMB و2.0 لتر بسعر ¥31 RMB، بأسعار كتالوج واضحة." },
    ],
  },
};

function productStructuredData(product) {
  const category = categoryById.get(product.categoryId);
  const imageUrls = [product.mainImage, product.originalImage, ...(product.detailImages || [])]
    .filter(Boolean)
    .map((source) => new URL(source, siteOrigin).href);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl(product)}#product`,
    name: `${product.nameZh}保温壶（${product.slug}）`,
    alternateName: product.nameEn || undefined,
    description: product.descriptionZh || `${product.nameZh}花色型号319保温壶，提供1.6L和2.0L两种容量。`,
    image: [...new Set(imageUrls)],
    sku: product.slug,
    mpn: product.slug,
    brand: { "@type": "Brand", name: "Hobby Lobby Ask for More" },
    category: category?.nameZh || "保温壶",
    material: product.bodyType,
    offers: {
      "@type": "AggregateOffer",
      url: productUrl(product),
      priceCurrency: "CNY",
      lowPrice: "29",
      highPrice: "31",
      offerCount: 2,
      availability: "https://schema.org/InStock",
    },
  };
}

function ProductDetail({ product }) {
  const [language, setLanguage] = useState("en");
  const t = copy[language];
  const category = categoryById.get(product.categoryId);
  const englishFamily = category?.nameEn || "Pattern Series";
  const arabicFamily = copy.ar.familyLabels[category?.nameZh] || englishFamily;
  const englishName = product.nameEn || `${englishFamily.replace(" Series", "")} · ${product.slug}`;
  const isolatedSlug = `\u2066${product.slug}\u2069`;
  const name = localize(language, product.nameZh, englishName, `${arabicFamily} · ${isolatedSlug}`);
  const description = localize(
    language,
    product.descriptionZh || `${product.nameZh}花色型号319保温壶，提供1.6L和2.0L两种容量。`,
    product.descriptionEn || `Model 319 thermal pot in the ${englishName} pattern, available in 1.6L and 2.0L.`,
    `ترمس حراري موديل 319 من ${arabicFamily} برقم ${isolatedSlug}، متوفر بسعتي 1.6 و2.0 لتر.`,
  );
  const imageAlt = localize(language, product.imageAltZh, product.imageAltEn || `${englishName} Model 319 thermal pot`, `ترمس حراري موديل 319 من ${arabicFamily} برقم ${product.slug}`);
  const structuredData = productStructuredData(product);

  useEffect(() => {
    document.title = localize(language, `${product.slug} ${product.nameZh}保温壶 | Hobby Lobby`, `${englishName} Thermal Pot | Hobby Lobby`, `${product.slug} ترمس من ${arabicFamily} | Hobby Lobby`);
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) descriptionMeta.setAttribute("content", description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", productUrl(product));
    let jsonLd = document.getElementById("product-structured-data");
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.id = "product-structured-data";
      jsonLd.type = "application/ld+json";
      document.head.append(jsonLd);
    }
    jsonLd.textContent = JSON.stringify(structuredData);
  }, [description, language, product]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  return (
    <div className="site-shell product-page-shell" lang={language} dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="topbar product-topbar">
        <a className="brand-link" href="/" aria-label="Hobby Lobby home"><img src="/assets/brand-logo.webp" alt="Hobby Lobby Ask for More" width="256" height="256" /></a>
        <nav aria-label={localize(language, "商品导航", "Product navigation", "تنقل المنتجات")}><a href="/#gallery">{localize(language, "全部花色", "All patterns", "كل التصاميم")}</a><a href="/studio/">{localize(language, "在线试样", "Pattern studio", "استوديو التصميم")}</a><a href="/#specifications">{localize(language, "价格规格", "Prices", "الأسعار")}</a></nav>
        <div className="language-switcher" role="group" aria-label={t.languageLabel}>
          {languageOptions.map((option) => <button type="button" key={option.id} className={language === option.id ? "active" : ""} onClick={() => setLanguage(option.id)} aria-pressed={language === option.id}>{option.label}</button>)}
        </div>
        <a className="button button-primary header-cta" href="/#gallery">{localize(language, "浏览目录", "Browse catalogue", "تصفح الكتالوج")}</a>
      </header>
      <main className="product-detail-page">
        <nav className="product-breadcrumb" aria-label={localize(language, "面包屑", "Breadcrumb", "مسار التنقل")}><a href="/">{localize(language, "首页", "Home", "الرئيسية")}</a><span>/</span><a href="/#gallery">{localize(language, "花色目录", "Patterns", "التصاميم")}</a><span>/</span><strong>{product.slug}</strong></nav>
        <article className="product-detail-card">
          <figure className="product-detail-media"><img src={product.displayImage} alt={imageAlt} width="1600" height="1600" fetchPriority="high" decoding="async" /></figure>
          <div className="product-detail-copy">
            <p className="eyebrow">MODEL 319 · {product.slug}</p>
            <h1>{name}</h1>
            {language === "zh" && product.nameEn && <p className="product-name-en">{product.nameEn}</p>}
            <p className="product-description">{description}</p>
            <dl className="product-attributes">
              <div><dt>{localize(language, "系列", "Series", "المجموعة")}</dt><dd>{language === "zh" ? category?.nameZh : (language === "ar" ? (t.familyLabels[category?.nameZh] || category?.nameEn || category?.nameZh) : (category?.nameEn || category?.nameZh))}</dd></div>
              <div><dt>{localize(language, "壶身", "Body", "الهيكل")}</dt><dd>{t.bodyLabels[product.bodyType] || product.bodyType}</dd></div>
              <div><dt>{localize(language, "货号", "SKU", "رقم الصنف")}</dt><dd>{product.slug}</dd></div>
            </dl>
            <div className="product-offers" aria-label={localize(language, "容量和价格", "Capacities and prices", "السعات والأسعار")}>
              {capacities.map((capacity) => <div key={capacity.id}><strong><bdi dir="ltr">{capacity.id}</bdi></strong><span><bdi dir="ltr">{capacity.price}</bdi></span><small><bdi dir="ltr">{capacity.packing}</bdi> / {localize(language, "箱", "carton", "كرتون")}</small></div>)}
            </div>
            <a className="button button-primary product-back" href="/#gallery"><ArrowLeft weight="bold" /> {localize(language, "返回全部花色", "Back to all patterns", "العودة إلى كل التصاميم")}</a>
          </div>
        </article>
        <section className="product-index-copy">
          <p className="eyebrow">{localize(language, "型号319花色", "Model 319 pattern", "تصميم موديل 319")}</p>
          <h2>{localize(language, `${product.nameZh}保温壶产品图`, `${englishName} thermal pot image`, `صورة ترمس ${isolatedSlug} من ${arabicFamily}`)}</h2>
          <p>{localize(language, `本页展示 ${product.slug} ${product.nameZh}花色的清晰产品图片、容量、价格和装箱信息，支持从现有花色中选款，也支持来图定制。`, `This page shows clear product imagery, capacities, pricing, and carton details for ${product.slug}. Existing patterns and custom artwork are supported.`, `تعرض هذه الصفحة صور المنتج والسعات والأسعار ومعلومات التعبئة للصنف ${isolatedSlug}. يمكنك اختيار تصميم جاهز أو إرسال تصميمك الخاص.`)}</p>
        </section>
      </main>
      <footer><img src="/assets/brand-logo.webp" alt="" width="256" height="256" loading="lazy" /><p>Hobby Lobby Ask for More · {product.slug}</p><a href="/#gallery">{localize(language, "查看全部花色", "View all patterns", "عرض كل التصاميم")} <ArrowRight weight="bold" /></a></footer>
    </div>
  );
}

function Storefront() {
  const [language, setLanguage] = useState("en");
  const [filter, setFilter] = useState("全部花色");
  const [selectedId, setSelectedId] = useState("pattern-01");
  const [selectedCapacities, setSelectedCapacities] = useState({});
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [exportStatus, setExportStatus] = useState("");
  const [quotePreview, setQuotePreview] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [seriesMenuOpen, setSeriesMenuOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [visibleSeriesCount, setVisibleSeriesCount] = useState(1);
  const heroCarouselRef = useRef(null);
  const seriesLoaderRef = useRef(null);
  const t = copy[language];
  const filteredPatterns = useMemo(() => (
    filter === "全部花色"
      ? catalogue
      : catalogue.filter((pattern) => pattern.body === filter || pattern.family === `${filter}系列`)
  ), [filter]);
  const selected = useMemo(() => (
    catalogue.find((pattern) => pattern.id === selectedId) || catalogue[0]
  ), [selectedId]);
  const expanded = useMemo(() => (
    catalogue.find((pattern) => pattern.id === expandedId) || null
  ), [expandedId]);
  const groupedPatterns = useMemo(() => Object.entries(filteredPatterns.reduce((groups, pattern) => {
    (groups[pattern.family] ||= []).push(pattern);
    return groups;
  }, {})), [filteredPatterns]);
  const visibleGroupedPatterns = groupedPatterns.slice(0, visibleSeriesCount);
  const hasMoreSeries = visibleSeriesCount < groupedPatterns.length;
  const selectedEntries = useMemo(() => (
    Object.entries(selectedCapacities).flatMap(([patternId, capacityIds]) => {
      const pattern = catalogue.find((item) => item.id === patternId);
      if (!pattern) return [];
      return capacityIds.map((capacityId) => ({
        pattern,
        capacity: capacities.find((item) => item.id === capacityId) || capacities[0],
        quantity: selectedQuantities[`${patternId}-${capacityId}`] || 1,
      }));
    })
  ), [selectedCapacities, selectedQuantities]);
  const totalCartons = selectedEntries.reduce((sum, item) => sum + item.quantity, 0);
  const displayFilter = (value) => t.filterLabels[value] || value;
  const displayFamily = (value) => {
    if (language === "zh") return value;
    if (language === "ar") return t.familyLabels[value] || categoryByNameZh.get(value)?.nameEn || value;
    return categoryByNameZh.get(value)?.nameEn || t.familyLabels[value] || value;
  };
  const displayBody = (value) => t.bodyLabels[value] || value;
  const displayPatternName = (pattern) => {
    if (language === "zh") return pattern.name;
    if (pattern.nameEn) return pattern.nameEn;
    if (pattern.family === "混色套装系列") return `Mixed Set ${String(pattern.no - 58).padStart(2, "0")}`;
    if (pattern.no === 43) return "Black Lid Stainless Plain Body";
    if (pattern.no === 58) return "White Plain Body";
    return `${displayFamily(pattern.family).replace(" Series", "")} · 319-${String(pattern.no).padStart(2, "0")}`;
  };

  useEffect(() => {
    function closeWithEscape(event) {
      if (event.key === "Escape") {
        closeExpanded();
        setCartOpen(false);
        setSeriesMenuOpen(false);
        setQuotePreview((current) => {
          if (current?.pdfUrl) URL.revokeObjectURL(current.pdfUrl);
          return null;
        });
      }
    }
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, []);

  useEffect(() => {
    setZoom(1);
  }, [expandedId]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.title = localize(language, "319花色产品目录 | Hobby Lobby", "Model 319 Pattern Catalogue | Hobby Lobby", "كتالوج تصاميم موديل 319 | Hobby Lobby");
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) descriptionMeta.setAttribute("content", localize(language, "型号319保温壶花色产品目录，展示全部现有花色并支持来图定制，包含1.6L和2.0L价格。", "Model 319 thermal pot catalogue with all available patterns, custom artwork support, 1.6L and 2.0L capacities, and clear pricing.", "كتالوج ترمس موديل 319 بجميع التصاميم المتاحة مع دعم التصميم المخصص وسعتي 1.6 و2.0 لتر وأسعار واضحة."));
  }, [language]);

  useEffect(() => {
    setVisibleSeriesCount(1);
    setSeriesMenuOpen(false);
  }, [filter]);

  useEffect(() => {
    const loader = seriesLoaderRef.current;
    if (!loader || !hasMoreSeries) return undefined;
    if (!("IntersectionObserver" in window)) {
      setVisibleSeriesCount(groupedPatterns.length);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleSeriesCount((count) => Math.min(count + 1, groupedPatterns.length));
    }, { rootMargin: "300px 0px" });
    observer.observe(loader);
    return () => observer.disconnect();
  }, [hasMoreSeries, groupedPatterns.length, visibleSeriesCount]);

  function revealSeries(event, seriesIndex) {
    event.preventDefault();
    if (seriesIndex >= visibleSeriesCount) setVisibleSeriesCount(seriesIndex + 1);
    setSeriesMenuOpen(false);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.getElementById(`series-${seriesIndex + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  }

  function chooseFilter(nextFilter) {
    setFilter(nextFilter);
    setSeriesMenuOpen(false);
    const nextPattern = nextFilter === "全部花色"
      ? catalogue[0]
      : catalogue.find((pattern) => pattern.body === nextFilter || pattern.family === `${nextFilter}系列`);
    setSelectedId(nextPattern?.id || catalogue[0].id);
  }

  function selectPattern(pattern) {
    setSelectedId(pattern.id);
  }

  function openExpanded(pattern) {
    setExpandedId(pattern.id);
  }

  function toggleCapacity(pattern, capacityId) {
    setSelectedId(pattern.id);
    setExportStatus("");
    setSelectedCapacities((current) => {
      const currentSizes = current[pattern.id] || [];
      const exists = currentSizes.includes(capacityId);
      const nextSizes = exists ? currentSizes.filter((id) => id !== capacityId) : [...currentSizes, capacityId];
      const next = { ...current };
      if (nextSizes.length) next[pattern.id] = nextSizes;
      else delete next[pattern.id];
      setSelectedQuantities((quantityCurrent) => {
        const key = `${pattern.id}-${capacityId}`;
        const quantityNext = { ...quantityCurrent };
        if (exists) delete quantityNext[key];
        else quantityNext[key] ||= 1;
        return quantityNext;
      });
      return next;
    });
  }

  function removeSelectedCapacity(patternId, capacityId) {
    setExportStatus("");
    setSelectedCapacities((current) => {
      const nextSizes = (current[patternId] || []).filter((id) => id !== capacityId);
      const next = { ...current };
      if (nextSizes.length) next[patternId] = nextSizes;
      else delete next[patternId];
      return next;
    });
    setSelectedQuantities((current) => {
      const next = { ...current };
      delete next[`${patternId}-${capacityId}`];
      return next;
    });
  }

  function isCapacitySelected(patternId, capacityId) {
    return Boolean(selectedCapacities[patternId]?.includes(capacityId));
  }

  function getSelectedQuantity(patternId, capacityId) {
    return selectedQuantities[`${patternId}-${capacityId}`] || 1;
  }

  function updateQuantity(patternId, capacityId, nextQuantity) {
    const cleanedQuantity = Math.min(999, Math.max(1, Number.parseInt(nextQuantity, 10) || 1));
    setExportStatus("");
    setSelectedQuantities((current) => ({
      ...current,
      [`${patternId}-${capacityId}`]: cleanedQuantity,
    }));
  }

  async function exportSelectedDocument() {
    if (!selectedEntries.length) return;
    setExportStatus(localize(language, "正在生成报价表...", "Creating quotation...", "جارٍ إنشاء عرض السعر..."));
    try {
      const lastQuoteNumber = Number.parseInt(window.localStorage.getItem(quoteNumberKey), 10);
      const nextQuoteNumber = Number.isFinite(lastQuoteNumber) && lastQuoteNumber >= quoteNumberStart ? lastQuoteNumber + 1 : quoteNumberStart;
      const quoteNo = `${quoteNumberPrefix}${String(nextQuoteNumber).padStart(5, "0")}`;
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const dateDisplay = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
      const { createQuoteXlsx } = await import("./quoteExport.js");
      const blob = await createQuoteXlsx({ entries: selectedEntries, quoteNo, dateDisplay });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Hobby-Lobby-319-报价表-${today}.xlsx`;
      link.rel = "noopener";
      document.body.appendChild(link);
      window.localStorage.setItem(quoteNumberKey, String(nextQuoteNumber));
      window.__lastHobbyLobbyExport = { fileName: link.download, itemCount: selectedEntries.length, quoteNo };
      link.click();
      link.remove();
      setExportStatus(localize(language, `Excel 已生成：${link.download}`, `Excel created: ${link.download}`, `تم إنشاء ملف Excel: ${link.download}`));
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error(error);
      setExportStatus(localize(language, "生成失败，请刷新后重试", "Could not create the file. Refresh and try again.", "تعذر إنشاء الملف. حدّث الصفحة وحاول مرة أخرى."));
    }
  }

  async function exportWechatPdf() {
    if (!selectedEntries.length) return;
    setExportStatus(localize(language, "正在生成微信 PDF...", "Creating PDF...", "جارٍ إنشاء ملف PDF..."));
    try {
      const lastQuoteNumber = Number.parseInt(window.localStorage.getItem(quoteNumberKey), 10);
      const nextQuoteNumber = Number.isFinite(lastQuoteNumber) && lastQuoteNumber >= quoteNumberStart ? lastQuoteNumber + 1 : quoteNumberStart;
      const quoteNo = `${quoteNumberPrefix}${String(nextQuoteNumber).padStart(5, "0")}`;
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const dateDisplay = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
      const { createQuotePdf } = await import("./quoteExport.js");
      const { pages, pdfBlob } = await createQuotePdf({ entries: selectedEntries, quoteNo, dateDisplay });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const fileName = `Hobby-Lobby-319-报价单-${today}.pdf`;
      setQuotePreview((current) => {
        if (current?.pdfUrl) URL.revokeObjectURL(current.pdfUrl);
        return { pages, pdfUrl, fileName };
      });
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = fileName;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.localStorage.setItem(quoteNumberKey, String(nextQuoteNumber));
      window.__lastHobbyLobbyPdfExport = { pageCount: pages.length, itemCount: selectedEntries.length, quoteNo, size: pdfBlob.size };
      setExportStatus(localize(language, "PDF 已生成；苹果 Safari 和微信均可打开", "PDF created and ready to open in Safari, WeChat, or your browser.", "تم إنشاء ملف PDF وهو جاهز للفتح في المتصفح أو Safari أو WeChat."));
    } catch (error) {
      console.error(error);
      setExportStatus(localize(language, "PDF 生成失败，请刷新后重试", "Could not create the PDF. Refresh and try again.", "تعذر إنشاء ملف PDF. حدّث الصفحة وحاول مرة أخرى."));
    }
  }

  function closeQuotePreview() {
    setQuotePreview((current) => {
      if (current?.pdfUrl) URL.revokeObjectURL(current.pdfUrl);
      return null;
    });
  }

  function closeExpanded() {
    setExpandedId(null);
  }

  function zoomLightbox(event) {
    event.preventDefault();
    const step = event.deltaY < 0 ? 0.18 : -0.18;
    setZoom((currentZoom) => Math.min(3, Math.max(1, Number((currentZoom + step).toFixed(2)))));
  }

  return (
    <div className="site-shell" lang={language} dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="topbar">
        <a className="brand-link" href="#top" aria-label="Hobby Lobby home"><img src="/assets/brand-logo.webp" alt="Hobby Lobby Ask for More" width="256" height="256" decoding="async" /></a>
        <nav aria-label={localize(language, "主导航", "Main navigation", "التنقل الرئيسي")}>
          <a href="#gallery">{t.navGallery}</a>
          <a href="#customization">{localize(language, "定制服务", "Customization", "خدمة التخصيص")}</a>
          <a href="#customization">{localize(language, "关于我们", "About Us", "من نحن")}</a>
          <a href="/studio/">{localize(language, "在线试样", "Pattern Studio", "استوديو التصميم")}</a>
        </nav>
        <div className="language-switcher" role="group" aria-label={t.languageLabel}>
          {languageOptions.map((option) => (
            <button type="button" key={option.id} className={language === option.id ? "active" : ""} onClick={() => setLanguage(option.id)} aria-pressed={language === option.id}>{option.label}</button>
          ))}
        </div>
        <a className="button button-primary header-cta" href="#gallery">{t.headerCta}</a>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">{t.heroEyebrow}</p>
            <h1 id="hero-title"><span>{t.heroTitleTop}</span><br /><span className="hero-title-accent">{t.heroTitleBottom}</span></h1>
            <p className="hero-lede">{t.heroLead}</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#gallery">{t.browseAll} <ArrowDown weight="bold" /></a>
              <a className="button button-secondary" href="#customization">{t.viewSpecs} <ArrowRight weight="bold" /></a>
            </div>
            <div className="hero-notes" aria-label={localize(language, "产品摘要", "Product summary", "ملخص المنتج")}>
              <span><PaintBrush weight="regular" /> {t.heroNotePatterns}</span>
              <span><ShieldCheck weight="regular" /> {t.heroNoteModel}</span>
            </div>
          </div>
          <div className="hero-media">
            <div className="hero-runway" id="hero-product-runway" ref={heroCarouselRef} aria-label={t.heroCarouselLabel}>
              <div className="hero-runway-track">
                {[...heroShowcasePatterns, ...heroShowcasePatterns].map((pattern, index) => (
                  <figure className="hero-runway-item" key={`${pattern.id}-${index}`} aria-hidden={index >= heroShowcasePatterns.length}>
                    <img src={pattern.thumb} alt={index < heroShowcasePatterns.length ? displayPatternName(pattern) : ""} width="640" height="640" decoding="async" loading="lazy" />
                  </figure>
                ))}
              </div>
            </div>
            <div className="hero-featured-product">
              <img src="/assets/hero-featured-product.webp" alt={localize(language, `${displayPatternName(heroFeaturedPattern)}真实产品`, `${displayPatternName(heroFeaturedPattern)} real product`, `منتج حقيقي بتصميم ${displayPatternName(heroFeaturedPattern)}`)} width="1100" height="1100" loading="eager" fetchPriority="high" decoding="async" />
            </div>
            <div className="hero-runway-controls">
              <button type="button" aria-label={t.previousPatterns} onClick={() => heroCarouselRef.current?.scrollBy({ left: -260, behavior: "smooth" })}><ArrowLeft weight="bold" /></button>
              <button type="button" aria-label={t.nextPatterns} onClick={() => heroCarouselRef.current?.scrollBy({ left: 260, behavior: "smooth" })}><ArrowRight weight="bold" /></button>
            </div>
          </div>
        </section>

        <div className="catalog-strip" aria-label={localize(language, "目录摘要", "Catalogue summary", "ملخص الكتالوج")}><span><small>{t.stripModel}</small><strong>319</strong></span><span><small>1.6L</small><strong>¥29 RMB</strong></span><span><small>2.0L</small><strong>¥31 RMB</strong></span><span><small>{t.stripPatterns}</small><strong>{t.stripPatternCount}</strong></span></div>

        <section className="gallery-section section" id="gallery" aria-labelledby="gallery-title">
          <div className="section-heading">
            <div><p className="eyebrow">{t.galleryEyebrow}</p><h2 id="gallery-title">{t.galleryTitle}</h2><p>{t.galleryText}</p></div>
            <div className="finish-tabs three-tabs" role="group" aria-label={localize(language, "筛选壶身", "Filter body finish", "تصفية نوع الهيكل")}>
              {filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => chooseFilter(item)} aria-pressed={filter === item}>{displayFilter(item)}</button>)}
            </div>
          </div>
          <div className="catalogue-layout">
            <aside className="series-directory" aria-label={localize(language, "花色系列目录", "Pattern series directory", "دليل مجموعات التصاميم")}>
              <span>{t.directory}</span>
              {groupedPatterns.map(([series, seriesPatterns], seriesIndex) => (
                <a href={`#series-${seriesIndex + 1}`} key={series} onClick={(event) => revealSeries(event, seriesIndex)}>
                  <strong>{displayFamily(series)}</strong>
                  <small>{seriesPatterns.length} {t.itemUnit}</small>
                </a>
              ))}
            </aside>
            <div className="series-list" aria-live="polite">
            {visibleGroupedPatterns.map(([series, seriesPatterns], seriesIndex) => <section className="pattern-series" id={`series-${seriesIndex + 1}`} key={series} aria-label={`${series}`}>
              <div className="series-heading"><span>{displayFamily(series)}</span><small>{seriesPatterns.length} {t.patternUnit}</small></div>
              <div className="pattern-grid">
                {seriesPatterns.map((pattern) => {
                  const active = Boolean(selectedCapacities[pattern.id]?.length);
                  const catalogueCode = `319-${String(pattern.no).padStart(2, "0")}`;
                  return (
                    <article className={`pattern-card ${active ? "selected" : ""}`} id={pattern.id} key={pattern.id}>
                      <button className="pattern-image-wrap" type="button" onClick={() => openExpanded(pattern)} aria-label={`${displayPatternName(pattern)}，${displayFamily(pattern.family)}，${t.zoomHint}。`}><img src={pattern.thumb} srcSet={`${pattern.thumb} 640w, ${pattern.displayImage} 1600w`} sizes="(max-width: 700px) 46vw, (max-width: 1100px) 30vw, 240px" alt={language === "zh" ? pattern.imageAltZh : (pattern.imageAltEn || displayPatternName(pattern))} width="640" height="640" loading="lazy" decoding="async" />{active && <span className="check-mark"><Check weight="bold" /></span>}<span className="zoom-hint"><MagnifyingGlassPlus weight="bold" /> {t.zoomHint}</span></button>
                      <span className="pattern-code">MODEL 319 · {catalogueCode}</span><span className="pattern-name">{displayPatternName(pattern)}</span><span className="pattern-family">{displayBody(pattern.body)} · 1.6L ¥29 · 2.0L ¥31</span>
                      <a className="product-detail-link" href={`/products/${pattern.slug}/`}>{localize(language, "查看商品详情", "View product details", "عرض تفاصيل المنتج")} <ArrowRight weight="bold" /></a>
                      <div className="capacity-picker" aria-label={`${displayPatternName(pattern)} ${localize(language, "容量选择", "capacity selection", "اختيار السعة")}`}>
                        {capacities.map((capacity) => (
                          <button className={isCapacitySelected(pattern.id, capacity.id) ? "active" : ""} type="button" key={capacity.id} onClick={() => toggleCapacity(pattern, capacity.id)} aria-pressed={isCapacitySelected(pattern.id, capacity.id)}>
                            <strong>{capacity.id}</strong><span>{capacity.price}</span>{isCapacitySelected(pattern.id, capacity.id) && <em>{getSelectedQuantity(pattern.id, capacity.id)} {localize(language, "箱", "cartons", "كرتون")}</em>}
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>)}
            {hasMoreSeries && <div className="series-loader" ref={seriesLoaderRef}>
              <button type="button" onClick={() => setVisibleSeriesCount((count) => Math.min(count + 1, groupedPatterns.length))}>
                {localize(language, "继续加载花色", "Load more patterns", "تحميل المزيد من التصاميم")}
              </button>
            </div>}
            </div>
          </div>
          <p className="gallery-note">{t.currentShowing} {filteredPatterns.length} {t.currentSuffix}</p>
        </section>

        <section className="process-section section" id="specifications" aria-labelledby="process-title">
          <div className="process-title-wrap"><p className="eyebrow">{t.specsEyebrow}</p><h2 id="process-title">{t.specsTitle}</h2></div>
          <ol><li><span>01</span><h3>{t.specOneTitle}</h3><p>{t.specOneText}</p></li><li><span>02</span><h3>{t.specTwoTitle}</h3><p>{t.specTwoText}</p></li><li><span>03</span><h3>{t.specThreeTitle}</h3><p>{t.specThreeText}</p></li></ol>
        </section>

        <section className="steel-band" id="details">
          <img src="/assets/steel-pattern-09.webp" alt={localize(language, "316不锈钢黑盖粉牡丹花色保温壶", "316 stainless steel black-lid floral thermal pot", "ترمس حراري ستانلس ستيل 316 بغطاء أسود وتصميم زهور")} width="1000" height="1000" loading="lazy" decoding="async" />
          <div><p className="eyebrow">{t.steelEyebrow}</p><h2>{t.steelTitle}</h2><p>{t.steelText}</p><a href="#gallery" onClick={() => chooseFilter("316不锈钢")}>{t.steelLink} <ArrowRight weight="bold" /></a></div>
        </section>

        <section className="customization-contact section" id="customization" aria-labelledby="customization-title">
          <div className="customization-contact-head">
            <div>
              <p className="eyebrow">{localize(language, "定制服务", "Customization Service", "خدمة التخصيص")}</p>
              <h2 id="customization-title">{localize(language, "定制花色，欢迎联系我们", "Custom patterns, made for your brand", "تصاميم مخصصة لعلامتك التجارية")}</h2>
            </div>
            <p>{localize(language, "支持来图、配色及品牌定制，可通过 WhatsApp 或微信联系 Jackie Lee。", "Send your artwork, colors, or branding requirements to Jackie Lee via WhatsApp or WeChat.", "أرسل صورك أو ألوانك أو متطلبات علامتك التجارية إلى Jackie Lee عبر WhatsApp أو WeChat.")}</p>
          </div>
          <div className="customization-channels">
            <div className="contact-channel-list" aria-label={localize(language, "社交媒体联系方式", "Social contact links", "روابط التواصل الاجتماعي")}>
              <a className="contact-channel instagram" href="https://www.instagram.com/jackieleefirst?igsh=MXBxZG4xdWx0YjlvdQ%3D%3D&utm_source=qr" target="_blank" rel="noreferrer">
                <InstagramLogo weight="fill" /><span><strong>Instagram</strong><small>@jackieleefirst</small></span><ArrowRight weight="bold" />
              </a>
              <a className="contact-channel whatsapp" href="https://wa.me/qr/TGGNQVOHCRPOO1" target="_blank" rel="noreferrer">
                <WhatsappLogo weight="fill" /><span><strong>WhatsApp</strong><small>{localize(language, "添加 Jackie Lee 为联系人", "Add Jackie Lee as a contact", "أضف Jackie Lee إلى جهات الاتصال")}</small></span><ArrowRight weight="bold" />
              </a>
              <a className="contact-channel facebook" href="https://www.facebook.com/share/1BYzmSBqqq/?mibextid=wwXIfr" target="_blank" rel="noreferrer">
                <FacebookLogo weight="fill" /><span><strong>Facebook</strong><small>Jackie Lee</small></span><ArrowRight weight="bold" />
              </a>
              <a className="contact-channel wecom" href="https://work.weixin.qq.com/u/vcd336fb02ace7d676?v=5.0.9.224799&bb=c3721e643c" target="_blank" rel="noreferrer">
                <WechatLogo weight="fill" /><span><strong>{localize(language, "企业微信", "WeCom", "WeCom")}</strong><small>{localize(language, "打开企业微信联系方式", "Open WeCom contact", "فتح جهة اتصال WeCom")}</small></span><ArrowRight weight="bold" />
              </a>
            </div>
            <article className="wecom-contact-card">
              <div><WechatLogo weight="fill" /><span><strong>{localize(language, "添加企业微信", "Add on WeCom", "أضف عبر WeCom")}</strong><small>{localize(language, "Jackie Lee · 国发保温瓶小家电", "Jackie Lee · Thermal household products", "Jackie Lee · منتجات منزلية حرارية")}</small></span></div>
              <a href="https://work.weixin.qq.com/u/vcd336fb02ace7d676?v=5.0.9.224799&bb=c3721e643c" target="_blank" rel="noreferrer" aria-label={localize(language, "打开 Jackie Lee 企业微信联系方式", "Open Jackie Lee WeCom contact", "فتح جهة اتصال Jackie Lee على WeCom")}>
                <img src="/assets/jackie-lee-wecom.webp" alt={localize(language, "Jackie Lee 企业微信联系人二维码", "Jackie Lee WeCom contact QR code", "رمز QR لجهة اتصال Jackie Lee على WeCom")} width="1206" height="2030" loading="lazy" decoding="async" />
              </a>
              <p>{localize(language, "点击图片直接打开，或使用另一台手机扫码添加。", "Tap the image to open the contact, or scan it from another phone.", "اضغط على الصورة لفتح جهة الاتصال أو امسح الرمز بهاتف آخر.")}</p>
            </article>
          </div>
          <figure className="contact-brand-card">
            <div className="contact-brand-card-scroll">
              <img src="/assets/custom-service-contact-card.webp" alt={localize(language, "Hobby Lobby 联系名片，含 Jackie Lee 电话、WhatsApp、微信二维码及义乌商贸城地址", "Hobby Lobby contact card with Jackie Lee phone, WhatsApp, WeChat QR codes, and Yiwu showroom address", "بطاقة اتصال Hobby Lobby مع هاتف Jackie Lee وWhatsApp ورموز WeChat وعنوان معرض ييوو")} width="2172" height="724" loading="lazy" decoding="async" />
            </div>
            <figcaption>
              <span>{localize(language, "完整电话、地址与品牌资料", "Complete phone, address, and brand details", "بيانات الهاتف والعنوان والعلامة التجارية كاملة")}</span>
              <a href="/assets/custom-service-contact-card.webp" target="_blank" rel="noreferrer">{localize(language, "打开高清名片", "Open full-size card", "فتح البطاقة بالحجم الكامل")} <ArrowRight weight="bold" /></a>
            </figcaption>
          </figure>
        </section>

        <section className="benefit-row section" aria-label={localize(language, "产品卖点", "Product benefits", "مزايا المنتج")}>{t.benefits.map(({ icon: Icon, title, text }) => <article key={title}><Icon weight="regular" /><h3>{title}</h3><p>{text}</p></article>)}</section>
      </main>

      <aside className={`mobile-series-nav ${seriesMenuOpen ? "is-open" : ""}`} aria-label={localize(language, "系列快捷导航", "Series quick navigation", "التنقل السريع بين المجموعات")}>
        {seriesMenuOpen && (
          <div className="mobile-series-panel" id="mobile-series-panel">
            <div className="mobile-series-head">
              <div>
                <span>{localize(language, "快速跳转", "Quick jump", "انتقال سريع")}</span>
                <strong>{localize(language, "选择系列", "Choose a series", "اختر مجموعة")}</strong>
              </div>
              <button type="button" onClick={() => setSeriesMenuOpen(false)} aria-label={localize(language, "关闭系列导航", "Close series navigation", "إغلاق قائمة المجموعات")}><X weight="bold" /></button>
            </div>
            <nav className="mobile-series-list" aria-label={localize(language, "产品系列", "Product series", "مجموعات المنتجات")}>
              {groupedPatterns.map(([series, seriesPatterns], seriesIndex) => (
                <a href={`#series-${seriesIndex + 1}`} key={series} onClick={(event) => revealSeries(event, seriesIndex)}>
                  <strong>{displayFamily(series)}</strong>
                  <small>{seriesPatterns.length} {t.itemUnit}</small>
                </a>
              ))}
            </nav>
          </div>
        )}
        <button
          className="mobile-series-fab"
          type="button"
          onClick={() => {
            setSeriesMenuOpen((open) => !open);
            setCartOpen(false);
          }}
          aria-expanded={seriesMenuOpen}
          aria-controls="mobile-series-panel"
        >
          <SquaresFour weight="fill" />
          <span>{localize(language, "系列", "Series", "المجموعات")}</span>
          <strong>{groupedPatterns.length}</strong>
        </button>
      </aside>

      <aside className={`selection-cart ${cartOpen ? "is-open" : "is-collapsed"}`} aria-label={localize(language, "已选花色", "Selected patterns", "التصاميم المختارة")}>
        {!cartOpen ? (
          <button className="cart-fab" type="button" onClick={() => { setCartOpen(true); setSeriesMenuOpen(false); }} aria-expanded="false" aria-label={localize(language, `展开购物车，当前共 ${totalCartons} 箱`, `Open cart, ${totalCartons} cartons selected`, `فتح السلة، تم اختيار ${totalCartons} كرتون`)}>
            <ShoppingCart weight="bold" />
            <span>{localize(language, "购物车", "Cart", "السلة")}</span>
            <strong aria-live="polite">{totalCartons}</strong>
          </button>
        ) : <>
          <div className="selection-cart-head">
            <span><ShoppingCart weight="bold" /> {localize(language, "已选花色", "Selected patterns", "التصاميم المختارة")}</span>
            <div className="cart-head-actions">
              <strong aria-live="polite">{totalCartons}</strong>
              <button className="cart-collapse" type="button" onClick={() => setCartOpen(false)} aria-expanded="true" aria-label={localize(language, "收起购物车", "Close cart", "إغلاق السلة")}><X weight="bold" /></button>
            </div>
          </div>
          {selectedEntries.length === 0 ? (
            <p className="cart-empty">{localize(language, "点击花色卡片里的容量按钮，这里会自动汇总客户选择的花色和容量。", "Choose a capacity on any pattern card and your selected patterns and capacities will appear here.", "اختر السعة من بطاقة أي تصميم وستظهر التصاميم والسعات المختارة هنا.")}</p>
          ) : (
            <>
              <div className="cart-list">
                {selectedEntries.map(({ pattern, capacity, quantity }) => (
                  <div className="cart-item" key={`${pattern.id}-${capacity.id}`}>
                    <img src={pattern.thumb} alt="" width="640" height="640" loading="lazy" decoding="async" />
                    <div>
                      <strong>{displayPatternName(pattern)}</strong>
                      <small>319-{String(pattern.no).padStart(2, "0")} · {capacity.id} · {capacity.price} · {capacity.packing}</small>
                      <div className="qty-control">
                        <span>{localize(language, "箱数", "Cartons", "الكراتين")}</span>
                        <button type="button" onClick={(event) => { event.stopPropagation(); updateQuantity(pattern.id, capacity.id, quantity - 1); }} aria-label={localize(language, `${pattern.name} ${capacity.id} 减少一箱`, `Decrease ${displayPatternName(pattern)} ${capacity.id} by one carton`, `تقليل ${displayPatternName(pattern)} ${capacity.id} كرتوناً واحداً`)}>−</button>
                        <input value={quantity} inputMode="numeric" min="1" max="999" onChange={(event) => updateQuantity(pattern.id, capacity.id, event.target.value)} aria-label={`${displayPatternName(pattern)} ${capacity.id} ${localize(language, "箱数", "carton quantity", "عدد الكراتين")}`} />
                        <button type="button" onClick={(event) => { event.stopPropagation(); updateQuantity(pattern.id, capacity.id, quantity + 1); }} aria-label={localize(language, `${pattern.name} ${capacity.id} 增加一箱`, `Increase ${displayPatternName(pattern)} ${capacity.id} by one carton`, `زيادة ${displayPatternName(pattern)} ${capacity.id} كرتوناً واحداً`)}>+</button>
                      </div>
                    </div>
                    <button className="cart-remove" type="button" onClick={() => removeSelectedCapacity(pattern.id, capacity.id)} aria-label={`${localize(language, "移出", "Remove", "إزالة")} ${displayPatternName(pattern)} ${capacity.id}`}><Trash weight="bold" /></button>
                  </div>
                ))}
              </div>
              <div className="cart-actions">
                <button className="cart-export" type="button" onClick={exportWechatPdf}><DownloadSimple weight="bold" /> {localize(language, "PDF 报价表", "PDF quotation", "عرض سعر PDF")}</button>
                <button className="cart-export cart-export-secondary" type="button" onClick={exportSelectedDocument}><DownloadSimple weight="bold" /> {localize(language, "Excel 报价表", "Excel quotation", "عرض سعر Excel")}</button>
                <button className="cart-clear" type="button" onClick={() => { setSelectedCapacities({}); setSelectedQuantities({}); setExportStatus(""); }}>{localize(language, "清空选款", "Clear selection", "مسح الاختيارات")}</button>
              </div>
              {exportStatus && <p className="export-status">{exportStatus}</p>}
            </>
          )}
        </>}
      </aside>

      <footer><img src="/assets/brand-logo.webp" alt="" width="256" height="256" loading="lazy" decoding="async" /><p>{t.footerText}</p><a href="#top">{localize(language, "回到顶部", "Back to top", "العودة إلى الأعلى")} <ArrowRight weight="bold" /></a></footer>

      {expanded && <div className="lightbox-backdrop" role="presentation" onClick={closeExpanded}>
        <div className="lightbox-panel" role="dialog" aria-modal="true" aria-label={`${displayPatternName(expanded)} ${localize(language, "大图", "large image", "صورة كبيرة")}`} onClick={(event) => event.stopPropagation()} onWheel={zoomLightbox}>
          <button className="lightbox-close" type="button" onClick={closeExpanded} aria-label={localize(language, "关闭大图", "Close large image", "إغلاق الصورة الكبيرة")}><X weight="bold" /></button>
          <span className="zoom-meter">{Math.round(zoom * 100)}% · {localize(language, "滚轮缩放", "Wheel to zoom", "استخدم العجلة للتكبير")}</span>
          <div className="lightbox-image"><img src={expanded.displayImage} srcSet={`${expanded.thumb} 720w, ${expanded.displayImage} 1600w`} sizes="(max-width: 700px) 96vw, 80vw" alt={`${displayPatternName(expanded)} ${localize(language, "大图", "large image", "صورة كبيرة")}`} decoding="async" fetchPriority="high" style={{ transform: `scale(${zoom})` }} /></div>
          <div className="lightbox-info">
            <div className="lightbox-pack">
              <span>{localize(language, "价格 / 装箱", "PRICE / PACKING", "السعر / التعبئة")}</span>
              {capacities.map((capacity) => (
                <button className={`pack-option ${isCapacitySelected(expanded.id, capacity.id) ? "active" : ""}`} type="button" key={capacity.id} onClick={() => toggleCapacity(expanded, capacity.id)} aria-pressed={isCapacitySelected(expanded.id, capacity.id)}>
                  <strong>{capacity.id}</strong><small>{capacity.price} · {capacity.packing}{isCapacitySelected(expanded.id, capacity.id) ? ` · ${getSelectedQuantity(expanded.id, capacity.id)} ${localize(language, "箱", "cartons", "كرتون")}` : ""}</small>
                </button>
              ))}
            </div>
            <div className="lightbox-meta">
              <span>MODEL 319 · {String(expanded.no).padStart(2, "0")}</span>
              <strong>{displayPatternName(expanded)}</strong>
              <small>{displayFamily(expanded.family)} · {displayBody(expanded.body)} · 1.6L ¥29 RMB · 2.0L ¥31 RMB</small>
            </div>
          </div>
        </div>
      </div>}

      {quotePreview && <div className="quote-preview-backdrop" role="presentation" onClick={closeQuotePreview}>
        <div className="quote-preview-panel" role="dialog" aria-modal="true" aria-label={localize(language, "PDF 报价单预览", "PDF quotation preview", "معاينة عرض السعر PDF")} onClick={(event) => event.stopPropagation()}>
          <div className="quote-preview-head">
            <div><strong>{localize(language, "PDF 报价单", "PDF quotation", "عرض سعر PDF")}</strong><small>{localize(language, "适用于苹果 Safari、微信和电脑，照片已嵌入文件", "Works in Safari, WeChat, and desktop browsers; product images are embedded.", "يعمل في Safari وWeChat ومتصفحات الكمبيوتر؛ صور المنتجات مضمنة.")}</small></div>
            <button className="quote-preview-close" type="button" onClick={closeQuotePreview} aria-label={localize(language, "关闭 PDF 预览", "Close PDF preview", "إغلاق معاينة PDF")}><X weight="bold" /></button>
          </div>
          <a className="quote-preview-tip" href={quotePreview.pdfUrl} download={quotePreview.fileName} target="_blank" rel="noopener">{localize(language, "没有自动下载？点这里再次打开 / 下载 PDF", "No automatic download? Click here to open or download the PDF again.", "لم يبدأ التنزيل تلقائياً؟ اضغط هنا لفتح ملف PDF أو تنزيله مرة أخرى.")}</a>
          <div className="quote-preview-pages">
            {quotePreview.pages.map((page, index) => <img key={index} src={page.dataUri} alt={localize(language, `报价单第 ${index + 1} 页`, `Quotation page ${index + 1}`, `صفحة عرض السعر ${index + 1}`)} width={page.width} height={page.height} />)}
          </div>
        </div>
      </div>}
    </div>
  );
}


export function App() {
  if (window.location.pathname.startsWith("/admin")) {
    return <Suspense fallback={<main style={{ padding: 24 }}>正在加载管理后台…</main>}><AdminApp /></Suspense>;
  }
  if (window.location.pathname.startsWith("/studio")) {
    return <Suspense fallback={<main style={{ padding: 24 }}>正在加载在线试样台…</main>}><PatternStudio /></Suspense>;
  }
  const productSlug = decodeURIComponent(window.location.pathname.match(/^\/products\/([^/]+)\/?$/)?.[1] || "");
  const product = catalogue.find((item) => item.slug === productSlug);
  return product ? <ProductDetail product={product} /> : <Storefront />;
}
