import { AI_TOOL_DEFINITIONS } from "@/lib/ai-assistant/tools";
import { sanitizeForOpenAi } from "@/lib/ai-assistant/security";

const SYSTEM_INSTRUCTIONS = `أنت "مساعد Menu OS الذكي" — مساعد تنفيذي لصاحب المطعم وطاقم الاستقبال.
- افهم الأوامر بالعربية ونفّذها عبر الأدوات المتاحة فقط.
- لا تنفّذ SQL أو أوامر Terminal أو تعديل ملفات.
- لا تحذف بيانات ولا تسترد مدفوعات ولا تعدّل اشتراكات أو صلاحيات.
- للقراءة والتقارير: نفّذ الأداة مباشرة.
- للتعديل (تعيين طاولة، تسجيل وصول، إنشاء/تعديل حجز، إرسال واتساب): سيتم طلب تأكيد المستخدم — جهّز الأداة بالمعاملات الصحيحة.
- أجب بالعربية بشكل مختصر ومهني مع عرض النتائج بوضوح.
- لا تكشف مفاتيح API أو tokens.`;

export type OpenAiToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type OpenAiTurnResult = {
  text: string;
  toolCalls: OpenAiToolCall[];
  rawResponseId?: string;
};

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

export async function runOpenAiAssistantTurn(params: {
  userMessage: string;
  previousResponseId?: string;
  toolOutputs?: Array<{ callId: string; output: unknown }>;
}): Promise<OpenAiTurnResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      text: "خدمة الذكاء الاصطناعي غير مفعّلة — يرجى ضبط OPENAI_API_KEY على السيرفر.",
      toolCalls: [],
    };
  }

  const body: Record<string, unknown> = {
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    instructions: SYSTEM_INSTRUCTIONS,
    tools: AI_TOOL_DEFINITIONS,
    store: false,
  };

  if (params.previousResponseId && params.toolOutputs?.length) {
    body.previous_response_id = params.previousResponseId;
    body.input = params.toolOutputs.map((t) => ({
      type: "function_call_output",
      call_id: t.callId,
      output: JSON.stringify(sanitizeForOpenAi(t.output)),
    }));
  } else {
    body.input = params.userMessage;
  }

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[ai-assistant] OpenAI error", res.status, errText.slice(0, 500));
    return {
      text: "تعذر الاتصال بخدمة الذكاء الاصطناعي. حاول مرة أخرى.",
      toolCalls: [],
    };
  }

  const data = (await res.json()) as {
    id?: string;
    output?: unknown[];
  };

  const output = data.output || [];
  return {
    text: extractText(output),
    toolCalls: parseToolCalls(output),
    rawResponseId: data.id,
  };
}
