import { NextResponse } from "next/server";
import { getOwnedRestaurant } from "@/lib/api-auth";
import { createOrderSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  const status = searchParams.get("status");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  }

  const result = await getOwnedRestaurant(restaurantId);
  if ("error" in result && result.error) return result.error;

  const { supabase } = result as { supabase: NonNullable<Awaited<ReturnType<typeof getOwnedRestaurant>>["supabase"]> };

  let query = supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid order" },
      { status: 400 }
    );
  }

  const result = await getOwnedRestaurant(parsed.data.restaurantId);
  if ("error" in result && result.error) return result.error;

  const { supabase } = result as { supabase: NonNullable<Awaited<ReturnType<typeof getOwnedRestaurant>>["supabase"]> };

  const totalCents = parsed.data.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0
  );

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      restaurant_id: parsed.data.restaurantId,
      location_id: parsed.data.locationId,
      order_type: parsed.data.orderType,
      customer_name: parsed.data.customerName ?? null,
      table_number: parsed.data.tableNumber ?? null,
      notes: parsed.data.notes ?? null,
      total_cents: totalCents,
      status: "pending",
    })
    .select()
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: orderError?.message ?? "Failed to create order" },
      { status: 400 }
    );
  }

  const orderItems = parsed.data.items.map((item) => ({
    order_id: order.id,
    menu_item_id: item.menuItemId,
    name: item.name,
    quantity: item.quantity,
    unit_price_cents: item.unitPriceCents,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ order }, { status: 201 });
}
