import { requireMember } from "@/server/auth/dal";
import { handle } from "@/server/handlers";
import { listRequests } from "@/server/services/requests";

/** Requests the driver sent, or the owner received. */
export async function GET() {
  return handle("requests.list", async () => {
    const user = await requireMember();
    return Response.json({ requests: await listRequests(user) });
  });
}
