import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { validatePasswordStrength } from "@/lib/password-policy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ownerName,
      email,
      password,
      restaurantName,
      restaurantNameAr,
      branchName,
      branchNameAr,
      city,
      phone,
    } = body;

    if (!ownerName || !email || !password || !restaurantName) {
      return NextResponse.json(
        { error: "الاسم والبريد وكلمة المرور واسم المطعم مطلوبة" },
        { status: 400 }
      );
    }

    if (process.env.DISABLE_PUBLIC_REGISTRATION === "true") {
      return NextResponse.json(
        { error: "Registration is disabled. Contact Menu OS." },
        { status: 403 }
      );
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مستخدم بالفعل" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const slugBase =
      slugify(restaurantName) ||
      slugify(restaurantNameAr || "") ||
      email.split("@")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase() ||
      "restaurant";
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          passwordHash,
          name: ownerName,
        },
      });

      const restaurant = await tx.restaurant.create({
        data: {
          ownerId: user.id,
          name: restaurantName,
          nameAr: restaurantNameAr || restaurantName,
          slug,
          phone,
          email: email.trim().toLowerCase(),
          subscription: {
            create: {
              plan: "FREE",
              status: "TRIAL",
              endDate: trialEnd,
            },
          },
        },
      });

      const branch = await tx.branch.create({
        data: {
          restaurantId: restaurant.id,
          name: branchName || "Main Branch",
          nameAr: branchNameAr || branchName || "الفرع الرئيسي",
          city: city || "الرياض",
          phone,
          isActive: true,
        },
      });

      await tx.staff.create({
        data: {
          userId: user.id,
          restaurantId: restaurant.id,
          branchId: branch.id,
          role: "OWNER",
          name: ownerName,
          phone,
          isActive: true,
        },
      });

      return { user, restaurant, branch };
    });

    return NextResponse.json(
      {
        success: true,
        userId: result.user.id,
        restaurantId: result.restaurant.id,
        branchId: result.branch.id,
        email: result.user.email,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "فشل التسجيل" }, { status: 500 });
  }
}
