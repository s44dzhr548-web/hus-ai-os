import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRestaurantSchema } from "@/lib/validators";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("restaurants")
    .select("*, locations(*)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ restaurants: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createRestaurantSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, slug, locationName, address } = parsed.data;

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .insert({
      owner_id: user.id,
      name,
      slug,
    })
    .select()
    .single();

  if (restaurantError) {
    return NextResponse.json(
      { error: restaurantError.message },
      { status: 400 }
    );
  }

  const { error: locationError } = await supabase.from("locations").insert({
    restaurant_id: restaurant.id,
    name: locationName,
    address: address ?? null,
  });

  if (locationError) {
    return NextResponse.json({ error: locationError.message }, { status: 500 });
  }

  return NextResponse.json({ restaurant }, { status: 201 });
}
