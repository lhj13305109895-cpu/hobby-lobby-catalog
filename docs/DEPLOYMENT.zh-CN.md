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
| `GITHUB_OAUTH_CLIENT_ID` | Variable | GitHub OAuth App 的 Client ID |
| `ADMIN_GITHUB_LOGINS` | Variable | 允许登录的 GitHub 用户名，多个用英文逗号分隔 |
| `GITHUB_TOKEN` | Secret | 仅仓库 Contents 读写 |
| `GITHUB_OAUTH_CLIENT_SECRET` | Secret | GitHub OAuth App 的 Client Secret，也用于签署 12 小时登录会话 |
| `SESSION_SECRET` | Secret | 可选；独立的 32 字符以上随机会话密钥 |
| `CF_ACCOUNT_ID` | Variable | 可选，查询 Pages 部署状态 |
| `CF_PAGES_PROJECT` | Variable | 可选，Pages 项目名 |
| `CF_API_TOKEN` | Secret | 可选，仅 Pages 部署只读权限 |

构建设置：

- Production branch：在控制台确认是 `main`。
- Build command：`npm run build`。
- Build output directory：`dist/client`。
- Root directory：仓库根目录。

## 3. GitHub OAuth 登录

GitHub → Settings → Developer settings → OAuth Apps → New OAuth App：

- Application name：`Hobby Lobby Mobile Admin`
- Homepage URL：`https://hobby-lobby-catalog.pages.dev`
- Authorization callback URL：`https://hobby-lobby-catalog.pages.dev/api/admin/callback`

创建后，将 Client ID 保存为 Cloudflare Plaintext `GITHUB_OAUTH_CLIENT_ID`，生成 Client Secret 并立即保存为 Cloudflare Secret `GITHUB_OAUTH_CLIENT_SECRET`。不要把 Client Secret 发到聊天或提交到 Git。

`ADMIN_GITHUB_LOGINS` 填允许登录的 GitHub 用户名，例如 `lhj13305109895-cpu`。OAuth 只申请读取 GitHub 基本用户身份；用于提交产品的高权限 `GITHUB_TOKEN` 永远不会发送到浏览器。登录会话为 HttpOnly、Secure、SameSite Cookie，12 小时后自动失效。

## 4. 发布顺序

1. 将开发分支合并到 `main`。
2. GitHub 推送触发 Cloudflare Pages。
3. 确认构建成功。
4. 打开 `/admin`，点击“使用 GitHub 登录”。
5. 先创建一个隐藏测试产品，确认 GitHub 产生单个 commit。
6. 确认 Cloudflare 部署成功，再公开测试产品。

## 5. iPhone 主屏幕

Safari 打开 `/admin` → 分享 → 添加到主屏幕。项目已提供 Web App Manifest、主题色、Apple Web App 元信息和图标。
