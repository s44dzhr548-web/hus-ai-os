import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, currency")
    .eq("slug", slug)
    .single();

  if (error || !restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [categories, items] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_available", true)
      .order("name"),
  ]);

  return NextResponse.json({
    restaurant,
    categories: categories.data ?? [],
    items: items.data ?? [],
  });
}
