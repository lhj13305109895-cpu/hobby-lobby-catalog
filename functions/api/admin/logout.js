import { json, sessionCookieHeader } from "./_shared.js";

export function onRequestPost() {
  const response = json({ ok: true });
  response.headers.append("set-cookie", sessionCookieHeader("", 0));
  return response;
}
