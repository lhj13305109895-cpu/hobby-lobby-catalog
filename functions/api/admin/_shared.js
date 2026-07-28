const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

export function requireAdmin(context) {
  const email = context.request.headers.get("cf-access-authenticated-user-email")?.trim().toLowerCase();
  const allowed = String(context.env.ADMIN_EMAILS || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (!email || !allowed.includes(email)) return { response: json({ error: "管理员身份无效或登录已过期，请重新登录。" }, 401) };
  return { email };
}

export function errorResponse(error) {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  return json({ error: status >= 500 ? "服务端保存失败，请稍后重试并检查 Cloudflare 日志。" : error.message }, status);
}

export { json };
