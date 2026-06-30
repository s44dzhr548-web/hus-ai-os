import { NextResponse } from "next/server";
import { getOwnedRestaurant } from "@/lib/api-auth";
import {
  createMenuCategorySchema,
  createMenuItemSchema,
} from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  }

  const result = await getOwnedRestaurant(restaurantId);
  if ("error" in result && result.error) return result.error;

  const { supabase } = result as { supabase: NonNullable<Awaited<ReturnType<typeof getOwnedRestaurant>>["supabase"]> };

  const [categories, items] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("name"),
  ]);

  if (categories.error || items.error) {
    return NextResponse.json(
      { error: categories.error?.message ?? items.error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    categories: categories.data,
    items: items.data,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const type = body.type as "category" | "item";

  if (type === "category") {
    const parsed = createMenuCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid category data" }, { status: 400 });
    }

    const result = await getOwnedRestaurant(parsed.data.restaurantId);
    if ("error" in result && result.error) return result.error;

    const { supabase } = result as { supabase: NonNullable<Awaited<ReturnType<typeof getOwnedRestaurant>>["supabase"]> };

    const { data, error } = await supabase
      .from("menu_categories")
      .insert({
        restaurant_id: parsed.data.restaurantId,
        name: parsed.data.name,
        sort_order: parsed.data.sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ category: data }, { status: 201 });
  }

  if (type === "item") {
    const parsed = createMenuItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid item data" }, { status: 400 });
    }

    const result = await getOwnedRestaurant(parsed.data.restaurantId);
    if ("error" in result && result.error) return result.error;

    const { supabase } = result as { supabase: NonNullable<Awaited<ReturnType<typeof getOwnedRestaurant>>["supabase"]> };

    const { data, error } = await supabase
      .from("menu_items")
      .insert({
        restaurant_id: parsed.data.restaurantId,
        category_id: parsed.data.categoryId ?? null,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        price_cents: parsed.data.priceCents,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ item: data }, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
