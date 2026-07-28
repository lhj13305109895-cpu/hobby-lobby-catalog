import { json, requireAdmin } from "./_shared.js";

export function onRequestGet(context) {
  return requireAdmin(context).then((auth) => auth.response || json({ authenticated: true, login: auth.login }));
}
