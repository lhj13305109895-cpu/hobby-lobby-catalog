import { errorResponse, json, requireAdmin } from "../_shared.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    const { CF_ACCOUNT_ID, CF_API_TOKEN, CF_PAGES_PROJECT } = context.env;
    if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !CF_PAGES_PROJECT) return json({ status: "unknown", message: "未配置 Cloudflare 部署状态查询变量" });
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}/deployments?per_page=10`, {
      headers: { authorization: `Bearer ${CF_API_TOKEN}` },
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw Object.assign(new Error("Cloudflare 部署状态查询失败"), { status: 502 });
    const deployment = payload.result.find((item) => item.deployment_trigger?.metadata?.commit_hash?.startsWith(context.params.sha));
    if (!deployment) return json({ status: "pending", message: "等待 Cloudflare 创建部署" });
    const status = deployment.latest_stage?.status || deployment.stages?.at(-1)?.status || "pending";
    return json({ status, url: deployment.url, id: deployment.id });
  } catch (error) { return errorResponse(error); }
}
