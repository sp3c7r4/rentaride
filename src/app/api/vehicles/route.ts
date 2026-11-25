import type { NextRequest } from "next/server";
import { handle } from "@/server/handlers";
import { listLiveVehicles } from "@/server/services/vehicles";

/** Public marketplace search. */
export async function GET(request: NextRequest) {
  return handle("vehicles.list", async () => {
    const p = request.nextUrl.searchParams;
    const vehicles = await listLiveVehicles({
      q: p.get("q") || undefined,
      type: p.get("type") || undefined,
      city: p.get("city") || undefined,
      schedule: p.get("schedule") || undefined,
      sort: p.get("sort") || undefined,
    });
    return Response.json({ vehicles });
  });
}
