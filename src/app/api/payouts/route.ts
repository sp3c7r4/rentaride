import { requireMember } from "@/server/auth/dal";
import { handle } from "@/server/handlers";
import { payoutSummary } from "@/server/services/payouts";

/** The owner's payouts and payout account. */
export async function GET() {
  return handle("payouts", async () => {
    const owner = await requireMember("owner");
    return Response.json(await payoutSummary(owner));
  });
}
