import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import {
  defaultDashboardPath,
  isRouteAllowedForUser,
} from "@/lib/dashboard-nav";
import { isPlatformAdminUser } from "@/lib/permissions";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    if (!token) return NextResponse.next();

    const pathname = req.nextUrl.pathname;
    const user = {
      isPlatformAdmin: Boolean(token.isPlatformAdmin),
      role: (token.role as string) ?? null,
    };
    const platformAdmin = isPlatformAdminUser(user);
    const role = user.role;

    if (pathname.startsWith("/dashboard/platform")) {
      if (!platformAdmin) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    if (platformAdmin) {
      return NextResponse.next();
    }

    if (pathname === "/dashboard") {
      const target = defaultDashboardPath({ isPlatformAdmin: platformAdmin, role });
      if (target !== "/dashboard") {
        return NextResponse.redirect(new URL(target, req.url));
      }
      return NextResponse.next();
    }

    if (!isRouteAllowedForUser(pathname, { isPlatformAdmin: platformAdmin, role })) {
      return NextResponse.redirect(
        new URL(defaultDashboardPath({ isPlatformAdmin: platformAdmin, role }), req.url)
      );
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
