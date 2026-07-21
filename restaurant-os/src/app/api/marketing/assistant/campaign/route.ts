import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { checkRateLimit, logMarketingAudit } from "@/lib/marketing/security";
import {
  approveCampaignDraft,
  rejectCampaignDraft,
  saveCampaignDraftFromProposal,
  updateCampaignFromProposal,
  type MarketingCampaignProposal,
} from "@/lib/marketing/marketing-assistant-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;
  if (!restaurantId) {
    return NextResponse.json({ error: "لم يتم تحديد المطعم." }, { status: 400 });
  }
  if (!checkRateLimit(restaurantId, "campaigns")) {
    return NextResponse.json({ error: "تجاوزت حد الطلبات" }, { status: 429 });
  }

  const body = await req.json();
  const proposal = body.proposal as MarketingCampaignProposal | undefined;
  if (!proposal?.name) {
    return NextResponse.json({ error: "بيانات الحملة غير مكتملة" }, { status: 400 });
  }

  const campaign = await saveCampaignDraftFromProposal(
    restaurantId,
    proposal,
    session?.user?.id
  );

  await logMarketingAudit({
    restaurantId,
    userId: session?.user?.id,
    action: "CAMPAIGN_CREATE",
    entityType: "MarketingCampaign",
    entityId: campaign.id,
    details: { source: "marketing_assistant" },
  });

  return NextResponse.json({
    ok: true,
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      budget: Number(campaign.budget ?? 0),
    },
    message: "تم حفظ الحملة كمسودة",
  });
}

export async function PATCH(req: NextRequest) {
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;
  if (!restaurantId) {
    return NextResponse.json({ error: "لم يتم تحديد المطعم." }, { status: 400 });
  }

  const body = await req.json();
  const action = String(body.action || "");
  const campaignId = String(body.campaignId || "");

  if (action === "save-draft") {
    const proposal = body.proposal as MarketingCampaignProposal | undefined;
    if (!proposal?.name) {
      return NextResponse.json({ error: "بيانات الحملة غير مكتملة" }, { status: 400 });
    }
    const campaign = await saveCampaignDraftFromProposal(
      restaurantId,
      proposal,
      session?.user?.id
    );
    await logMarketingAudit({
      restaurantId,
      userId: session?.user?.id,
      action: "CAMPAIGN_CREATE",
      entityId: campaign.id,
      details: { source: "marketing_assistant" },
    });
    return NextResponse.json({
      ok: true,
      campaignId: campaign.id,
      message: "تم حفظ الحملة كمسودة",
    });
  }

  if (!campaignId) {
    return NextResponse.json({ error: "معرّف الحملة مطلوب" }, { status: 400 });
  }

  if (action === "approve") {
    const result = await approveCampaignDraft(restaurantId, campaignId, session?.user?.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    await logMarketingAudit({
      restaurantId,
      userId: session?.user?.id,
      action: "CAMPAIGN_APPROVE",
      entityId: campaignId,
    });
    return NextResponse.json({
      ok: true,
      message: result.message,
      published: false,
      missingPlatforms: result.missingPlatforms,
      campaign: { id: result.campaign.id, status: result.campaign.status },
    });
  }

  if (action === "reject") {
    const result = await rejectCampaignDraft(restaurantId, campaignId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    await logMarketingAudit({
      restaurantId,
      userId: session?.user?.id,
      action: "CAMPAIGN_REJECT",
      entityId: campaignId,
    });
    return NextResponse.json({ ok: true, message: "تم رفض الحملة" });
  }

  if (action === "edit") {
    const proposal = body.proposal as MarketingCampaignProposal | undefined;
    if (!proposal?.name) {
      return NextResponse.json({ error: "بيانات الحملة غير مكتملة" }, { status: 400 });
    }
    const result = await updateCampaignFromProposal(restaurantId, campaignId, proposal);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    await logMarketingAudit({
      restaurantId,
      userId: session?.user?.id,
      action: "CAMPAIGN_UPDATE",
      entityId: campaignId,
    });
    return NextResponse.json({ ok: true, message: "تم تحديث المسودة" });
  }

  return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
}
