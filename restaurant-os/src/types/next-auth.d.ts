import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      restaurantId: string | null;
      restaurantName: string | null;
      isPlatformAdmin: boolean;
      role: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    restaurantId?: string | null;
    restaurantName?: string | null;
    isPlatformAdmin?: boolean;
    role?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    restaurantId?: string | null;
    restaurantName?: string | null;
    isPlatformAdmin?: boolean;
    role?: string | null;
  }
}

export {};
