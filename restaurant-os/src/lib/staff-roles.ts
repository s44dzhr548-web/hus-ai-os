/** Roles allowed for reception desk operations */
export const RECEPTION_DESK_ROLES = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "RECEPTION",
  "CASHIER",
  "WAITER",
] as const;

/** Roles allowed to manage staff accounts */
export const STAFF_MANAGER_ROLES = ["OWNER", "ADMIN"] as const;

/** Assignable staff roles when creating accounts */
export const ASSIGNABLE_STAFF_ROLES = [
  "RECEPTION",
  "MANAGER",
  "MARKETING",
  "WAITER",
  "KITCHEN",
] as const;
