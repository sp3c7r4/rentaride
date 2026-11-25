import { requireMember } from "@/server/auth/dal";
import { handle } from "@/server/handlers";
import { listDriverPayments } from "@/server/services/leases";

/** The driver's payment history. */
export async function GET() {
  return handle("payments.list", async () => {
    const driver = await requireMember("driver");
    return Response.json({ payments: await listDriverPayments(driver) });
  });
}
