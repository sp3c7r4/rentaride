import { requireStaff } from "@/server/auth/dal";
import { handle } from "@/server/handlers";
import { reviewQueues } from "@/server/services/review";

/** KYC and listing queues. Staff only. */
export async function GET() {
  return handle("review.queues", async () => {
    await requireStaff();
    return Response.json(await reviewQueues());
  });
}
