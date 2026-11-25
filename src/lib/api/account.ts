import { mutate } from "@/lib/http";
import type { ApiResult } from "@/lib/types";
import { uploadFile } from "@/lib/uploads";
import {
  updateLicenceAction,
  updateProfileAction,
} from "@/server/actions/account";
import { changePasswordAction } from "@/server/actions/auth";

export const updateProfile = (input: {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
}): Promise<ApiResult> => mutate(updateProfileAction(input));

/** Change password. Other devices are signed out; this one stays signed in. */
export function changePassword(
  current: string,
  next: string,
): Promise<ApiResult> {
  return changePasswordAction({ current, next });
}

/** Upload the new licence photo, then save. Verification restarts. */
export async function updateLicence(input: {
  number: string;
  expiry: string;
  file: File;
}): Promise<ApiResult> {
  try {
    const upload = await uploadFile(input.file, "licence");
    return mutate(
      updateLicenceAction({
        number: input.number,
        expiry: input.expiry,
        fileKey: upload.key,
      }),
    );
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Upload failed.",
    };
  }
}
