import { apiGet, mutate } from "@/lib/http";
import type { ApiResult, User } from "@/lib/types";
import {
  approveRequestAction,
  createRequestAction,
  declineRequestAction,
  withdrawRequestAction,
} from "@/server/actions/requests";
import type { NewLeaseRequest, RequestRow } from "@/server/services/requests";

export type { NewLeaseRequest, RequestRow };

/** Driver submits a lease request for a live vehicle. */
export const createLeaseRequest = (
  input: NewLeaseRequest,
): Promise<ApiResult<{ id: string }>> => mutate(createRequestAction(input));

/** Requests sent by a driver or received by an owner, newest first. */
export async function listRequests(_user: User): Promise<RequestRow[]> {
  return (await apiGet<{ requests: RequestRow[] }>("/api/requests")).requests;
}

export const withdrawRequest = (id: string): Promise<ApiResult> =>
  mutate(withdrawRequestAction(id));

export const declineRequest = (
  id: string,
  reason: string,
): Promise<ApiResult> => mutate(declineRequestAction(id, reason));

export const approveRequest = (
  id: string,
): Promise<ApiResult<{ leaseId: string }>> => mutate(approveRequestAction(id));
