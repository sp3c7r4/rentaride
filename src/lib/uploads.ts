import { ApiError } from "./http";

export type UploadKind =
  | "vehicle_photo"
  | "registration"
  | "licence"
  | "evidence";

export type Uploaded = {
  key: string;
  /** Same-origin URL that serves the file (`/files/<key>`). */
  url: string;
  name: string;
  contentType: string;
};

/** Upload one file. The server re-encodes images and checks the type. */
export async function uploadFile(
  file: File,
  kind: UploadKind,
): Promise<Uploaded> {
  const body = new FormData();
  body.set("kind", kind);
  body.set("file", file);
  const res = await fetch("/api/uploads", {
    method: "POST",
    body,
    credentials: "same-origin",
  });
  const json = (await res.json().catch(() => null)) as
    | (Uploaded & { error?: string })
    | null;
  if (!res.ok || !json)
    throw new ApiError(json?.error ?? "Upload failed. Try again.", res.status);
  return json;
}
