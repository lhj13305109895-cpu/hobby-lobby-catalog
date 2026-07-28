# 第一次部署与安全配置

## 1. GitHub Token

在 GitHub 创建 Fine-grained personal access token：

- Repository access：只选择 `hobby-lobby-catalog`。
- Repository permissions：Contents = Read and write；其余保持最小权限。
- 设置合理过期时间并定期轮换。
- 不要把 Token 发到聊天、写进 `.env.example` 或提交到 Git。

## 2. Cloudflare Pages 环境变量

Pages 项目 → Settings → Variables and Secrets，生产环境配置：

| 名称 | 类型 | 用途 |
|---|---|---|
| `GITHUB_OWNER` | Variable | GitHub 用户/组织名 |
| `GITHUB_REPO` | Variable | `hobby-lobby-catalog` |
| `GITHUB_BRANCH` | Variable | 通常为 `main` |
| `ADMIN_EMAILS` | Variable | 允许登录的邮箱，多个用英文逗号分隔 |
| `GITHUB_TOKEN` | Secret | 仅仓库 Contents 读写 |
| `CF_ACCOUNT_ID` | Variable | 可选，查询 Pages 部署状态 |
| `CF_PAGES_PROJECT` | Variable | 可选，Pages 项目名 |
| `CF_API_TOKEN` | Secret | 可选，仅 Pages 部署只读权限 |

构建设置：

- Production branch：在控制台确认是 `main`。
- Build command：`npm run build`。
- Build output directory：`dist/client`。
- Root directory：仓库根目录。

## 3. Cloudflare Access

Zero Trust → Access → Applications 新建 Self-hosted 应用：

- 域名路径一：`hobby-lobby-catalog.pages.dev/admin*`
- 域名路径二：`hobby-lobby-catalog.pages.dev/api/admin/*`
- Allow policy：只允许 `ADMIN_EMAILS` 中相同的管理员邮箱。
- 会话建议 8–24 小时；过期后重新验证。

必须同时保护 `/admin*` 与 `/api/admin/*`。Function 还会再次核对 Cloudflare 注入的登录邮箱。

## 4. 发布顺序

1. 将开发分支合并到 `main`。
2. GitHub 推送触发 Cloudflare Pages。
3. 确认构建成功。
4. 打开 `/admin`，通过 Access 登录。
5. 先创建一个隐藏测试产品，确认 GitHub 产生单个 commit。
6. 确认 Cloudflare 部署成功，再公开测试产品。

## 5. iPhone 主屏幕

Safari 打开 `/admin` → 分享 → 添加到主屏幕。项目已提供 Web App Manifest、主题色、Apple Web App 元信息和图标。
