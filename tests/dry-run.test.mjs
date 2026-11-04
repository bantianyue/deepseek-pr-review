import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildCommentBody } = require("../dist/index.js");

const REVIEW_MARKER = "<!-- deepseek-pr-review:v1 -->";

test("buildCommentBody includes review marker", () => {
  const body = buildCommentBody("## Summary\nLooks good.");
  assert.ok(body.includes(REVIEW_MARKER));
  assert.ok(body.includes("DeepSeek PR Review"));
  assert.ok(body.includes("Looks good."));
});

test("REVIEW_MARKER is stable v1", () => {
  assert.equal(REVIEW_MARKER, "<!-- deepseek-pr-review:v1 -->");
});
