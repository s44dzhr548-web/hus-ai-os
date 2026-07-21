/**
 * Unit checks for OpenAI Responses API helpers (no network, no secrets).
 */
import assert from "node:assert/strict";
import {
  clampMaxOutputTokens,
  classifyOpenAiError,
  classifyOpenAiNetworkError,
  redactOpenAiLogText,
} from "../src/lib/openai/responses-api.ts";

assert.equal(clampMaxOutputTokens(8), 16);
assert.equal(clampMaxOutputTokens(64), 64);
assert.equal(clampMaxOutputTokens(), 64);

const configErr = classifyOpenAiError(
  400,
  JSON.stringify({
    error: {
      message: "Invalid max_output_tokens: Expected a value >= 16, but got 8",
      type: "invalid_request_error",
    },
  })
);
assert.equal(configErr.kind, "config");
assert.equal(configErr.message, "خطأ إعداد في المنصة");
assert.equal(configErr.isInvalidKey, false);

const keyErr = classifyOpenAiError(
  401,
  JSON.stringify({ error: { code: "invalid_api_key", message: "Incorrect API key" } })
);
assert.equal(keyErr.kind, "invalid_key");
assert.equal(keyErr.isInvalidKey, true);

const quotaErr = classifyOpenAiError(
  429,
  JSON.stringify({ error: { code: "insufficient_quota", message: "You exceeded your current quota" } })
);
assert.equal(quotaErr.kind, "quota");
assert.equal(quotaErr.isInvalidKey, false);

const modelErr = classifyOpenAiError(
  404,
  JSON.stringify({ error: { code: "model_not_found", message: "The model `gpt-x` does not exist" } })
);
assert.equal(modelErr.kind, "model");

const networkErr = classifyOpenAiNetworkError(new DOMException("Timeout", "TimeoutError"));
assert.equal(networkErr.kind, "network");
assert.equal(networkErr.message, "تعذر الاتصال");

const redacted = redactOpenAiLogText('Bearer sk-proj-abc123 and "sk-testkey"');
assert.ok(!redacted.includes("sk-proj-abc123"));
assert.ok(redacted.includes("[REDACTED]"));

console.log("openai-responses-api-test: PASS");
