/** WhatsApp Cloud API Graph helpers — never log tokens. */
export const WHATSAPP_GRAPH_VERSION = "v23.0";
export const WHATSAPP_GRAPH = `https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION}`;

/** Strip quotes, Bearer prefix, and whitespace from stored tokens. */
export function sanitizeAccessToken(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let token = String(raw).trim();
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  if (/^bearer\s+/i.test(token)) {
    token = token.replace(/^bearer\s+/i, "").trim();
  }
  return token || null;
}

export async function graphGet<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<T> {
  const token = sanitizeAccessToken(accessToken);
  if (!token) throw new Error("WhatsApp Access Token is required");

  const qs = params ? `?${new URLSearchParams(params)}` : "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(`${WHATSAPP_GRAPH}${normalizedPath}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } }).error?.message || `Graph ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function graphPost<T>(
  path: string,
  accessToken: string,
  body?: object
): Promise<T> {
  const token = sanitizeAccessToken(accessToken);
  if (!token) throw new Error("WhatsApp Access Token is required");

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(`${WHATSAPP_GRAPH}${normalizedPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : "{}",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } }).error?.message || `Graph ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}
