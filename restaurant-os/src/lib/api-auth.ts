import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { supabase, user };
}

export async function getOwnedRestaurant(restaurantId: string) {
  const auth = await requireAuth();
  if ("error" in auth && auth.error) return auth;

  const { supabase, user } = auth as { supabase: Awaited<ReturnType<typeof createClient>>; user: { id: string } };

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .eq("owner_id", user.id)
    .single();

  if (error || !restaurant) {
    return { error: NextResponse.json({ error: "Restaurant not found" }, { status: 404 }) };
  }

  return { supabase, user, restaurant };
}
