import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma, { withTimeout } from "@/lib/prisma";
import { verifyImpersonationToken } from "@/lib/impersonate";
import { logStaffActivity } from "@/lib/staff-activity";
import { PLATFORM_ADMIN_ROLE, resolveAuthRole } from "@/lib/permissions";
import { validateSessionRestaurantPatch } from "@/lib/restaurant-access";
import { verifyTotp } from "@/lib/totp";

async function loadUserContext(userId: string) {
  const user = await withTimeout(
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        restaurants: { orderBy: { createdAt: "asc" }, take: 1 },
        staff: {
          where: { isActive: true },
          include: { restaurant: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    }),
    12000
  );

  if (!user) return null;

  const owned = user.restaurants[0];
  const staff = user.staff[0];
  const restaurant = owned ?? staff?.restaurant ?? null;
  const isPlatformAdmin = user.isPlatformAdmin;
  const role = resolveAuthRole({
    isPlatformAdmin,
    isOwner: !!owned,
    staffRole: staff?.role ?? null,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isPlatformAdmin,
    restaurantId: restaurant?.id ?? null,
    restaurantName: restaurant?.nameAr || restaurant?.name || null,
    role,
  };
}

async function resolveAuthUser(
  email: string,
  password: string,
  totpCode?: string
) {
  const normalized = email.trim().toLowerCase();

  const user = await withTimeout(
    prisma.user.findUnique({
      where: { email: normalized },
      include: {
        restaurants: { orderBy: { createdAt: "asc" }, take: 1 },
        staff: {
          where: { isActive: true },
          include: { restaurant: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    }),
    12000
  );

  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  if (user.totpEnabled && user.totpSecret) {
    if (!totpCode || !verifyTotp(user.totpSecret, totpCode)) {
      throw new Error("invalid_totp");
    }
  }

  const owned = user.restaurants[0];
  const staff = user.staff[0];

  if (!owned && !staff) {
    const anyStaff = await withTimeout(
      prisma.staff.count({ where: { userId: user.id } }),
      5000
    );
    if (anyStaff > 0) return null;
  }

  const restaurant = owned ?? staff?.restaurant ?? null;
  const isPlatformAdmin = user.isPlatformAdmin;
  const role = resolveAuthRole({
    isPlatformAdmin,
    isOwner: !!owned,
    staffRole: staff?.role ?? null,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isPlatformAdmin,
    restaurantId: restaurant?.id ?? null,
    restaurantName: restaurant?.nameAr || restaurant?.name || null,
    role,
  };
}

async function resolveImpersonationUser(token: string) {
  const payload = verifyImpersonationToken(token);
  if (!payload) return null;

  const restaurant = await prisma.restaurant.findFirst({
    where: { id: payload.restaurantId, ownerId: payload.ownerId },
  });
  if (!restaurant) return null;

  return loadUserContext(payload.ownerId);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        impersonationToken: { label: "Impersonation Token", type: "text" },
        totpCode: { label: "TOTP Code", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (credentials?.impersonationToken) {
            return await resolveImpersonationUser(credentials.impersonationToken);
          }

          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          return await resolveAuthUser(
            credentials.email,
            credentials.password,
            credentials.totpCode
          );
        } catch (error) {
          console.error("[auth] authorize error:", error);
          const message = error instanceof Error ? error.message : "";
          if (message === "invalid_totp") {
            throw new Error("invalid_totp");
          }
          if (
            message === "DATABASE_TIMEOUT" ||
            message.includes("Can't reach database") ||
            message.includes("Connection")
          ) {
            throw new Error("database_timeout");
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.restaurantId = (user as { restaurantId?: string }).restaurantId;
        token.restaurantName = (user as { restaurantName?: string }).restaurantName;
        token.isPlatformAdmin = (user as { isPlatformAdmin?: boolean }).isPlatformAdmin;
        token.role = (user as { role?: string }).role ?? null;
      }

      if (trigger === "update" && session) {
        const patch = session as {
          restaurantId?: string | null;
          restaurantName?: string | null;
        };
        if (patch.restaurantId !== undefined) {
          const ok = await validateSessionRestaurantPatch(
            {
              id: token.id as string,
              isPlatformAdmin: Boolean(token.isPlatformAdmin),
              restaurantId: token.restaurantId as string | null,
            },
            patch.restaurantId
          );
          if (ok) {
            token.restaurantId = patch.restaurantId;
          }
        }
        if (patch.restaurantName !== undefined && patch.restaurantId !== undefined) {
          token.restaurantName = patch.restaurantName;
        }
      }

      if (token.id && !token.isPlatformAdmin && !token.restaurantId) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: {
              restaurants: { orderBy: { createdAt: "asc" }, take: 1 },
              staff: {
                where: { isActive: true },
                include: { restaurant: true },
                orderBy: { createdAt: "asc" },
                take: 1,
              },
            },
          });
          const owned = dbUser?.restaurants[0];
          const staff = dbUser?.staff[0];
          const restaurant = owned ?? staff?.restaurant ?? null;
          if (restaurant) {
            token.restaurantId = restaurant.id;
            token.restaurantName = restaurant.nameAr || restaurant.name;
          }
          if (dbUser) {
            token.isPlatformAdmin = dbUser.isPlatformAdmin;
            if (dbUser.isPlatformAdmin) {
              token.role = PLATFORM_ADMIN_ROLE;
            } else {
              token.role = owned
                ? "OWNER"
                : staff?.role ?? (token.role as string) ?? null;
            }
          }
        } catch (error) {
          console.error("[auth] jwt callback error:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.restaurantId = token.restaurantId as string | null;
        session.user.restaurantName = token.restaurantName as string | null;
        session.user.isPlatformAdmin = Boolean(token.isPlatformAdmin);
        session.user.role = (token.role as string) ?? null;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const u = user as { id?: string; restaurantId?: string | null; name?: string | null };
      if (u.id && u.restaurantId) {
        await logStaffActivity({
          restaurantId: u.restaurantId,
          userId: u.id,
          action: "LOGIN",
          staffName: u.name,
        });
      }
    },
    async signOut({ token }) {
      const t = token as { id?: string; restaurantId?: string | null; name?: string | null };
      if (t?.id && t?.restaurantId) {
        await logStaffActivity({
          restaurantId: t.restaurantId as string,
          userId: t.id as string,
          action: "LOGOUT",
          staffName: t.name as string | null,
        });
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
};
