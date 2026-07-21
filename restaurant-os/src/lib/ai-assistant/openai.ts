import { AI_TOOL_DEFINITIONS } from "@/lib/ai-assistant/tools";
import { sanitizeForOpenAi } from "@/lib/ai-assistant/security";
import { callPlatformOpenAiResponses } from "@/lib/openai/responses-client";

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

export async function runOpenAiAssistantTurn(params: {
  restaurantId: string;
  userMessage: string;
  previousResponseId?: string;
  toolOutputs?: Array<{ callId: string; output: unknown }>;
}): Promise<OpenAiTurnResult> {
  const result = await callPlatformOpenAiResponses({
    role: "MENU_OS_ASSISTANT",
    restaurantId: params.restaurantId,
    instructions: SYSTEM_INSTRUCTIONS,
    tools: AI_TOOL_DEFINITIONS,
    input: params.userMessage,
    previousResponseId: params.previousResponseId,
    toolOutputs: params.toolOutputs?.map((t) => ({
      callId: t.callId,
      output: sanitizeForOpenAi(t.output),
    })),
    store: true,
    logTag: "ai-assistant",
  });

  if (!result.ok) {
    return { text: result.message, toolCalls: [] };
  }

  return {
    text: result.text,
    toolCalls: result.toolCalls,
    rawResponseId: result.rawResponseId,
  };
}
