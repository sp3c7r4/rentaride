"use server";

import type { ApiResult } from "@/lib/types";
import { requireMember } from "@/server/auth/dal";
import { action } from "@/server/handlers";
import {
  approveRequest,
  createRequest,
  declineRequest,
  type NewLeaseRequest,
  withdrawRequest,
} from "@/server/services/requests";

export async function createRequestAction(
  input: NewLeaseRequest,
): Promise<ApiResult<{ id: string }>> {
  return action("createRequest", async () =>
    createRequest(await requireMember("driver"), input),
  );
}

export async function withdrawRequestAction(id: string): Promise<ApiResult> {
  return action("withdrawRequest", async () =>
    withdrawRequest(await requireMember("driver"), String(id)),
  );
}

export async function declineRequestAction(
  id: string,
  reason: string,
): Promise<ApiResult> {
  return action("declineRequest", async () =>
    declineRequest(await requireMember("owner"), String(id), reason),
  );
}

export async function approveRequestAction(
  id: string,
): Promise<ApiResult<{ leaseId: string }>> {
  return action("approveRequest", async () =>
    approveRequest(await requireMember("owner"), String(id)),
  );
}
