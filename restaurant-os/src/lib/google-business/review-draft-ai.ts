import { callPlatformOpenAiText } from "@/lib/openai/responses-client";

const INSTRUCTIONS = `You write short, polite Google Business review replies for a restaurant.
Rules:
- Match the review language; default to Arabic if unclear.
- Be specific to the review text; no generic copy-paste.
- Never offer discounts, compensation, or legal admissions.
- Never ask to remove the review.
- Never include personal data.
- For negative reviews: professional apology, invite contact via official channels only.
- For positive reviews: thank and reference a detail from the review.
- Output ONLY the reply text, no quotes or labels.
- Max 120 words.`;

export async function generateGoogleReviewDraftReply(input: {
  restaurantId: string;
  reviewerName: string | null;
  starRating: number | null;
  comment: string | null;
}): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const stars = input.starRating ?? 0;
  const userMessage = `Reviewer: ${input.reviewerName || "Guest"}
Stars: ${stars}/5
Review:
${input.comment || "(no text)"}`;

  const result = await callPlatformOpenAiText({
    role: "MARKETING_MANAGER",
    restaurantId: input.restaurantId,
    instructions: INSTRUCTIONS,
    userMessage,
    maxOutputTokens: 400,
    logTag: "google-review-draft",
  });

  if (!result.ok || !result.text.trim()) {
    return { ok: false, message: result.ok ? "لم يُنشأ نص" : result.message };
  }
  return { ok: true, text: result.text.trim() };
}
