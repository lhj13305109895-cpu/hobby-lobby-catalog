import { json } from "./_shared.js";

const stateCookie = "hobby_admin_oauth_state";
const randomState = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export function onRequestGet(context) {
  if (!context.env.GITHUB_OAUTH_CLIENT_ID) return json({ error: "缺少 GITHUB_OAUTH_CLIENT_ID，管理员登录尚未配置。" }, 503);
  const url = new URL(context.request.url);
  const state = randomState();
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", context.env.GITHUB_OAUTH_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${url.origin}/api/admin/callback`);
  authorize.searchParams.set("scope", "read:user");
  authorize.searchParams.set("state", state);
  return new Response(null, { status: 302, headers: {
    location: authorize.toString(),
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "set-cookie": `${stateCookie}=${state}; Path=/api/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  } });
}

export { stateCookie };
