/** Shared QA login helper with set-cookie fallback for Node fetch. */
export function parseSetCookieHeader(header) {
  if (!header) return [];
  const parts = [];
  let current = "";
  for (const segment of header.split(/,(?=\s*[^;,]+=[^;,]+)/)) {
    const piece = segment.trim();
    if (!piece) continue;
    if (current) parts.push(current);
    current = piece.split(";")[0].trim();
  }
  if (current) parts.push(current);
  return parts.filter(Boolean);
}

export function mergeCookieHeaders(...headers) {
  const jar = new Set();
  for (const h of headers) {
    if (!h) continue;
    for (const part of h.split(";").map((c) => c.trim()).filter(Boolean)) {
      if (part.includes("=")) jar.add(part);
    }
  }
  return [...jar].join("; ");
}

export async function loginSession(base, email, password, callbackPath = "/dashboard") {
  const csrfRes = await fetch(`${base}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json().catch(() => ({}));
  if (!csrfToken) throw new Error("missing csrf token");

  const csrfCookies = csrfRes.headers.getSetCookie?.() || parseSetCookieHeader(csrfRes.headers.get("set-cookie"));
  const csrfHeader = csrfCookies.length
    ? csrfCookies.map((c) => c.split(";")[0]).join("; ")
    : csrfRes.headers.get("set-cookie") || "";

  const signIn = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: csrfHeader },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: `${base}${callbackPath}`,
      json: "true",
    }),
    redirect: "manual",
  });

  const nextCookies = signIn.headers.getSetCookie?.() || parseSetCookieHeader(signIn.headers.get("set-cookie"));
  if (nextCookies.length) {
    return mergeCookieHeaders(
      csrfHeader,
      nextCookies.map((c) => c.split(";")[0]).join("; ")
    );
  }

  const setCookie = signIn.headers.get("set-cookie");
  if (!setCookie) throw new Error(`login failed HTTP ${signIn.status}`);
  return mergeCookieHeaders(csrfHeader, setCookie.split(";")[0]);
}

export async function verifySession(base, cookie) {
  const res = await fetch(`${base}/api/auth/session`, { headers: { Cookie: cookie } });
  const session = await res.json().catch(() => ({}));
  if (!session?.user?.email) throw new Error("session empty after login");
  return session;
}
