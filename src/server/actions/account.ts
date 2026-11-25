"use server";

import type { ApiResult } from "@/lib/types";
import { optionalUser, requireMember, requireUser } from "@/server/auth/dal";
import { action } from "@/server/handlers";
import {
  markAllRead,
  markRead,
  sendContactMessage,
  updateLicence,
  updateProfile,
} from "@/server/services/account";

export async function updateProfileAction(input: {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
}): Promise<ApiResult> {
  return action("updateProfile", async () =>
    updateProfile(await requireMember(), input),
  );
}

export async function updateLicenceAction(input: {
  number: string;
  expiry: string;
  fileKey: string;
}): Promise<ApiResult> {
  return action("updateLicence", async () =>
    updateLicence(await requireMember("driver"), input),
  );
}

export async function markReadAction(id: string): Promise<ApiResult> {
  return action("markRead", async () =>
    markRead(await requireUser(), String(id)),
  );
}

export async function markAllReadAction(): Promise<ApiResult> {
  return action("markAllRead", async () => markAllRead(await requireUser()));
}

export async function sendContactMessageAction(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): Promise<ApiResult<{ ticket: string }>> {
  return action("sendContactMessage", async () =>
    sendContactMessage(await optionalUser(), input),
  );
}
