import { requireUser } from "@/server/auth/dal";
import { handle, notFound } from "@/server/handlers";
import { getLease } from "@/server/services/leases";

/** A lease the caller is part of (or any lease, for staff). */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/leases/[id]">,
) {
  return handle("leases.get", async () => {
    const user = await requireUser();
    const lease = await getLease(user, (await ctx.params).id);
    if (!lease) throw notFound("Lease");
    return Response.json({ lease });
  });
}
