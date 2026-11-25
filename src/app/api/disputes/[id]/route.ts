import { requireUser } from "@/server/auth/dal";
import { handle, notFound } from "@/server/handlers";
import { getDispute } from "@/server/services/disputes";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/disputes/[id]">,
) {
  return handle("disputes.get", async () => {
    const dispute = await getDispute(
      await requireUser(),
      (await ctx.params).id,
    );
    if (!dispute) throw notFound("Dispute");
    return Response.json({ dispute });
  });
}
