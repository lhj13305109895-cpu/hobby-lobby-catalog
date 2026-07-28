import { json, requireAdmin } from "./_shared.js";

export function onRequestGet(context) {
  const auth = requireAdmin(context);
  if (auth.response) return auth.response;
  return json({ authenticated: true, email: auth.email });
}
