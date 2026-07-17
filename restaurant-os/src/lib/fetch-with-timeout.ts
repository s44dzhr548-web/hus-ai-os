/** Fetch with abort timeout — prevents platform admin saves from hanging on external APIs */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? 8000;
  const { timeoutMs: _omit, ...rest } = init || {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === "AbortError";
}
