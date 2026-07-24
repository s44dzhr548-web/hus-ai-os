import { callPlatformOpenAiResponses } from "@/lib/openai/responses-client";
import { assertConversationAccess } from "@/lib/whatsapp-inbox/service";

export async function suggestInboxReply(params: {
  restaurantId: string;
  conversationId: string;
}): Promise<{ suggestion: string }> {
  const conversation = await assertConversationAccess(params.conversationId, params.restaurantId);

  const transcript = conversation.messages
    .slice(-12)
    .map((m) => `${m.direction === "INBOUND" ? "العميل" : "الموظف"}: ${m.bodyText || m.messageType}`)
    .join("\n");

  const result = await callPlatformOpenAiResponses({
    role: "MENU_OS_ASSISTANT",
    restaurantId: params.restaurantId,
    instructions: `أنت مساعد ردود واتساب لمطعم واحد فقط (restaurantId=${params.restaurantId}).
اقترح رداً واحداً بالعربية للموظف — لا ترسل تلقائياً.
لا تذكر tokens أو بيانات مطاعم أخرى.
كن مختصراً ومهذباً.`,
    input: `المحادثة:\n${transcript || "لا رسائل بعد"}\n\nاقترح رداً مناسباً للموظف (نص فقط):`,
    store: false,
    logTag: "whatsapp-inbox-suggest",
  });

  if (!result.ok) {
    return { suggestion: "عذراً، تعذّر توليد اقتراح الآن. راجع الرسالة ورد يدوياً." };
  }

  return { suggestion: result.text.trim() || "شكراً لتواصلك، كيف نقدر نخدمك؟" };
}
