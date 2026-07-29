import { errorResponse, json, requireAdmin } from "./_shared.js";

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const githubHeaders = (token) => ({
  authorization: `Bearer ${token}`,
  accept: "application/vnd.github+json",
  "content-type": "application/json",
  "x-github-api-version": "2022-11-28",
  "user-agent": "hobby-lobby-catalog-admin",
});

function utf8Base64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

async function github(env, path, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}${path}`, {
    ...options, headers: { ...githubHeaders(env.GITHUB_TOKEN), ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(response.status === 401 || response.status === 403
      ? "GitHub 授权失败，请检查服务端 Token 权限。" : `GitHub 保存失败：${payload.message || response.status}`);
    error.status = response.status === 409 || response.status === 422 ? 409 : 502;
    throw error;
  }
  return payload;
}

function validate(products, categories, files) {
  if (!Array.isArray(products) || !Array.isArray(categories) || !Array.isArray(files)) throw Object.assign(new Error("提交数据格式不正确"), { status: 400 });
  const categoryIds = new Set();
  const slugs = new Set();
  for (const category of categories) {
    if (!idPattern.test(category.categoryId) || !idPattern.test(category.slug)) throw Object.assign(new Error("分类 ID 或 slug 格式不正确"), { status: 400 });
    if (categoryIds.has(category.categoryId) || slugs.has(category.slug)) throw Object.assign(new Error("分类 ID 或 slug 重复"), { status: 409 });
    categoryIds.add(category.categoryId); slugs.add(category.slug);
  }
  if (!categories.some((item) => item.categoryId === "uncategorized" && item.protected)) throw Object.assign(new Error("受保护的待分类分类不能删除"), { status: 400 });
  const productIds = new Set();
  const productSlugs = new Set();
  for (const product of products) {
    if (!idPattern.test(product.productId) || productIds.has(product.productId)) throw Object.assign(new Error("产品 ID 格式不正确或重复"), { status: 409 });
    if (!/^319-\d{2,3}$/.test(product.slug) || productSlugs.has(product.slug)) throw Object.assign(new Error("产品编号格式不正确或重复"), { status: 409 });
    if (!categoryIds.has(product.categoryId)) throw Object.assign(new Error(`产品 ${product.productId} 的分类不存在`), { status: 400 });
    productIds.add(product.productId); productSlugs.add(product.slug);
  }
  let bytes = 0;
  for (const file of files) {
    if (!/^public\/assets\/uploads\/[a-z0-9][a-z0-9.-]*$/.test(file.path) || !/^[A-Za-z0-9+/=]+$/.test(file.content)) throw Object.assign(new Error("图片路径或内容不安全"), { status: 400 });
    bytes += Math.ceil(file.content.length * 0.75);
  }
  if (bytes > 45 * 1024 * 1024) throw Object.assign(new Error("本次图片总量超过 45MB，请分批发布"), { status: 413 });
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    const env = context.env;
    for (const key of ["GITHUB_OWNER", "GITHUB_REPO", "GITHUB_TOKEN", "GITHUB_BRANCH"]) {
      if (!env[key]) throw Object.assign(new Error(`缺少服务端环境变量 ${key}`), { status: 503 });
    }
    const body = await context.request.json();
    const { products, categories, files = [], idempotencyKey } = body;
    validate(products, categories, files);
    if (!/^[a-f0-9-]{20,64}$/i.test(idempotencyKey || "")) throw Object.assign(new Error("发布请求标识无效"), { status: 400 });
    const ref = await github(env, `/git/ref/heads/${encodeURIComponent(env.GITHUB_BRANCH)}`);
    const head = await github(env, `/git/commits/${ref.object.sha}`);
    if (head.message?.includes(`[request:${idempotencyKey}]`)) return json({ ok: true, sha: head.sha, shortSha: head.sha.slice(0, 7), duplicate: true });

    const entries = [
      { path: "src/data/products.json", content: utf8Base64(`${JSON.stringify(products, null, 2)}\n`) },
      { path: "src/data/categories.json", content: utf8Base64(`${JSON.stringify(categories, null, 2)}\n`) },
      ...files,
    ];
    const blobs = await Promise.all(entries.map(async (entry) => ({ path: entry.path, mode: "100644", type: "blob",
      sha: (await github(env, "/git/blobs", { method: "POST", body: JSON.stringify({ content: entry.content, encoding: "base64" }) })).sha })));
    const tree = await github(env, "/git/trees", { method: "POST", body: JSON.stringify({ base_tree: head.tree.sha, tree: blobs }) });
    const cleanMessage = String(body.message || "Update catalogue from mobile admin").replace(/[\r\n]+/g, " ").slice(0, 160);
    const commit = await github(env, "/git/commits", { method: "POST", body: JSON.stringify({
      message: `${cleanMessage}\n\nAdmin: GitHub @${auth.login}\n[request:${idempotencyKey}]`, tree: tree.sha, parents: [head.sha],
    }) });
    await github(env, `/git/refs/heads/${encodeURIComponent(env.GITHUB_BRANCH)}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
    return json({ ok: true, sha: commit.sha, shortSha: commit.sha.slice(0, 7) });
  } catch (error) { return errorResponse(error); }
}
