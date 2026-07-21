/** Safe structured logging for Meta OAuth callback — never log tokens, secrets, or raw codes. */
export function logMetaOAuthStage(
  stage: string,
  meta?: Record<string, string | number | boolean | null | undefined>
) {
  const payload: Record<string, unknown> = {
    scope: "meta-oauth-callback",
    stage,
    ts: new Date().toISOString(),
  };

  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      if (value === undefined) continue;
      payload[key] = value;
    }
  }

  console.info(JSON.stringify(payload));
}

export function sanitizeGraphErrorMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;
  return message.slice(0, 200).replace(/access_token=[^&\s]+/gi, "access_token=[redacted]");
}
