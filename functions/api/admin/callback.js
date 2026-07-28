import { cookieValue, createSessionToken, json, sessionCookieHeader } from "./_shared.js";
import { stateCookie } from "./login.js";

const clearState = `${stateCookie}=; Path=/api/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
const fail = (origin, message) => new Response(null, { status: 302, headers: {
  location: `${origin}/admin?auth_error=${encodeURIComponent(message)}`, "cache-control": "no-store", "set-cookie": clearState,
} });

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const expectedState = cookieValue(context.request, stateCookie);
  if (!code || !state || state !== expectedState) return fail(requestUrl.origin, "GitHub 登录状态无效，请重新登录");
  for (const key of ["GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET", "ADMIN_GITHUB_LOGINS"]) {
    if (!context.env[key]) return fail(requestUrl.origin, `缺少服务端环境变量 ${key}`);
  }
  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: {
      accept: "application/json", "content-type": "application/json", "user-agent": "hobby-lobby-catalog-admin",
    }, body: JSON.stringify({ client_id: context.env.GITHUB_OAUTH_CLIENT_ID, client_secret: context.env.GITHUB_OAUTH_CLIENT_SECRET,
      code, redirect_uri: `${requestUrl.origin}/api/admin/callback` }) });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error("GitHub 授权码兑换失败");
    const userResponse = await fetch("https://api.github.com/user", { headers: {
      authorization: `Bearer ${tokenData.access_token}`, accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28", "user-agent": "hobby-lobby-catalog-admin",
    } });
    const user = await userResponse.json();
    if (!userResponse.ok || !user.login) throw new Error("无法读取 GitHub 用户身份");
    const allowed = String(context.env.ADMIN_GITHUB_LOGINS).split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(String(user.login).toLowerCase())) return fail(requestUrl.origin, "这个 GitHub 账号没有后台权限");
    const session = await createSessionToken(context.env, user.login);
    const headers = new Headers({ location: `${requestUrl.origin}/admin`, "cache-control": "no-store" });
    headers.append("set-cookie", sessionCookieHeader(session));
    headers.append("set-cookie", clearState);
    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error(error);
    return fail(requestUrl.origin, "GitHub 登录失败，请稍后重试");
  }
}
