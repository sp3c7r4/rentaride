import { optionalUser } from "@/server/auth/dal";
import { handle } from "@/server/handlers";
import { canReadUpload, isPublicKind } from "@/server/services/uploads";
import { getObject } from "@/server/storage";

/**
 * Serve an uploaded file. Vehicle photos are public and cached; licences,
 * registration documents and evidence are checked per request.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/files/[...key]">,
) {
  return handle("files.get", async () => {
    const key = (await ctx.params).key.join("/");
    const notFound = () => new Response("Not found", { status: 404 });
    // Keys look like `<kind>/<userId>/<id>.<ext>`; reject anything else.
    if (!/^[a-z_]+\/[a-z0-9_]+\/[a-z0-9_]+\.(jpg|pdf)$/.test(key))
      return notFound();

    const access = await canReadUpload(await optionalUser(), key);
    if (!access) return notFound();
    const object = await getObject(key);
    if (!object) return notFound();

    return new Response(object.body, {
      headers: {
        "Content-Type": object.contentType,
        ...(object.length ? { "Content-Length": String(object.length) } : {}),
        "Cache-Control": isPublicKind(access.kind)
          ? "public, max-age=31536000, immutable"
          : "private, no-store",
        "X-Content-Type-Options": "nosniff",
        // PDFs open in the browser, but scripts inside them can't run here.
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  });
}
