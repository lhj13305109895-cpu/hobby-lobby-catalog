import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import productsData from "./data/products.json";
import categoriesData from "./data/categories.json";
import {
  ArrowDown, ArrowLeft, ArrowRight, Check, Heart,
  DownloadSimple, FacebookLogo, InstagramLogo, MagnifyingGlassPlus, PaintBrush,
  ShieldCheck, ShoppingCart, Trash, WechatLogo, WhatsappLogo, X,
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
  { id: "zh", label: "中文" },
  { id: "en", label: "English" },
];

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
  const [language, setLanguage] = useState("zh");
  const category = categoryById.get(product.categoryId);
  const name = language === "zh" ? product.nameZh : (product.nameEn || product.nameZh);
  const description = language === "zh"
    ? (product.descriptionZh || `${product.nameZh}花色型号319保温壶，提供1.6L和2.0L两种容量。`)
    : (product.descriptionEn || `Model 319 thermal pot in the ${product.nameEn || product.nameZh} pattern, available in 1.6L and 2.0L.`);
  const imageAlt = language === "zh" ? product.imageAltZh : (product.imageAltEn || product.imageAltZh);
  const structuredData = productStructuredData(product);

  useEffect(() => {
    document.title = `${product.slug} ${product.nameZh}保温壶 | Hobby Lobby`;
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
  }, [description, product]);

  return (
    <div className="site-shell product-page-shell" lang={language}>
      <header className="topbar product-topbar">
        <a className="brand-link" href="/" aria-label="Hobby Lobby home"><img src="/assets/brand-logo.webp" alt="Hobby Lobby Ask for More" width="256" height="256" /></a>
        <nav aria-label={language === "zh" ? "商品导航" : "Product navigation"}><a href="/#gallery">{language === "zh" ? "全部花色" : "All patterns"}</a><a href="/studio/">{language === "zh" ? "在线试样" : "Pattern studio"}</a><a href="/#specifications">{language === "zh" ? "价格规格" : "Prices"}</a></nav>
        <div className="language-switcher" role="group" aria-label={language === "zh" ? "语言" : "Language"}>
          {languageOptions.map((option) => <button type="button" key={option.id} className={language === option.id ? "active" : ""} onClick={() => setLanguage(option.id)}>{option.label}</button>)}
        </div>
        <a className="button button-primary header-cta" href="/#gallery">{language === "zh" ? "浏览目录" : "Browse catalogue"}</a>
      </header>
      <main className="product-detail-page">
        <nav className="product-breadcrumb" aria-label={language === "zh" ? "面包屑" : "Breadcrumb"}><a href="/">{language === "zh" ? "首页" : "Home"}</a><span>/</span><a href="/#gallery">{language === "zh" ? "花色目录" : "Patterns"}</a><span>/</span><strong>{product.slug}</strong></nav>
        <article className="product-detail-card">
          <figure className="product-detail-media"><img src={product.displayImage} alt={imageAlt} width="1600" height="1600" fetchPriority="high" decoding="async" /></figure>
          <div className="product-detail-copy">
            <p className="eyebrow">MODEL 319 · {product.slug}</p>
            <h1>{name}</h1>
            {language === "zh" && product.nameEn && <p className="product-name-en">{product.nameEn}</p>}
            <p className="product-description">{description}</p>
            <dl className="product-attributes">
              <div><dt>{language === "zh" ? "系列" : "Series"}</dt><dd>{language === "zh" ? category?.nameZh : (category?.nameEn || category?.nameZh)}</dd></div>
              <div><dt>{language === "zh" ? "壶身" : "Body"}</dt><dd>{product.bodyType}</dd></div>
              <div><dt>{language === "zh" ? "货号" : "SKU"}</dt><dd>{product.slug}</dd></div>
            </dl>
            <div className="product-offers" aria-label={language === "zh" ? "容量和价格" : "Capacities and prices"}>
              {capacities.map((capacity) => <div key={capacity.id}><strong>{capacity.id}</strong><span>{capacity.price}</span><small>{capacity.packing} / {language === "zh" ? "箱" : "carton"}</small></div>)}
            </div>
            <a className="button button-primary product-back" href="/#gallery"><ArrowLeft weight="bold" /> {language === "zh" ? "返回全部花色" : "Back to all patterns"}</a>
          </div>
        </article>
        <section className="product-index-copy">
          <p className="eyebrow">{language === "zh" ? "型号319花色" : "Model 319 pattern"}</p>
          <h2>{language === "zh" ? `${product.nameZh}保温壶产品图` : `${product.nameEn || product.nameZh} thermal pot image`}</h2>
          <p>{language === "zh" ? `本页展示 ${product.slug} ${product.nameZh}花色的清晰产品图片、容量、价格和装箱信息，支持从现有花色中选款，也支持来图定制。` : `This page shows clear product imagery, capacities, pricing, and carton details for ${product.slug}. Existing patterns and custom artwork are supported.`}</p>
        </section>
      </main>
      <footer><img src="/assets/brand-logo.webp" alt="" width="256" height="256" loading="lazy" /><p>Hobby Lobby Ask for More · {product.slug}</p><a href="/#gallery">{language === "zh" ? "查看全部花色" : "View all patterns"} <ArrowRight weight="bold" /></a></footer>
    </div>
  );
}

