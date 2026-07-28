import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as session } from "../functions/api/admin/session.js";
import { onRequestPost as publish } from "../functions/api/admin/publish.js";

const request = (email, body) => new Request("https://example.com/api/admin/publish", {
  method: body ? "POST" : "GET",
  headers: email ? { "cf-access-authenticated-user-email": email, "content-type": "application/json" } : {},
  body: body ? JSON.stringify(body) : undefined,
});
const env = { ADMIN_EMAILS: "owner@example.com", GITHUB_OWNER: "owner", GITHUB_REPO: "repo", GITHUB_BRANCH: "main", GITHUB_TOKEN: "test" };

test("session rejects visitors without Cloudflare Access identity", async () => {
  const response = await session({ request: request() , env });
  assert.equal(response.status, 401);
});

test("session accepts an allow-listed administrator", async () => {
  const response = await session({ request: request("OWNER@example.com"), env });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).email, "owner@example.com");
});

test("publish protects the uncategorized category", async () => {
  const response = await publish({ request: request("owner@example.com", {
    products: [], categories: [], files: [], message: "test", idempotencyKey: "12345678-1234-1234-1234-123456789012",
  }), env });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /待分类/);
});

test("publish rejects unsafe upload paths before contacting GitHub", async () => {
  const categories = [{ categoryId: "uncategorized", slug: "uncategorized", protected: true }];
  const response = await publish({ request: request("owner@example.com", {
    products: [], categories, files: [{ path: "src/App.jsx", content: "YWJj" }], message: "test",
    idempotencyKey: "12345678-1234-1234-1234-123456789012",
  }), env });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /不安全/);
});
