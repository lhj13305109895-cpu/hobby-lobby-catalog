# 产品管理后台实施报告

## 现状检查

- 技术框架：React 19 + Vite 6，单页应用，生产输出为 `dist/client`。
- 原产品数据：83 个产品全部写在 `src/App.jsx` 的 `catalogue` 数组中。
- 原分类数据：11 个系列名称分散在每个产品的 `family` 字段及中英文映射中，没有独立分类表。
- 图片位置：`public/assets`。旧产品有列表缩略图 `today-thumb-*`、展示图 `today-pattern-*`；新增产品使用 `new-thumb-*`、`new-pattern-*-display.jpg`，部分保留 PNG 原图。
- 中英文：React `language` 状态在页面内切换；页面文案有中英两套配置。旧产品大多没有独立英文名称，英文端原来按“英文分类 + 编号”回退；第 72–84 款有 `nameEn`。
- 图片优化：已有 WebP（品牌、首屏、钢壶展示）、560px 左右 JPG 缩略图、`loading="lazy"`、`decoding="async"`、固定宽高和缓存头。首个系列使用 eager/high priority。原来没有 `srcset` 与 `sizes`。
- 缓存：`public/_headers` 对 `/assets/*` 设置 30 天缓存及 7 天 stale-while-revalidate。
- 原图慢的主因：部分 PNG 为 1.1–3.0MB；若详情直接加载会慢。原列表已用缩略图规避该问题。
- 仓库可确认的部署信息：`main` 跟踪 `origin/main`；构建命令为 `npm run build`，输出 `dist/client`。Cloudflare 控制台里的生产分支无法从仓库文件读取，需在 Pages 设置中确认（按当前 Git 结构应设为 `main`）。

## 采用方案

采用自建 `/admin` + GitHub OAuth + Cloudflare Pages Functions + GitHub Git Data API。

原因：现有前台高度定制，后台需要产品与分类联动、图片批量处理、一次 commit、删除保护、草稿和部署状态。该方案继续使用 GitHub 历史与 Cloudflare Pages，不需要传统服务器、Cloudflare Zero Trust 付费资料或 AI。管理员通过 GitHub OAuth 登录；浏览器只向同域 Pages Function 提交数据，OAuth Secret、会话 Secret、GitHub Token 与 Cloudflare Token 只保存在 Cloudflare Secret 中。

## 数据迁移

- `src/data/products.json`：83 个产品，稳定 `productId`，名称修改不会改变 ID。
- `src/data/categories.json`：11 个原分类 + 1 个受保护的 `uncategorized`。
- `backups/pre-admin-2026-07-28/`：迁移快照，来源提交 `7828cab`。
- 前台改为读取统一 JSON；隐藏、停用分类自动从前台消失，新分类无需新建页面。
- 原前台中英文结构、价格、购物车、报价导出和页面设计均保留。

## 图片方案

- iPhone 选择 PNG/JPG/JPEG/WebP/HEIC/HEIF 后，在浏览器解码并按 EXIF 方向显示。
- 大图最长边 1600px、WebP 质量 0.86；缩略图最长边 720px、质量 0.84。
- 使用白底 contain 绘制，不裁切、不拉伸；文件名仅含小写字母、数字和短横线，并带产品 ID、时间戳与随机后缀。
- 可选保留原图；前台始终优先加载 WebP。
- 前台新增 `srcset`/`sizes`，保留 lazy、async、固定宽高和原缓存策略。
- 后台会显示每次上传处理前后的字节对比。未提供新测试图片，因此没有伪造全站“优化前后”数字。

## 已完成测试

- 生产构建：通过；后台 JS/CSS 独立按需加载，前台不会下载后台模块。
- 数据迁移校验：83 个产品、12 个分类，JSON 可解析。
- 安全单测：4/4 通过，包括未登录拒绝、管理员允许、待分类保护、危险上传路径拒绝。
- iPhone 尺寸（390×844）渲染：产品页、编辑页、分类页均无横向滚动；所有输入控件为 16px；发布栏固定且使用安全区；前台保持两列。
- 新建分类弹层：打开后已填写的中文产品名保持不变，分类表单完整显示。
- 本地 PNG 处理：用 80KB PNG 实测生成大图和缩略图合计约 20KB，状态显示 `0.08MB → 0.02MB`；未向 GitHub 提交该测试图。
- 前台图片：83 张卡片均渲染，卡片 `object-fit: contain`，首系列 eager、其余 lazy，`srcset`/`sizes` 生效；English 模式显示 11 个英文分类名。
- 线上只读核对：83 个产品、11 个可见分类、中英文切换与现有前台一致。
- 原仓库 `tests/sites-worker.test.mjs` 失败：它引用未跟踪且不存在的 `worker/index.js`，与本次 Pages Functions 实现无关，未将其写成通过。

## 尚需在真实账号环境完成

- GitHub OAuth App、环境变量和 Secret 必须由仓库/Cloudflare 账号管理员配置。
- 在配置完成并合并到生产分支前，无法真实产生 GitHub commit 或 Cloudflare 部署，也无法声称 iPhone 端端到端发布已通过。
- HEIC/HEIF 使用 iPhone Safari 的原生解码能力；损坏文件或很旧的 iOS 会给出中文错误。正式验收应使用实际常见 HEIC 样本测试。
- Cloudflare API Token 仅用于显示部署状态；不配置时自动部署仍会发生，但后台只能显示“GitHub 已保存，未配置状态查询”。

## 费用

小型目录通常可落在 GitHub 与 Cloudflare Pages 免费额度内。超出 Pages 构建、Functions 请求或 GitHub 存储/带宽配额后，按各平台当期价格计费；本方案不需要 Cloudflare Zero Trust、AI API 或传统服务器。
