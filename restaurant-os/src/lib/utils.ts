import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = "SAR") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "جديد",
  PREPARING: "قيد التحضير",
  READY: "جاهز",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

export const ORDER_STATUS_VARIANTS: Record<
  string,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  NEW: "info",
  PREPARING: "warning",
  READY: "success",
  COMPLETED: "default",
  CANCELLED: "danger",
};

export const STAFF_ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير النظام",
  MANAGER: "مدير",
  CASHIER: "كاشير",
  KITCHEN: "مطبخ",
  WAITER: "نادل",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "معلق",
  PAID: "مدفوع",
  FAILED: "فشل",
  REFUNDED: "مسترد",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  MADA: "مدى",
  APPLE_PAY: "Apple Pay",
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  CASH: "نقدي",
};

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateOrderNumber(): number {
  return Math.floor(1000 + Math.random() * 9000);
}
