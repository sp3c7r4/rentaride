import { requireMember } from "@/server/auth/dal";
import { handle } from "@/server/handlers";
import { listOwnerVehicles } from "@/server/services/vehicles";

/** The signed-in owner's listings. */
export async function GET() {
  return handle("my.vehicles", async () => {
    const owner = await requireMember("owner");
    return Response.json({ vehicles: await listOwnerVehicles(owner) });
  });
}
