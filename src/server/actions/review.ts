"use server";

import type { ApiResult } from "@/lib/types";
import { requireStaff } from "@/server/auth/dal";
import { action } from "@/server/handlers";
import { decideKyc, decideListing } from "@/server/services/review";

export async function decideKycAction(
  userId: string,
  approve: boolean,
  reason = "",
): Promise<ApiResult> {
  return action("decideKyc", async () => {
    await requireStaff();
    return decideKyc(String(userId), approve === true, reason);
  });
}

export async function decideListingAction(
  vehicleId: string,
  approve: boolean,
  reason = "",
): Promise<ApiResult> {
  return action("decideListing", async () => {
    await requireStaff();
    return decideListing(String(vehicleId), approve === true, reason);
  });
}
