import { apiGet, mutate } from "@/lib/http";
import type { ApiResult, DisputeCategory, User } from "@/lib/types";
import {
  createDisputeAction,
  replyToDisputeAction,
  resolveDisputeAction,
} from "@/server/actions/disputes";
import type { Attachment, DisputeView } from "@/server/services/disputes";

export type { Attachment, DisputeView };

export const DISPUTE_CATEGORY_LABEL: Record<DisputeCategory, string> = {
  damage: "Damage to the vehicle",
  payment: "Payment or charges",
  vehicle_condition: "Vehicle condition",
  conduct: "Driver or owner conduct",
  other: "Something else",
};

export async function listDisputes(_user: User): Promise<DisputeView[]> {
  return (await apiGet<{ disputes: DisputeView[] }>("/api/disputes")).disputes;
}

export async function getDispute(
  id: string,
  _user: User,
): Promise<DisputeView | null> {
  try {
    return (
      await apiGet<{ dispute: DisputeView }>(
        `/api/disputes/${encodeURIComponent(id)}`,
      )
    ).dispute;
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}

export async function listDisputableLeases(_user: User) {
  return (
    await apiGet<{ leases: { id: string; label: string; status: string }[] }>(
      "/api/disputes/leases",
    )
  ).leases;
}

/** `attachments` are upload keys from `uploadFile(file, "evidence")`. */
export const createDispute = (input: {
  leaseId: string;
  category: DisputeCategory;
  subject: string;
  body: string;
  attachments: string[];
}): Promise<ApiResult<{ id: string }>> => mutate(createDisputeAction(input));

export const replyToDispute = (
  id: string,
  body: string,
  attachments: string[],
): Promise<ApiResult> => mutate(replyToDisputeAction(id, body, attachments));

export const resolveDispute = (id: string): Promise<ApiResult> =>
  mutate(resolveDisputeAction(id));
