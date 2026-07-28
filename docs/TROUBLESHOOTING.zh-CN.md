# 常见错误排查

- “管理员身份无效”：确认 `/admin*` 和 `/api/admin/*` 都受 Cloudflare Access 保护，邮箱同时存在于 Access Policy 与 `ADMIN_EMAILS`。
- “GitHub 授权失败”：检查 `GITHUB_TOKEN` 是 Cloudflare Secret、未过期、只授权正确仓库且 Contents 为读写。
- “GitHub 保存冲突”：后台提交期间有人更新了 `main`；刷新后台读取新版本后重做本次编辑。
- “Cloudflare 状态未知”：补充 `CF_ACCOUNT_ID`、`CF_PAGES_PROJECT`、只读 `CF_API_TOKEN`。不影响 Git push 自动部署。
- 上传失败：检查文件非空、单张不超过 25MB、格式是 PNG/JPG/JPEG/WebP/HEIC/HEIF；损坏 HEIC 先在 iPhone 照片中导出副本再试。
- 图片上传后资料未保存：接口使用单个 Git commit 写入图片和 JSON；失败不会显示成功。刷新前保留草稿，重新发布。
- 重复点击：处理时按钮禁用；服务端 commit 带请求 ID，成功请求重放会返回原 SHA。
- 新分类没显示：检查分类 `enabled` 与 `visible`，并至少有一个公开产品属于该分类。
- 产品找不到：检查产品 `visible`、分类启用/显示状态，以及 Cloudflare 最新部署是否成功。
- Safari 键盘遮挡：关闭其他浮层，滚动到字段；底部发布栏使用安全区并保持固定。输入字号不低于 16px，避免自动缩放。
- 构建失败：本地运行 `npm run build`；若是旧 `test:sites` 报 `worker/index.js` 不存在，这是仓库原有 Sites 原型测试配置问题，不是 Pages Functions 路由。