function Storefront() {
  const [language, setLanguage] = useState("zh");
  const [filter, setFilter] = useState("全部花色");
  const [selectedId, setSelectedId] = useState("pattern-01");
  const [selectedCapacities, setSelectedCapacities] = useState({});
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [exportStatus, setExportStatus] = useState("");
  const [quotePreview, setQuotePreview] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
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
  const displayFamily = (value) => language === "zh" ? value : (categoryByNameZh.get(value)?.nameEn || t.familyLabels[value] || value);
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
    setVisibleSeriesCount(1);
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
    if (seriesIndex < visibleSeriesCount) return;
    event.preventDefault();
    setVisibleSeriesCount(seriesIndex + 1);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.getElementById(`series-${seriesIndex + 1}`)?.scrollIntoView();
    }));
  }

  function chooseFilter(nextFilter) {
    setFilter(nextFilter);
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
    setExportStatus("正在生成报价表...");
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
      setExportStatus(`Excel 已生成：${link.download}`);
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error(error);
      setExportStatus("生成失败，请刷新后重试");
    }
  }

  async function exportWechatPdf() {
    if (!selectedEntries.length) return;
    setExportStatus("正在生成微信 PDF...");
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
      setExportStatus("PDF 已生成；苹果 Safari 和微信均可打开");
    } catch (error) {
      console.error(error);
      setExportStatus("PDF 生成失败，请刷新后重试");
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
    <div className={`site-shell ${language === "zh" ? "static-reference-active" : ""}`} lang={language}>
      <section className="hero-reference-exact" aria-label="花色，由你定义">
        <img className="hero-reference-base" src="/assets/hero-reference-products.webp" alt="花色由你定义，型号319花色定制展示" width="1560" height="1008" loading="eager" fetchPriority="high" decoding="async" />
        <a className="hero-reference-hotspot hero-reference-gallery-nav" href="#gallery" aria-label="花色目录" />
        <a className="hero-reference-hotspot hero-reference-custom-nav" href="#customization" aria-label="定制服务" />
        <a className="hero-reference-hotspot hero-reference-gallery-cta" href="#gallery" aria-label="探索花色" />
        <a className="hero-reference-hotspot hero-reference-custom-cta" href="#customization" aria-label="了解定制" />
        <a className="hero-reference-studio-entry" href="/studio/">在线试样</a>
        <button className="hero-reference-hotspot hero-reference-english" type="button" onClick={() => setLanguage("en")} aria-label="English" />
      </section>
      <header className="topbar">
        <a className="brand-link" href="#top" aria-label="Hobby Lobby home"><img src="/assets/brand-logo.webp" alt="Hobby Lobby Ask for More" width="256" height="256" decoding="async" /></a>
        <nav aria-label={language === "zh" ? "主导航" : "Main navigation"}>
          <a href="#gallery">{t.navGallery}</a><a href="/studio/">{language === "zh" ? "在线试样" : "Pattern studio"}</a><a href="#details">{t.navSteel}</a><a href="#specifications">{t.navSpecs}</a>
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
              <a className="button button-secondary" href="/studio/">{language === "zh" ? "上传图案试样" : "Try your artwork"} <ArrowRight weight="bold" /></a>
            </div>
            <div className="hero-notes" aria-label={language === "zh" ? "产品摘要" : "Product summary"}>
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
              <img src="/assets/hero-featured-product.webp" alt={language === "zh" ? `${displayPatternName(heroFeaturedPattern)}真实产品` : `${displayPatternName(heroFeaturedPattern)} real product`} width="1100" height="1100" loading="eager" fetchPriority="high" decoding="async" />
            </div>
            <div className="hero-runway-controls">
              <button type="button" aria-label={t.previousPatterns} onClick={() => heroCarouselRef.current?.scrollBy({ left: -260, behavior: "smooth" })}><ArrowLeft weight="bold" /></button>
              <button type="button" aria-label={t.nextPatterns} onClick={() => heroCarouselRef.current?.scrollBy({ left: 260, behavior: "smooth" })}><ArrowRight weight="bold" /></button>
            </div>
          </div>
        </section>

        <div className="catalog-strip" aria-label={language === "zh" ? "目录摘要" : "Catalogue summary"}><span><small>{t.stripModel}</small><strong>319</strong></span><span><small>1.6L</small><strong>¥29 RMB</strong></span><span><small>2.0L</small><strong>¥31 RMB</strong></span><span><small>{t.stripPatterns}</small><strong>{t.stripPatternCount}</strong></span></div>

        <section className="gallery-section section" id="gallery" aria-labelledby="gallery-title">
          <div className="section-heading">
            <div><p className="eyebrow">{t.galleryEyebrow}</p><h2 id="gallery-title">{t.galleryTitle}</h2><p>{t.galleryText}</p></div>
            <div className="finish-tabs three-tabs" role="group" aria-label={language === "zh" ? "筛选壶身" : "Filter body finish"}>
              {filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => chooseFilter(item)} aria-pressed={filter === item}>{displayFilter(item)}</button>)}
            </div>
          </div>
          <div className="catalogue-layout">
            <aside className="series-directory" aria-label={language === "zh" ? "花色系列目录" : "Pattern series directory"}>
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
                      <a className="product-detail-link" href={`/products/${pattern.slug}/`}>{language === "zh" ? "查看商品详情" : "View product details"} <ArrowRight weight="bold" /></a>
                      <div className="capacity-picker" aria-label={`${pattern.name} 容量选择`}>
                        {capacities.map((capacity) => (
                          <button className={isCapacitySelected(pattern.id, capacity.id) ? "active" : ""} type="button" key={capacity.id} onClick={() => toggleCapacity(pattern, capacity.id)} aria-pressed={isCapacitySelected(pattern.id, capacity.id)}>
                            <strong>{capacity.id}</strong><span>{capacity.price}</span>{isCapacitySelected(pattern.id, capacity.id) && <em>{getSelectedQuantity(pattern.id, capacity.id)} 箱</em>}
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
                {language === "zh" ? "继续加载花色" : "Load more patterns"}
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
          <img src="/assets/steel-pattern-09.webp" alt={language === "zh" ? "316不锈钢黑盖粉牡丹花色保温壶" : "316 stainless steel black-lid floral thermal pot"} width="1000" height="1000" loading="lazy" decoding="async" />
          <div><p className="eyebrow">{t.steelEyebrow}</p><h2>{t.steelTitle}</h2><p>{t.steelText}</p><a href="#gallery" onClick={() => chooseFilter("316不锈钢")}>{t.steelLink} <ArrowRight weight="bold" /></a></div>
        </section>

        <section className="customization-contact section" id="customization" aria-labelledby="customization-title">
          <div className="customization-contact-head">
            <div>
              <p className="eyebrow">{language === "zh" ? "定制服务" : "Customization Service"}</p>
              <h2 id="customization-title">{language === "zh" ? "定制花色，欢迎联系我们" : "Custom patterns, made for your brand"}</h2>
            </div>
            <p>{language === "zh" ? "支持来图、配色及品牌定制，可通过 WhatsApp 或微信联系 Jackie Lee。" : "Send your artwork, colors, or branding requirements to Jackie Lee via WhatsApp or WeChat."}</p>
          </div>
          <div className="customization-channels">
            <div className="contact-channel-list" aria-label={language === "zh" ? "社交媒体联系方式" : "Social contact links"}>
              <a className="contact-channel instagram" href="https://www.instagram.com/jackieleefirst?igsh=MXBxZG4xdWx0YjlvdQ%3D%3D&utm_source=qr" target="_blank" rel="noreferrer">
                <InstagramLogo weight="fill" /><span><strong>Instagram</strong><small>@jackieleefirst</small></span><ArrowRight weight="bold" />
              </a>
              <a className="contact-channel whatsapp" href="https://wa.me/qr/TGGNQVOHCRPOO1" target="_blank" rel="noreferrer">
                <WhatsappLogo weight="fill" /><span><strong>WhatsApp</strong><small>{language === "zh" ? "添加 Jackie Lee 为联系人" : "Add Jackie Lee as a contact"}</small></span><ArrowRight weight="bold" />
              </a>
              <a className="contact-channel facebook" href="https://www.facebook.com/share/1BYzmSBqqq/?mibextid=wwXIfr" target="_blank" rel="noreferrer">
                <FacebookLogo weight="fill" /><span><strong>Facebook</strong><small>Jackie Lee</small></span><ArrowRight weight="bold" />
              </a>
              <a className="contact-channel wecom" href="https://work.weixin.qq.com/u/vcd336fb02ace7d676?v=5.0.9.224799&bb=c3721e643c" target="_blank" rel="noreferrer">
                <WechatLogo weight="fill" /><span><strong>{language === "zh" ? "企业微信" : "WeCom"}</strong><small>{language === "zh" ? "打开企业微信联系方式" : "Open WeCom contact"}</small></span><ArrowRight weight="bold" />
              </a>
            </div>
            <article className="wecom-contact-card">
              <div><WechatLogo weight="fill" /><span><strong>{language === "zh" ? "添加企业微信" : "Add on WeCom"}</strong><small>{language === "zh" ? "Jackie Lee · 国发保温瓶小家电" : "Jackie Lee · Thermal household products"}</small></span></div>
              <a href="https://work.weixin.qq.com/u/vcd336fb02ace7d676?v=5.0.9.224799&bb=c3721e643c" target="_blank" rel="noreferrer" aria-label={language === "zh" ? "打开 Jackie Lee 企业微信联系方式" : "Open Jackie Lee WeCom contact"}>
                <img src="/assets/jackie-lee-wecom.webp" alt={language === "zh" ? "Jackie Lee 企业微信联系人二维码" : "Jackie Lee WeCom contact QR code"} width="1206" height="2030" loading="lazy" decoding="async" />
              </a>
              <p>{language === "zh" ? "点击图片直接打开，或使用另一台手机扫码添加。" : "Tap the image to open the contact, or scan it from another phone."}</p>
            </article>
          </div>
          <figure className="contact-brand-card">
            <div className="contact-brand-card-scroll">
              <img src="/assets/custom-service-contact-card.webp" alt={language === "zh" ? "Hobby Lobby 联系名片，含 Jackie Lee 电话、WhatsApp、微信二维码及义乌商贸城地址" : "Hobby Lobby contact card with Jackie Lee phone, WhatsApp, WeChat QR codes, and Yiwu showroom address"} width="2172" height="724" loading="lazy" decoding="async" />
            </div>
            <figcaption>
              <span>{language === "zh" ? "完整电话、地址与品牌资料" : "Complete phone, address, and brand details"}</span>
              <a href="/assets/custom-service-contact-card.webp" target="_blank" rel="noreferrer">{language === "zh" ? "打开高清名片" : "Open full-size card"} <ArrowRight weight="bold" /></a>
            </figcaption>
          </figure>
        </section>

        <section className="benefit-row section" aria-label={language === "zh" ? "产品卖点" : "Product benefits"}>{t.benefits.map(({ icon: Icon, title, text }) => <article key={title}><Icon weight="regular" /><h3>{title}</h3><p>{text}</p></article>)}</section>
      </main>

      <aside className={`selection-cart ${cartOpen ? "is-open" : "is-collapsed"}`} aria-label="已选花色">
        {!cartOpen ? (
          <button className="cart-fab" type="button" onClick={() => setCartOpen(true)} aria-expanded="false" aria-label={`展开购物车，当前共 ${totalCartons} 箱`}>
            <ShoppingCart weight="bold" />
            <span>购物车</span>
            <strong aria-live="polite">{totalCartons}</strong>
          </button>
        ) : <>
          <div className="selection-cart-head">
            <span><ShoppingCart weight="bold" /> 已选花色</span>
            <div className="cart-head-actions">
              <strong aria-live="polite">{totalCartons}</strong>
              <button className="cart-collapse" type="button" onClick={() => setCartOpen(false)} aria-expanded="true" aria-label="收起购物车"><X weight="bold" /></button>
            </div>
          </div>
          {selectedEntries.length === 0 ? (
            <p className="cart-empty">点击花色卡片里的容量按钮，这里会自动汇总客户选择的花色和容量。</p>
          ) : (
            <>
              <div className="cart-list">
                {selectedEntries.map(({ pattern, capacity, quantity }) => (
                  <div className="cart-item" key={`${pattern.id}-${capacity.id}`}>
                    <img src={pattern.thumb} alt="" width="640" height="640" loading="lazy" decoding="async" />
                    <div>
                      <strong>{pattern.name}</strong>
                      <small>319-{String(pattern.no).padStart(2, "0")} · {capacity.id} · {capacity.price} · {capacity.packing}</small>
                      <div className="qty-control">
                        <span>箱数</span>
                        <button type="button" onClick={(event) => { event.stopPropagation(); updateQuantity(pattern.id, capacity.id, quantity - 1); }} aria-label={`${pattern.name} ${capacity.id} 减少一箱`}>−</button>
                        <input value={quantity} inputMode="numeric" min="1" max="999" onChange={(event) => updateQuantity(pattern.id, capacity.id, event.target.value)} aria-label={`${pattern.name} ${capacity.id} 箱数`} />
                        <button type="button" onClick={(event) => { event.stopPropagation(); updateQuantity(pattern.id, capacity.id, quantity + 1); }} aria-label={`${pattern.name} ${capacity.id} 增加一箱`}>+</button>
                      </div>
                    </div>
                    <button className="cart-remove" type="button" onClick={() => removeSelectedCapacity(pattern.id, capacity.id)} aria-label={`移出 ${pattern.name} ${capacity.id}`}><Trash weight="bold" /></button>
                  </div>
                ))}
              </div>
              <div className="cart-actions">
                <button className="cart-export" type="button" onClick={exportWechatPdf}><DownloadSimple weight="bold" /> PDF 报价表</button>
                <button className="cart-export cart-export-secondary" type="button" onClick={exportSelectedDocument}><DownloadSimple weight="bold" /> Excel 报价表</button>
                <button className="cart-clear" type="button" onClick={() => { setSelectedCapacities({}); setSelectedQuantities({}); setExportStatus(""); }}>清空选款</button>
              </div>
              {exportStatus && <p className="export-status">{exportStatus}</p>}
            </>
          )}
        </>}
      </aside>

      <footer><img src="/assets/brand-logo.webp" alt="" width="256" height="256" loading="lazy" decoding="async" /><p>{t.footerText}</p><a href="#top">{language === "zh" ? "回到顶部" : "Back to top"} <ArrowRight weight="bold" /></a></footer>

      {expanded && <div className="lightbox-backdrop" role="presentation" onClick={closeExpanded}>
        <div className="lightbox-panel" role="dialog" aria-modal="true" aria-label={`${displayPatternName(expanded)} 大图`} onClick={(event) => event.stopPropagation()} onWheel={zoomLightbox}>
          <button className="lightbox-close" type="button" onClick={closeExpanded} aria-label="关闭大图"><X weight="bold" /></button>
          <span className="zoom-meter">{Math.round(zoom * 100)}% · {language === "zh" ? "滚轮缩放" : "Wheel to zoom"}</span>
          <div className="lightbox-image"><img src={expanded.displayImage} srcSet={`${expanded.thumb} 720w, ${expanded.displayImage} 1600w`} sizes="(max-width: 700px) 96vw, 80vw" alt={`${displayPatternName(expanded)} 大图`} decoding="async" fetchPriority="high" style={{ transform: `scale(${zoom})` }} /></div>
          <div className="lightbox-info">
            <div className="lightbox-pack">
              <span>PRICE / PACKING</span>
              {capacities.map((capacity) => (
                <button className={`pack-option ${isCapacitySelected(expanded.id, capacity.id) ? "active" : ""}`} type="button" key={capacity.id} onClick={() => toggleCapacity(expanded, capacity.id)} aria-pressed={isCapacitySelected(expanded.id, capacity.id)}>
                  <strong>{capacity.id}</strong><small>{capacity.price} · {capacity.packing}{isCapacitySelected(expanded.id, capacity.id) ? ` · ${getSelectedQuantity(expanded.id, capacity.id)} 箱` : ""}</small>
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
        <div className="quote-preview-panel" role="dialog" aria-modal="true" aria-label="PDF 报价单预览" onClick={(event) => event.stopPropagation()}>
          <div className="quote-preview-head">
            <div><strong>PDF 报价单</strong><small>适用于苹果 Safari、微信和电脑，照片已嵌入文件</small></div>
            <button className="quote-preview-close" type="button" onClick={closeQuotePreview} aria-label="关闭 PDF 预览"><X weight="bold" /></button>
          </div>
          <a className="quote-preview-tip" href={quotePreview.pdfUrl} download={quotePreview.fileName} target="_blank" rel="noopener">没有自动下载？点这里再次打开 / 下载 PDF</a>
          <div className="quote-preview-pages">
            {quotePreview.pages.map((page, index) => <img key={index} src={page.dataUri} alt={`报价单第 ${index + 1} 页`} width={page.width} height={page.height} />)}
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
