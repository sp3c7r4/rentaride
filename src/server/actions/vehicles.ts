"use server";

import type { ApiResult } from "@/lib/types";
import { requireMember } from "@/server/auth/dal";
import { action } from "@/server/handlers";
import {
  createListing,
  type ListingInput,
  setListed,
  updateListing,
} from "@/server/services/vehicles";

export async function createListingAction(
  input: ListingInput,
): Promise<ApiResult<{ id: string }>> {
  return action("createListing", async () =>
    createListing(await requireMember("owner"), input),
  );
}

export async function updateListingAction(
  id: string,
  input: ListingInput,
): Promise<ApiResult> {
  return action("updateListing", async () =>
    updateListing(await requireMember("owner"), String(id), input),
  );
}

export async function setListedAction(
  id: string,
  listed: boolean,
): Promise<ApiResult<{ declined: number }>> {
  return action("setListed", async () =>
    setListed(await requireMember("owner"), String(id), listed === true),
  );
}
