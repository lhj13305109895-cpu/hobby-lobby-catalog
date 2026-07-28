import { useEffect, useMemo, useRef, useState } from "react";
import productsSeed from "../data/products.json";
import categoriesSeed from "../data/categories.json";
import "./admin.css";

const draftKey = "hobby-lobby-admin-product-draft-v1";
const localPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const nowIso = () => new Date().toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));
const slugify = (value) => String(value || "item").toLowerCase().normalize("NFKD")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "item";
const newId = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 12)}`;

function blankProduct(categories) {
  const stamp = Date.now();
  return {
    productId: newId("product"), slug: `319-${stamp}`, nameZh: "", nameEn: "", model: "319",
    capacities: ["1.6L", "2.0L"], descriptionZh: "", descriptionEn: "",
    categoryId: categories.find((item) => item.enabled)?.categoryId || "uncategorized",
    bodyType: "白色壶身", mainImage: "", thumbnailImage: "", originalImage: "", detailImages: [],
    imageAltZh: "", imageAltEn: "", sortOrder: 9990, isNew: true, featured: false,
    pinned: false, visible: false, createdAt: nowIso(), updatedAt: nowIso(),
  };
}

function blankCategory() {
  return {
    categoryId: "", nameZh: "", nameEn: "", slug: "", descriptionZh: "", descriptionEn: "",
    sortOrder: 9990, enabled: true, visible: true, protected: false, createdAt: nowIso(), updatedAt: nowIso(),
  };
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `请求失败（${response.status}）`);
  return payload;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(blob);
  });
}

async function decodeImage(file) {
  try { return await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch {
    const url = URL.createObjectURL(file);
    try {
      return await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("无法解码图片；损坏的文件或当前浏览器不支持该 HEIC/HEIF 文件"));
        image.src = url;
      });
    } finally { URL.revokeObjectURL(url); }
  }
}

async function resizeToWebp(file, maxSide, quality) {
  const image = await decodeImage(file);
  const width = image.width || image.naturalWidth;
  const height = image.height || image.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob) throw new Error("当前 Safari 无法生成 WebP，请升级 iOS 后重试");
  return { blob, width: canvas.width, height: canvas.height };
}

async function optimizeUpload(file, product, role, index = 0, keepOriginal = false) {
  if (!file || file.size === 0) throw new Error("图片文件为空");
  if (file.size > 25 * 1024 * 1024) throw new Error("单张图片不能超过 25MB");
  const allowed = /image\/(png|jpe?g|webp|heic|heif)/i.test(file.type) || /\.(png|jpe?g|webp|heic|heif)$/i.test(file.name);
  if (!allowed) throw new Error(`不支持的图片格式：${file.name}`);
  const stamp = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
  const base = `${slugify(product.model)}-${slugify(product.productId)}-${stamp}-${role}${index ? `-${index}` : ""}`;
  const large = await resizeToWebp(file, 1600, 0.86);
  const thumb = role === "main" ? await resizeToWebp(file, 720, 0.84) : null;
  const files = [{ path: `public/assets/uploads/${base}.webp`, content: await blobToBase64(large.blob) }];
  let originalPath = "";
  if (keepOriginal) {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    originalPath = `/assets/uploads/${base}-original.${ext}`;
    files.push({ path: `public${originalPath}`, content: await blobToBase64(file) });
  }
  let thumbnailPath = "";
  if (thumb) {
    thumbnailPath = `/assets/uploads/${base}-thumb.webp`;
    files.push({ path: `public${thumbnailPath}`, content: await blobToBase64(thumb.blob) });
  }
  return { files, mainPath: `/assets/uploads/${base}.webp`, thumbnailPath, originalPath, before: file.size,
    after: large.blob.size + (thumb?.blob.size || 0), width: large.width, height: large.height, previewBlob: large.blob };
}

function Toggle({ label, checked, onChange }) {
  return <label className="admin-toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}

function ProductEditor({ initial, categories, onCancel, onCreateCategory, onPublish }) {
  const [form, setForm] = useState(() => clone(initial));
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [keepOriginal, setKeepOriginal] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewDetails, setPreviewDetails] = useState([]);
  const [showCategory, setShowCategory] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState(blankCategory());
  const dirty = useRef(false);
  const set = (key, value) => { dirty.current = true; setForm((current) => ({ ...current, [key]: value })); };

  useEffect(() => {
    const timer = window.setTimeout(() => localStorage.setItem(draftKey, JSON.stringify({ form, savedAt: nowIso() })), 400);
    return () => clearTimeout(timer);
  }, [form]);
  useEffect(() => {
    const warn = (event) => { if (dirty.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  async function handleImage(event, role) {
    const selected = [...event.target.files];
    if (!selected.length) return;
    setBusy(true); setStatus("正在修正方向并生成 WebP…");
    try {
      const results = [];
      for (let index = 0; index < selected.length; index += 1) results.push(await optimizeUpload(selected[index], form, role, index + 1, keepOriginal));
      setFiles((current) => [...current, ...results.flatMap((item) => item.files)]);
      if (role === "main") {
        if (previewImage.startsWith("blob:")) URL.revokeObjectURL(previewImage);
        setPreviewImage(URL.createObjectURL(results[0].previewBlob));
        setForm((current) => ({ ...current, mainImage: results[0].mainPath,
          thumbnailImage: results[0].thumbnailPath, originalImage: results[0].originalPath || results[0].mainPath }));
      } else {
        setPreviewDetails((current) => [...current, ...results.map((item) => URL.createObjectURL(item.previewBlob))]);
        setForm((current) => ({ ...current, detailImages: [...current.detailImages, ...results.map((item) => item.mainPath)] }));
      }
      const before = results.reduce((sum, item) => sum + item.before, 0);
      const after = results.reduce((sum, item) => sum + item.after, 0);
      setStatus(`图片处理完成：${(before / 1024 / 1024).toFixed(2)}MB → ${(after / 1024 / 1024).toFixed(2)}MB`);
      dirty.current = true;
    } catch (error) { setStatus(error.message); } finally { setBusy(false); event.target.value = ""; }
  }

  async function createCategory() {
    const id = categoryDraft.categoryId || slugify(categoryDraft.slug || categoryDraft.nameEn);
    const next = { ...categoryDraft, categoryId: id, slug: categoryDraft.slug || id, updatedAt: nowIso() };
    if (!next.nameZh || !next.nameEn) return setStatus("分类的中英文名称都必须填写");
    if (!idPattern.test(next.categoryId) || !idPattern.test(next.slug)) return setStatus("categoryId 和 slug 只能使用小写字母、数字和短横线");
    setBusy(true); setStatus("正在新建分类并提交 GitHub…");
    try {
      await onCreateCategory(next);
      set("categoryId", next.categoryId); setShowCategory(false); setStatus("分类已创建并自动选中，产品草稿已保留");
    } catch (error) { setStatus(error.message); } finally { setBusy(false); }
  }

  async function publish() {
    if (!form.nameZh || !form.categoryId || !form.mainImage) return setStatus("请填写中文名称、选择分类并上传主图");
    if (form.visible && (!form.nameEn || !form.imageAltEn)) {
      if (!confirm("英文名称或英文 alt 尚未填写。可以保存草稿；确定仍要公开发布吗？")) return;
    }
    setBusy(true); setStatus("正在保存到 GitHub…");
    try {
      await onPublish({ ...form, updatedAt: nowIso() }, files);
      localStorage.removeItem(draftKey); dirty.current = false; setStatus("已保存到 GitHub，Cloudflare 正在部署");
    } catch (error) { setStatus(`发布失败：${error.message}`); } finally { setBusy(false); }
  }

  return <div className="admin-editor">
    <header><button onClick={() => { if (!dirty.current || confirm("有未保存内容，确定离开吗？")) onCancel(); }}>← 返回</button><div><strong>{initial.nameZh ? "编辑产品" : "新增产品"}</strong><small>{form.productId}</small></div></header>
    <section className="upload-zone">
      {previewImage || form.mainImage ? <img src={previewImage || form.mainImage} alt="主图预览" /> : <div className="upload-placeholder">主图预览</div>}
      <label className="primary-action">选择产品主图<input type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif" onChange={(event) => handleImage(event, "main")} /></label>
      <label className="secondary-action">添加详情图<input type="file" multiple accept="image/*,.heic,.heif" onChange={(event) => handleImage(event, "detail")} /></label>
      <Toggle label="保留原始图片（前台仍加载 WebP）" checked={keepOriginal} onChange={setKeepOriginal} />
    </section>
    <section className="admin-form-grid">
      <label>中文产品名称<input value={form.nameZh} onChange={(e) => set("nameZh", e.target.value)} /></label>
      <label>英文产品名称<input value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} /></label>
      <label>产品型号<input value={form.model} onChange={(e) => set("model", e.target.value)} /></label>
      <label>容量（逗号分隔）<input value={form.capacities.join(", ")} onChange={(e) => set("capacities", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))} /></label>
      <label className="span-2">中文简介<textarea value={form.descriptionZh} onChange={(e) => set("descriptionZh", e.target.value)} /></label>
      <label className="span-2">英文简介<textarea value={form.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} /></label>
      <label>分类<select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>{categories.filter((c) => c.enabled).sort((a,b)=>a.sortOrder-b.sortOrder).map((c)=><option key={c.categoryId} value={c.categoryId}>{c.nameZh} / {c.nameEn}</option>)}</select></label>
      <button className="new-category" type="button" onClick={() => setShowCategory(!showCategory)}>＋ 新建分类</button>
      <label>图片 alt（中文）<input value={form.imageAltZh} onChange={(e) => set("imageAltZh", e.target.value)} /></label>
      <label>Image alt (English)<input value={form.imageAltEn} onChange={(e) => set("imageAltEn", e.target.value)} /></label>
      <label>排序值<input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} /></label>
      <div className="toggle-row"><Toggle label="新品" checked={form.isNew} onChange={(v)=>set("isNew",v)} /><Toggle label="推荐" checked={form.featured} onChange={(v)=>set("featured",v)} /><Toggle label="置顶" checked={form.pinned} onChange={(v)=>set("pinned",v)} /><Toggle label="公开显示" checked={form.visible} onChange={(v)=>set("visible",v)} /></div>
    </section>
    {showCategory && <section className="inline-category"><h3>新建分类</h3><label>中文名称<input value={categoryDraft.nameZh} onChange={(e)=>setCategoryDraft({...categoryDraft,nameZh:e.target.value})}/></label><label>英文名称<input value={categoryDraft.nameEn} onChange={(e)=>setCategoryDraft({...categoryDraft,nameEn:e.target.value})}/></label><label>categoryId<input value={categoryDraft.categoryId} onChange={(e)=>setCategoryDraft({...categoryDraft,categoryId:e.target.value.toLowerCase()})}/></label><label>slug<input value={categoryDraft.slug} onChange={(e)=>setCategoryDraft({...categoryDraft,slug:e.target.value.toLowerCase()})}/></label><label>排序<input type="number" value={categoryDraft.sortOrder} onChange={(e)=>setCategoryDraft({...categoryDraft,sortOrder:Number(e.target.value)})}/></label><Toggle label="立即显示" checked={categoryDraft.visible} onChange={(v)=>setCategoryDraft({...categoryDraft,visible:v})}/><button disabled={busy} onClick={createCategory}>保存分类</button></section>}
    {(previewDetails.length > 0 || form.detailImages.length > 0) && <section className="detail-previews">{(previewDetails.length ? previewDetails : form.detailImages).map((src)=><img key={src} src={src} alt="详情图预览" />)}</section>}
    <div className="publish-bar"><span aria-live="polite">{status}</span><button disabled={busy} onClick={publish}>{busy ? "处理中…" : "确认发布"}</button></div>
  </div>;
}

export function AdminApp() {
  const [products, setProducts] = useState(() => clone(productsSeed));
  const [categories, setCategories] = useState(() => clone(categoriesSeed));
  const [tab, setTab] = useState(() => window.location.pathname.includes("categories") ? "categories" : "products");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [status, setStatus] = useState("正在验证管理员身份…");
  const [authorized, setAuthorized] = useState(localPreview);
  const publishing = useRef(false);

  useEffect(() => {
    document.title = "产品管理后台 | Hobby Lobby";
    if (!localPreview) api("/api/admin/session").then((data)=>{
      if (!data.authenticated || !data.email) throw new Error("管理员会话响应无效");
      setAuthorized(true);setStatus(`已登录：${data.email}`);
    }).catch((e)=>{setAuthorized(false);setStatus(e.message);});
    else setStatus("本地预览模式（线上必须通过 Cloudflare Access）");
  }, []);
  const counts = useMemo(() => Object.fromEntries(categories.map((c)=>[c.categoryId, products.filter((p)=>p.categoryId===c.categoryId).length])), [products,categories]);
  const visibleProducts = useMemo(() => products.filter((p)=>(!filter||p.categoryId===filter)&&`${p.nameZh} ${p.nameEn} ${p.model} ${p.productId}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||a.sortOrder-b.sortOrder),[products,query,filter]);

  async function publish(nextProducts, nextCategories, files, message) {
    if (publishing.current) throw new Error("已有发布任务正在进行，请勿重复点击");
    publishing.current = true;
    try {
      const result = await api("/api/admin/publish", { method:"POST", body:JSON.stringify({ products:nextProducts, categories:nextCategories, files, message, idempotencyKey:crypto.randomUUID() }) });
      setStatus(`GitHub 已保存 ${result.shortSha}；Cloudflare 正在部署`);
      trackDeployment(result.sha);
      return result;
    } finally { publishing.current = false; }
  }
  async function trackDeployment(sha, attempt = 0) {
    try {
      const deployment = await api(`/api/admin/deployment/${sha}`);
      if (["success", "active"].includes(deployment.status)) return setStatus(`部署成功 · GitHub ${sha.slice(0,7)}`);
      if (["failure", "failed", "canceled"].includes(deployment.status)) return setStatus(`Cloudflare 部署失败；原线上版本保持不变 · GitHub ${sha.slice(0,7)}`);
      if (deployment.status === "unknown") return setStatus(`GitHub 已保存 ${sha.slice(0,7)}；未配置部署状态查询`);
    } catch (error) { if (attempt >= 9) return setStatus(`GitHub 已保存 ${sha.slice(0,7)}；部署状态查询失败：${error.message}`); }
    if (attempt < 9) window.setTimeout(() => trackDeployment(sha, attempt + 1), 6000);
    else setStatus(`GitHub 已保存 ${sha.slice(0,7)}；Cloudflare 仍在部署，请稍后查看`);
  }
  async function saveProduct(product, files=[]) {
    const exists = products.some((p)=>p.productId===product.productId);
    const next = exists ? products.map((p)=>p.productId===product.productId?product:p) : [...products,product];
    await publish(next,categories,files,`${exists?"Update":"Add"} product ${product.model} ${product.productId}`);
    setProducts(next); setEditing(null);
  }
  async function quickProduct(product, message) { const next=products.map((p)=>p.productId===product.productId?product:p); await publish(next,categories,[],message); setProducts(next); }
  async function createCategory(category) {
    if (categories.some((c)=>c.categoryId===category.categoryId||c.slug===category.slug)) throw new Error("categoryId 或 slug 已存在");
    const next=[...categories,category]; await publish(products,next,[],`Create category ${category.nameEn}`); setCategories(next);
  }
  async function saveCategory(category) {
    if (!idPattern.test(category.categoryId)||!idPattern.test(category.slug)) return setStatus("categoryId 和 slug 格式不正确");
    const duplicate=categories.some((c)=>c.categoryId!==category.categoryId&&c.slug===category.slug); if(duplicate)return setStatus("slug 已存在");
    const exists=categories.some((c)=>c.categoryId===category.categoryId); const next=exists?categories.map((c)=>c.categoryId===category.categoryId?{...category,updatedAt:nowIso()}:c):[...categories,{...category,createdAt:nowIso(),updatedAt:nowIso()}];
    try{await publish(products,next,[],`${exists?"Update":"Create"} category ${category.nameEn}`);setCategories(next);setEditingCategory(null);}catch(e){setStatus(e.message);}
  }
  async function deleteProduct(product){if(!confirm(`确定删除“${product.nameZh}”吗？图片不会自动删除。`))return;const next=products.filter((p)=>p.productId!==product.productId);await publish(next,categories,[],`Delete product ${product.productId}`);setProducts(next);}
  async function deleteCategory(category,targetId){const count=counts[category.categoryId]||0;if(category.protected)return setStatus("“待分类”是受保护分类，不能删除");if(count&&!targetId)return setStatus("该分类仍有产品，请先选择迁移目标");if(!confirm(`二次确认：${count?`迁移 ${count} 个产品并`:""}永久删除“${category.nameZh}”？`))return;const nextProducts=products.map((p)=>p.categoryId===category.categoryId?{...p,categoryId:targetId,updatedAt:nowIso()}:p);const nextCategories=categories.filter((c)=>c.categoryId!==category.categoryId);await publish(nextProducts,nextCategories,[],`Delete category ${category.nameEn}`);setProducts(nextProducts);setCategories(nextCategories);}
  function moveCategory(category,delta){const ordered=[...categories].sort((a,b)=>a.sortOrder-b.sortOrder);const index=ordered.findIndex((c)=>c.categoryId===category.categoryId);const swap=ordered[index+delta];if(!swap)return;const a=category.sortOrder;category={...category,sortOrder:swap.sortOrder};const next=categories.map((c)=>c.categoryId===category.categoryId?category:c.categoryId===swap.categoryId?{...swap,sortOrder:a}:c);publish(products,next,[],`Reorder category ${category.nameEn}`).then(()=>setCategories(next)).catch(e=>setStatus(e.message));}
  function positionCategory(category,where){const values=categories.filter((c)=>c.categoryId!==category.categoryId).map((c)=>c.sortOrder);const sortOrder=where==="top"?Math.min(...values,10)-10:Math.max(...values,0)+10;const next=categories.map((c)=>c.categoryId===category.categoryId?{...c,sortOrder,updatedAt:nowIso()}:c);publish(products,next,[],`Reorder category ${category.nameEn}`).then(()=>setCategories(next)).catch(e=>setStatus(e.message));}

  if (!authorized) return <main className="admin-auth"><h1>产品管理后台</h1><p>{status}</p><p>请通过 Cloudflare Access 登录管理员邮箱后刷新此页。</p></main>;
  if (editing) return <ProductEditor initial={editing} categories={categories} onCancel={()=>setEditing(null)} onCreateCategory={createCategory} onPublish={saveProduct}/>;
  return <main className="admin-shell">
    <header className="admin-top"><div><strong>Hobby Lobby 管理后台</strong><small>{status}</small></div><a href="/" target="_blank" rel="noreferrer">查看网站</a></header>
    <nav className="admin-tabs"><button className={tab==="products"?"active":""} onClick={()=>{history.pushState({},"","/admin");setTab("products");}}>产品管理</button><button className={tab==="categories"?"active":""} onClick={()=>{history.pushState({},"","/admin/categories");setTab("categories");}}>分类管理</button></nav>
    {tab==="products"?<>
      <section className="admin-toolbar"><input type="search" placeholder="搜索名称、型号或 ID" value={query} onChange={(e)=>setQuery(e.target.value)}/><select value={filter} onChange={(e)=>setFilter(e.target.value)}><option value="">全部分类</option>{categories.map((c)=><option key={c.categoryId} value={c.categoryId}>{c.nameZh}（{counts[c.categoryId]||0}）</option>)}</select><button className="primary-action" onClick={()=>{const saved=localStorage.getItem(draftKey);if(saved&&confirm("发现未发布草稿，是否恢复？")){try{setEditing(JSON.parse(saved).form);return;}catch{}}setEditing(blankProduct(categories));}}>＋ 新增产品</button></section>
      <section className="admin-list">{visibleProducts.map((p)=><article className="admin-card" key={p.productId}><img src={p.thumbnailImage||p.mainImage} alt=""/><div className="card-copy"><strong>{p.nameZh||"未命名产品"}</strong><small>{p.nameEn||"英文未填写"}</small><span>{p.model} · {categories.find((c)=>c.categoryId===p.categoryId)?.nameZh||"待分类"} · {p.visible?"显示":"隐藏"}</span></div><div className="card-actions"><a href={`/#${p.productId}`} target="_blank" rel="noreferrer">查看</a><button onClick={()=>setEditing(p)}>编辑</button><button onClick={()=>quickProduct({...p,visible:!p.visible,updatedAt:nowIso()},`${p.visible?"Hide":"Show"} product ${p.productId}`)}>{p.visible?"隐藏":"显示"}</button><button onClick={()=>setEditing({...clone(p),productId:newId("product"),slug:`${p.slug}-copy-${Date.now()}`,nameZh:`${p.nameZh} 副本`,visible:false,createdAt:nowIso(),updatedAt:nowIso()})}>复制</button><button className="danger" onClick={()=>deleteProduct(p)}>删除</button></div></article>)}</section>
    </>:<>
      <section className="admin-toolbar"><input type="search" placeholder="搜索分类" value={query} onChange={(e)=>setQuery(e.target.value)}/><button className="primary-action" onClick={()=>setEditingCategory(blankCategory())}>＋ 新建分类</button></section>
      {editingCategory&&<section className="category-editor"><h2>{editingCategory.categoryId?"编辑分类":"新建分类"}</h2>{["nameZh","nameEn","categoryId","slug","descriptionZh","descriptionEn"].map((key)=><label key={key}>{key}<input disabled={(key==="categoryId"&&categories.some((c)=>c.categoryId===editingCategory.categoryId))} value={editingCategory[key]} onChange={(e)=>setEditingCategory({...editingCategory,[key]:e.target.value})}/></label>)}<label>sortOrder<input type="number" value={editingCategory.sortOrder} onChange={(e)=>setEditingCategory({...editingCategory,sortOrder:Number(e.target.value)})}/></label><Toggle label="启用" checked={editingCategory.enabled} onChange={(v)=>setEditingCategory({...editingCategory,enabled:v})}/><Toggle label="前台显示" checked={editingCategory.visible} onChange={(v)=>setEditingCategory({...editingCategory,visible:v})}/><div><button onClick={()=>setEditingCategory(null)}>取消</button><button className="primary-action" onClick={()=>saveCategory(editingCategory)}>保存并发布</button></div></section>}
      <section className="admin-list">{categories.filter((c)=>`${c.nameZh} ${c.nameEn} ${c.categoryId}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.sortOrder-b.sortOrder).map((c)=><CategoryCard key={c.categoryId} category={c} count={counts[c.categoryId]||0} categories={categories} onEdit={()=>setEditingCategory(c)} onMove={moveCategory} onPosition={positionCategory} onDelete={deleteCategory} onToggle={(field)=>saveCategory({...c,[field]:!c[field]})}/>)}</section>
    </>}
  </main>;
}

function CategoryCard({category,count,categories,onEdit,onMove,onPosition,onDelete,onToggle}){
  const [target,setTarget]=useState("");
  return <article className="admin-card category-card"><div className="card-copy"><strong>{category.nameZh} / {category.nameEn}</strong><small>{category.categoryId} · /{category.slug}</small><span>{count} 个产品 · 排序 {category.sortOrder} · {category.enabled?"启用":"停用"} · {category.visible?"显示":"隐藏"}</span></div><div className="card-actions"><button onClick={onEdit}>编辑</button><button onClick={()=>onPosition(category,"top")}>置顶</button><button onClick={()=>onMove(category,-1)}>上移</button><button onClick={()=>onMove(category,1)}>下移</button><button onClick={()=>onPosition(category,"bottom")}>底部</button><button onClick={()=>onToggle("visible")}>{category.visible?"隐藏":"显示"}</button><button onClick={()=>onToggle("enabled")}>{category.enabled?"停用":"启用"}</button></div>{count>0&&<select value={target} onChange={(e)=>setTarget(e.target.value)}><option value="">删除前选择产品迁移目标</option>{categories.filter((c)=>c.categoryId!==category.categoryId&&c.enabled).map((c)=><option key={c.categoryId} value={c.categoryId}>{c.nameZh}</option>)}</select>}<button className="danger" disabled={category.protected} onClick={()=>onDelete(category,target)}>永久删除</button></article>;
}
