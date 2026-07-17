import type { CustomerWishStatus, CustomerWishType } from "@prisma/client";

export const WISH_TYPE_LABELS_AR: Record<CustomerWishType, string> = {
  OCCASION: "مناسبة",
  CONGRATULATION: "تهنئة",
  SPECIAL_REQUEST: "طلب خاص",
  NOTE: "ملاحظة",
};

export const WISH_STATUS_LABELS_AR: Record<CustomerWishStatus, string> = {
  SUBMITTED: "تم الإرسال",
  ACCEPTED: "مقبول",
  COMPLETED: "مكتمل",
  REJECTED: "مرفوض",
};

export const WISH_TYPES: CustomerWishType[] = [
  "OCCASION",
  "CONGRATULATION",
  "SPECIAL_REQUEST",
  "NOTE",
];
