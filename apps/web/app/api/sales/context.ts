import { cookies } from "next/headers";

import { SESSION_COOKIE, verifySessionToken } from "../../../lib/session";

export type TenantContext = {
  organizationId: string;
  actorUserId?: string;
  storeIds?: string[];
  correlationId?: string;
};

export async function getTenantContext(request: Request): Promise<TenantContext> {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  const organizationId =
    request.headers.get("x-chipboard-organization-id") ?? url.searchParams.get("organizationId") ?? session?.organizationId;
  const storeId = request.headers.get("x-chipboard-store-id") ?? url.searchParams.get("storeId");
  const actorUserId =
    request.headers.get("x-chipboard-user-id") ?? url.searchParams.get("actorUserId") ?? session?.userId ?? undefined;

  if (!organizationId) {
    throw new Error("Sign in or provide x-chipboard-organization-id.");
  }

  return {
    organizationId,
    actorUserId,
    storeIds: storeId ? [storeId] : undefined,
    correlationId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
  };
}

export function jsonError(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  const safeStatus = message.includes("required") ? 400 : message.includes("not found") ? 404 : message.includes("Sign in") ? 401 : status;

  return Response.json({ message }, { status: safeStatus });
}
