import { requireMember } from "@/server/auth/dal";
import { handle } from "@/server/handlers";
import { driverOverview, ownerOverview } from "@/server/services/dashboard";

/** Overview for the signed-in member's role. */
export async function GET() {
  return handle("dashboard", async () => {
    const user = await requireMember();
    return Response.json(
      user.role === "owner"
        ? { role: "owner", overview: await ownerOverview(user) }
        : { role: "driver", overview: await driverOverview(user) },
    );
  });
}
