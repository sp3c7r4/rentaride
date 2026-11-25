import { requireMember } from "@/server/auth/dal";
import { handle } from "@/server/handlers";
import { listLeases } from "@/server/services/leases";

export async function GET() {
  return handle("leases.list", async () => {
    const user = await requireMember();
    return Response.json({ leases: await listLeases(user) });
  });
}
