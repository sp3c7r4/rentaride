import { requireUser } from "@/server/auth/dal";
import { handle } from "@/server/handlers";
import { listBanks } from "@/server/services/banking";

/** Nigerian banks for the payout account form. Signed-in users only. */
export async function GET() {
  return handle("banks.list", async () => {
    await requireUser();
    return Response.json(
      { banks: await listBanks() },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  });
}
