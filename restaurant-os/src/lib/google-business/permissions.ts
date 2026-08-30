import type { Session } from "next-auth";

const DRAFT_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "MARKETING"] as const;
const PUBLISH_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;
const CONNECT_ROLES = ["OWNER", "ADMIN", "MANAGER", "MARKETING"] as const;

export function gbpRole(session: Session | null): string | undefined {
  return (session?.user as { role?: string } | undefined)?.role;
}

export function canViewGoogleReviews(session: Session | null): boolean {
  const r = gbpRole(session);
  return Boolean(r && (DRAFT_ROLES as readonly string[]).includes(r));
}

export function canDraftGoogleReview(session: Session | null): boolean {
  return canViewGoogleReviews(session);
}

export function canPublishGoogleReview(session: Session | null): boolean {
  const r = gbpRole(session);
  return Boolean(r && (PUBLISH_ROLES as readonly string[]).includes(r));
}

export function canManageGbpConnection(session: Session | null): boolean {
  const r = gbpRole(session);
  return Boolean(r && (CONNECT_ROLES as readonly string[]).includes(r));
}
