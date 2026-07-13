import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess, requireMarketingOwnerAccess, marketingError } from "@/lib/marketing/auth";
import {
  connectWithApiKey,
  disconnectProvider,
  setProviderFlags,
  testStoredConnection,
} from "@/lib/marketing/providers/connection-service";
import type { ProviderCategory } from "@/lib/marketing/providers/catalog";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ providerKey: string }> }
) {
  const { providerKey } = await params;
  const body = await req.json();
  const category = body.category as ProviderCategory;
  const action = body.action as string;

  if (action === "test") {
    const { error, restaurantId } = await requireMarketingAccess();
    if (error) return error;
    const result = await testStoredConnection(restaurantId!, category, providerKey.toUpperCase());
    return NextResponse.json(result);
  }

  if (action === "disconnect") {
    const { error, restaurantId, session, canManageSecrets } = await requireMarketingOwnerAccess();
    if (error) return error;
    if (!canManageSecrets) return marketingError("صلاحية المالك مطلوبة", 403);
    await disconnectProvider(restaurantId!, session!.user.id, category, providerKey.toUpperCase());
    return NextResponse.json({ ok: true });
  }

  if (action === "set_flags") {
    const { error, restaurantId, session, canManageSecrets } = await requireMarketingOwnerAccess();
    if (error) return error;
    if (!canManageSecrets) return marketingError("صلاحية المالك مطلوبة", 403);
    await setProviderFlags(restaurantId!, session!.user.id, category, providerKey.toUpperCase(), body.flags ?? {});
    return NextResponse.json({ ok: true });
  }

  if (action === "connect_api_key") {
    const { error, restaurantId, session, canManageSecrets } = await requireMarketingOwnerAccess();
    if (error) return error;
    if (!canManageSecrets) return marketingError("صلاحية المالك مطلوبة — لا يمكن لمدير التسويق عرض المفاتيح", 403);
    try {
      const result = await connectWithApiKey(restaurantId!, session!.user.id, category, providerKey.toUpperCase(), {
        apiKey: body.apiKey,
        orgId: body.orgId,
        projectId: body.projectId,
        endpointUrl: body.endpointUrl,
        modelId: body.modelId,
        roleAssignment: body.roleAssignment,
        taskAssignment: body.taskAssignment,
      });
      return NextResponse.json(result);
    } catch (e) {
      return marketingError(e instanceof Error ? e.message : "فشل الربط", 400);
    }
  }

  return marketingError("Unknown action", 400);
}
