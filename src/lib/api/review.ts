import { apiGet, mutate } from "@/lib/http";
import type { ApiResult } from "@/lib/types";
import { decideKycAction, decideListingAction } from "@/server/actions/review";
import type {
  KycItem,
  ListingItem,
  ReviewQueues,
} from "@/server/services/review";

export type { KycItem, ListingItem, ReviewQueues };

export const getReviewQueues = (): Promise<ReviewQueues> =>
  apiGet<ReviewQueues>("/api/review");

export const decideKyc = (
  userId: string,
  approve: boolean,
  reason = "",
): Promise<ApiResult> => mutate(decideKycAction(userId, approve, reason));

export const decideListing = (
  vehicleId: string,
  approve: boolean,
  reason = "",
): Promise<ApiResult> =>
  mutate(decideListingAction(vehicleId, approve, reason));
