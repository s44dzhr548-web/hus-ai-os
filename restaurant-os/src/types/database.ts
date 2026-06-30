export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type OrderType = "dine_in" | "takeaway" | "delivery";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  restaurant_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  location_id: string;
  order_number: number;
  status: OrderStatus;
  order_type: OrderType;
  customer_name: string | null;
  table_number: string | null;
  notes: string | null;
  total_cents: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price_cents: number;
  created_at: string;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface RestaurantWithLocations extends Restaurant {
  locations: Location[];
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Pick<Profile, "id"> & Partial<Omit<Profile, "id">>;
        Update: Partial<Profile>;
      };
      restaurants: {
        Row: Restaurant;
        Insert: Pick<Restaurant, "owner_id" | "name" | "slug"> &
          Partial<Pick<Restaurant, "timezone" | "currency" | "id">>;
        Update: Partial<Restaurant>;
      };
      locations: {
        Row: Location;
        Insert: Pick<Location, "restaurant_id" | "name"> &
          Partial<Pick<Location, "address" | "is_active" | "id">>;
        Update: Partial<Location>;
      };
      menu_categories: {
        Row: MenuCategory;
        Insert: Pick<MenuCategory, "restaurant_id" | "name"> &
          Partial<Pick<MenuCategory, "sort_order" | "is_active" | "id">>;
        Update: Partial<MenuCategory>;
      };
      menu_items: {
        Row: MenuItem;
        Insert: Pick<MenuItem, "restaurant_id" | "name" | "price_cents"> &
          Partial<
            Pick<MenuItem, "category_id" | "description" | "is_available" | "id">
          >;
        Update: Partial<MenuItem>;
      };
      orders: {
        Row: Order;
        Insert: Pick<
          Order,
          "restaurant_id" | "location_id" | "order_type" | "total_cents"
        > &
          Partial<
            Pick<
              Order,
              | "status"
              | "customer_name"
              | "table_number"
              | "notes"
              | "id"
              | "order_number"
            >
          >;
        Update: Partial<Order>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Pick<
          OrderItem,
          "order_id" | "name" | "quantity" | "unit_price_cents"
        > &
          Partial<Pick<OrderItem, "menu_item_id" | "id">>;
        Update: Partial<OrderItem>;
      };
    };
  };
}
