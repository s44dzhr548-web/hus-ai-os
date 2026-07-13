import { NextRequest } from "next/server";
import { randomUUID } from "crypto";

export function requestMeta(req?: NextRequest) {
  if (!req) return { requestId: randomUUID(), ipAddress: null, userAgent: null };
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  return {
    requestId: req.headers.get("x-request-id") || randomUUID(),
    ipAddress: ip,
    userAgent: req.headers.get("user-agent"),
  };
}
