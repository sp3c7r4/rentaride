import { z } from "zod";
import { requireUser } from "@/server/auth/dal";
import { AppError, handle } from "@/server/handlers";
import { rateLimit } from "@/server/rate-limit";
import { storeUpload } from "@/server/services/uploads";

const kind = z.enum(["vehicle_photo", "registration", "licence", "evidence"]);

/**
 * Upload one file (multipart field `file`, plus `kind`). Signed-in users only.
 * Returns the storage key to pass to the Server Action that uses it.
 */
export async function POST(request: Request) {
  return handle("uploads.create", async () => {
    const user = await requireUser();
    await rateLimit(`upload:${user.id}`, 60, 3600);
    const form = await request.formData().catch(() => {
      throw new AppError("Send the file as multipart form data.");
    });
    const parsed = kind.safeParse(form.get("kind"));
    if (!parsed.success) throw new AppError("Unknown upload type.");
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Choose a file to upload.");
    return Response.json(await storeUpload(user, parsed.data, file), {
      status: 201,
    });
  });
}
