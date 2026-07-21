import {
  clampMaxOutputTokens,
  classifyOpenAiError,
  classifyOpenAiNetworkError,
  redactOpenAiLogText,
} from "@/lib/openai/responses-api";
import {
  resolvePlatformOpenAiForRole,
  type PlatformOpenAiResolveResult,
} from "@/lib/platform/openai-brain";
import type { PlatformBrainRoleId } from "@/lib/platform/ai-providers-constants";
import {
  assertRestaurantAiAccess,
  recordRestaurantAiUsage,
} from "@/lib/restaurant-ai-access/service";
import { ESTIMATED_COST_PER_REQUEST_SAR } from "@/lib/restaurant-ai-access/constants";

export type OpenAiToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type OpenAiResponsesResult =
  | {
      ok: true;
      text: string;
      toolCalls: OpenAiToolCall[];
      rawResponseId?: string;
      modelId: string;
    }
  | { ok: false; message: string; resolve?: PlatformOpenAiResolveResult };

function parseToolCalls(output: unknown[]): OpenAiToolCall[] {
  const calls: OpenAiToolCall[] = [];
  for (const item of output) {
    const row = item as Record<string, unknown>;
    if (row.type === "function_call") {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(String(row.arguments || "{}"));
      } catch {
        args = {};
      }
      calls.push({
        id: String(row.call_id || row.id || calls.length),
        name: String(row.name),
        arguments: args,
      });
    }
  }
  return calls;
}

function extractText(output: unknown[]): string {
  const parts: string[] = [];
  for (const item of output) {
    const row = item as Record<string, unknown>;
    if (row.type === "message") {
      const content = row.content as Array<{ type?: string; text?: string }> | undefined;
      for (const block of content || []) {
        if (block.type === "output_text" && block.text) parts.push(block.text);
        if (block.text && !block.type) parts.push(block.text);
      }
    }
  }
  return parts.join("\n").trim();
}

export async function callPlatformOpenAiResponses(params: {
  role: PlatformBrainRoleId;
  restaurantId?: string;
  input: string | unknown[];
  instructions?: string;
  tools?: unknown[];
  maxOutputTokens?: number;
  store?: boolean;
  previousResponseId?: string;
  toolOutputs?: Array<{ callId: string; output: unknown }>;
  logTag?: string;
}): Promise<OpenAiResponsesResult> {
  if (params.restaurantId) {
    const access = await assertRestaurantAiAccess({
      restaurantId: params.restaurantId,
      roleId: params.role,
    });
    if (!access.ok) {
      return { ok: false, message: access.message };
    }
  }

  const resolved = await resolvePlatformOpenAiForRole(params.role);
  if (!resolved.ok) {
    return { ok: false, message: resolved.message, resolve: resolved };
  }

  const body: Record<string, unknown> = {
    model: resolved.modelId,
    store: params.store ?? true,
    max_output_tokens: clampMaxOutputTokens(params.maxOutputTokens),
  };

  if (params.instructions) body.instructions = params.instructions;

  if (params.tools?.length) body.tools = params.tools;

  if (params.previousResponseId && params.toolOutputs?.length) {
    body.previous_response_id = params.previousResponseId;
    body.input = params.toolOutputs.map((t) => ({
      type: "function_call_output",
      call_id: t.callId,
      output: typeof t.output === "string" ? t.output : JSON.stringify(t.output),
    }));
  } else {
    body.input = params.input;
  }

  const tag = params.logTag || "openai";

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resolved.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const classified = classifyOpenAiError(res.status, errText);
      console.error(`[${tag}] OpenAI error`, res.status, redactOpenAiLogText(errText));
      return { ok: false, message: classified.message };
    }

    const data = (await res.json()) as { id?: string; output?: unknown[] };
    const output = data.output || [];

    if (params.restaurantId) {
      await recordRestaurantAiUsage({
        restaurantId: params.restaurantId,
        roleId: params.role,
        estimatedCostSar: ESTIMATED_COST_PER_REQUEST_SAR,
      });
    }

    return {
      ok: true,
      text: extractText(output),
      toolCalls: parseToolCalls(output),
      rawResponseId: data.id,
      modelId: resolved.modelId,
    };
  } catch (e) {
    const classified = classifyOpenAiNetworkError(e);
    console.error(`[${tag}] OpenAI network error`, classified.kind);
    return { ok: false, message: classified.message };
  }
}

/** Simple text completion via Responses API (no tools). */
export async function callPlatformOpenAiText(params: {
  role: PlatformBrainRoleId;
  restaurantId?: string;
  instructions: string;
  userMessage: string;
  maxOutputTokens?: number;
  logTag?: string;
}): Promise<OpenAiResponsesResult> {
  return callPlatformOpenAiResponses({
    role: params.role,
    restaurantId: params.restaurantId,
    instructions: params.instructions,
    input: params.userMessage,
    maxOutputTokens: params.maxOutputTokens ?? 512,
    store: false,
    logTag: params.logTag,
  });
}
