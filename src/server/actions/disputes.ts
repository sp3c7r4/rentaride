"use server";

import type { ApiResult } from "@/lib/types";
import { requireMember, requireUser } from "@/server/auth/dal";
import { action } from "@/server/handlers";
import {
  type CreateDisputeInput,
  createDispute,
  replyToDispute,
  resolveDispute,
} from "@/server/services/disputes";

export async function createDisputeAction(
  input: CreateDisputeInput,
): Promise<ApiResult<{ id: string }>> {
  return action("createDispute", async () =>
    createDispute(await requireMember(), input),
  );
}

export async function replyToDisputeAction(
  id: string,
  body: string,
  attachments: string[],
): Promise<ApiResult> {
  return action("replyToDispute", async () =>
    replyToDispute(await requireUser(), String(id), { body, attachments }),
  );
}

export async function resolveDisputeAction(id: string): Promise<ApiResult> {
  return action("resolveDispute", async () =>
    resolveDispute(await requireUser(), String(id)),
  );
}
