import { z } from "zod";

export const createRestaurantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  locationName: z.string().min(1).max(100),
  address: z.string().max(200).optional(),
});

export const createMenuCategorySchema = z.object({
  restaurantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).optional(),
});

export const createMenuItemSchema = z.object({
  restaurantId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  priceCents: z.number().int().min(0),
});

export const createOrderSchema = z.object({
  restaurantId: z.string().uuid(),
  locationId: z.string().uuid(),
  orderType: z.enum(["dine_in", "takeaway", "delivery"]),
  customerName: z.string().max(100).optional(),
  tableNumber: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        name: z.string().min(1),
        quantity: z.number().int().min(1),
        unitPriceCents: z.number().int().min(0),
      })
    )
    .min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "completed",
    "cancelled",
  ]),
});

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatCurrency(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
