const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

const sessionCookie = "hobby_admin_session";
const encoder = new TextEncoder();

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left[index] ^ right[index];
  return result === 0;
}

export function cookieValue(request, name) {
  const item = String(request.headers.get("cookie") || "").split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}

export async function createSessionToken(env, login, lifetimeSeconds = 12 * 60 * 60) {
  const secret = env.SESSION_SECRET || env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!secret || String(secret).length < 32) throw Object.assign(new Error("登录会话密钥必须至少 32 个字符"), { status: 503 });
  const payload = base64Url(encoder.encode(JSON.stringify({ login: String(login).toLowerCase(), exp: Math.floor(Date.now() / 1000) + lifetimeSeconds })));
  return `${payload}.${base64Url(await hmac(secret, payload))}`;
}

export async function requireAdmin(context) {
  try {
    const secret = context.env.SESSION_SECRET || context.env.GITHUB_OAUTH_CLIENT_SECRET;
    if (!secret || String(secret).length < 32) throw new Error("missing session secret");
    const token = cookieValue(context.request, sessionCookie);
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) throw new Error("invalid session");
    if (!constantTimeEqual(fromBase64Url(signature), await hmac(secret, payload))) throw new Error("invalid signature");
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    const allowed = String(context.env.ADMIN_GITHUB_LOGINS || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (!data.login || data.exp <= Math.floor(Date.now() / 1000) || !allowed.includes(String(data.login).toLowerCase())) throw new Error("expired session");
    return { login: String(data.login).toLowerCase() };
  } catch {
    return { response: json({ error: "管理员登录无效或已过期，请重新使用 GitHub 登录。" }, 401) };
  }
}

export const sessionCookieHeader = (token, maxAge = 12 * 60 * 60) => `${sessionCookie}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

export function errorResponse(error) {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  return json({ error: status >= 500 ? "服务端保存失败，请稍后重试并检查 Cloudflare 日志。" : error.message }, status);
}

export { json };
