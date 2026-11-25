import { requireMember } from "@/server/auth/dal";
import { handle } from "@/server/handlers";
import { listDisputableLeases } from "@/server/services/disputes";

/** Leases the member can open a dispute on. */
export async function GET() {
  return handle("disputes.leases", async () =>
    Response.json({
      leases: await listDisputableLeases(await requireMember()),
    }),
  );
}
