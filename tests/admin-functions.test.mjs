import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as session } from "../functions/api/admin/session.js";
import { onRequestPost as publish } from "../functions/api/admin/publish.js";
import { createSessionToken } from "../functions/api/admin/_shared.js";

const request = (cookie, body) => new Request("https://example.com/api/admin/publish", {
  method: body ? "POST" : "GET",
  headers: cookie ? { cookie, "content-type": "application/json" } : {},
  body: body ? JSON.stringify(body) : undefined,
});
const env = { ADMIN_GITHUB_LOGINS: "owner", SESSION_SECRET: "test-session-secret-at-least-32-characters", GITHUB_OWNER: "owner", GITHUB_REPO: "repo", GITHUB_BRANCH: "main", GITHUB_TOKEN: "test" };

const adminCookie = async (login = "owner") => `hobby_admin_session=${await createSessionToken(env, login)}`;

test("session rejects visitors without a signed GitHub OAuth session", async () => {
  const response = await session({ request: request() , env });
  assert.equal(response.status, 401);
});

test("session accepts an allow-listed GitHub administrator", async () => {
  const response = await session({ request: request(await adminCookie("OWNER")), env });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).login, "owner");
});

test("session rejects a signed but unapproved GitHub account", async () => {
  const response = await session({ request: request(await adminCookie("intruder")), env });
  assert.equal(response.status, 401);
});

test("publish protects the uncategorized category", async () => {
  const response = await publish({ request: request(await adminCookie(), {
    products: [], categories: [], files: [], message: "test", idempotencyKey: "12345678-1234-1234-1234-123456789012",
  }), env });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /待分类/);
});

test("publish rejects unsafe upload paths before contacting GitHub", async () => {
  const categories = [{ categoryId: "uncategorized", slug: "uncategorized", protected: true }];
  const response = await publish({ request: request(await adminCookie(), {
    products: [], categories, files: [{ path: "src/App.jsx", content: "YWJj" }], message: "test",
    idempotencyKey: "12345678-1234-1234-1234-123456789012",
  }), env });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /不安全/);
});

test("publish rejects duplicate catalogue numbers before contacting GitHub", async () => {
  const categories = [{ categoryId: "uncategorized", slug: "uncategorized", protected: true }];
  const products = [
    { productId: "product-one", slug: "319-88", categoryId: "uncategorized" },
    { productId: "product-two", slug: "319-88", categoryId: "uncategorized" },
  ];
  const response = await publish({ request: request(await adminCookie(), {
    products, categories, files: [], message: "test", idempotencyKey: "12345678-1234-1234-1234-123456789012",
  }), env });
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /产品编号/);
});
