import { NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";

const CAPTAIN_ROLES = ["CAPTAIN", "OWNER", "ADMIN", "MANAGER", "WAITER"] as const;

export async function requireCaptainAccess() {
  return requireRestaurantRole([...CAPTAIN_ROLES]);
}

export function captainForbidden() {
  return NextResponse.json({ error: "صلاحيات كابتن الصالة فقط", code: "CAPTAIN_FORBIDDEN" }, { status: 403 });
}
