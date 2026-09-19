import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("package scripts include release gate", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(typeof pkg.scripts["release:gate"], "string");
  assert.match(pkg.scripts["release:gate"], /typecheck/);
  assert.match(pkg.scripts["release:gate"], /lint/);
  assert.match(pkg.scripts["release:gate"], /test/);
  assert.match(pkg.scripts["release:gate"], /build/);
});

test("critical HSE resource mappings remain registered", async () => {
  const source = await readFile(new URL("../api/_lib/resource-map.ts", import.meta.url), "utf8");
  for (const key of ["hse-actions", "ptw-permits", "fire-devices", "risk-register", "monthly-hse-reports"]) {
    assert.ok(source.includes(`"${key}"`), `missing resource ${key}`);
  }
});

test("security headers remain configured", async () => {
  const vercel = await readFile(new URL("../vercel.json", import.meta.url), "utf8");
  assert.ok(vercel.includes("Content-Security-Policy"));
  assert.ok(vercel.includes("X-Frame-Options"));
  assert.ok(vercel.includes("X-Content-Type-Options"));
});
