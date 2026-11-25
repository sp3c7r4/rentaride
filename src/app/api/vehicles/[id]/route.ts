import { optionalUser } from "@/server/auth/dal";
import { handle, notFound } from "@/server/handlers";
import { getVehicleDetail } from "@/server/services/vehicles";

/** One listing. Unpublished listings are only visible to their owner. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/vehicles/[id]">,
) {
  return handle("vehicles.get", async () => {
    const { id } = await ctx.params;
    const detail = await getVehicleDetail(id, await optionalUser());
    if (!detail) throw notFound("Vehicle");
    return Response.json(detail);
  });
}
