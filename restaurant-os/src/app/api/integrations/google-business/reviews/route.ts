import { NextRequest, NextResponse } from "next/server";

import {

  requireGoogleReviewsDraft,

  requireGoogleReviewsRead,

} from "@/lib/google-business/auth-guards";

import { listGoogleReviews } from "@/lib/google-business/reviews-service";

import { syncGoogleReviewsForRestaurant } from "@/lib/google-business/sync-reviews";

import { canDraftGoogleReview, canPublishGoogleReview } from "@/lib/google-business/permissions";

import prisma from "@/lib/prisma";

import type { Session } from "next-auth";



export const dynamic = "force-dynamic";



export async function GET(req: NextRequest) {

  const { restaurantId, error, session } = await requireGoogleReviewsRead();

  if (error) return error;



  const sp = req.nextUrl.searchParams;

  const filters = {

    stars: sp.get("stars") ? parseInt(sp.get("stars")!, 10) : undefined,

    replyStatus: sp.get("replyStatus") || undefined,

    q: sp.get("q") || undefined,

    hasReply: sp.get("hasReply") === "1",

    noReply: sp.get("noReply") === "1",

  };



  const connection = await prisma.googleBusinessConnection.findUnique({

    where: { restaurantId: restaurantId! },

    include: { locations: { where: { isSelected: true }, take: 1 } },

  });



  const reviews = await listGoogleReviews(restaurantId!, filters);



  return NextResponse.json({

    connection: connection

      ? {

          isActive: connection.isActive,

          accountName: connection.accountName,

          lastSyncAt: connection.lastSyncAt,

          lastSyncError: connection.lastSyncError,

          hasLocation: connection.locations.length > 0,

          selectedLocation: connection.locations[0] ?? null,

        }

      : null,

    permissions: {

      canDraft: canDraftGoogleReview(session as Session | null),

      canPublish: canPublishGoogleReview(session as Session | null),

    },

    reviews: reviews.map((r) => ({

      id: r.id,

      reviewerName: r.reviewerName,

      starRating: r.starRating,

      comment: r.comment,

      createTime: r.createTime,

      reviewReply: r.reviewReply,

      replyStatus: r.replyStatus,

      draftText: r.draftText,

    })),

  });

}



export async function POST(req: NextRequest) {

  const { restaurantId, error, session } = await requireGoogleReviewsRead();

  if (error) return error;



  const body = await req.json();

  if (body.action === "sync") {

    if (!canDraftGoogleReview(session as Session | null)) {

      return NextResponse.json(

        { error: "ليس لديك صلاحية مزامنة المراجعات" },

        { status: 403 }

      );

    }

    const result = await syncGoogleReviewsForRestaurant({

      restaurantId: restaurantId!,

      userId: session?.user?.id,

    });

    if (!result.ok) {

      return NextResponse.json({

        ok: false,

        code: result.code,

        message: result.message,

      });

    }

    return NextResponse.json({

      ok: true,

      imported: result.imported,

      message: `تم استيراد ${result.imported} مراجعة`,

    });

  }



  return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });

}

