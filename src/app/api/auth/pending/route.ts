import { handle } from "@/server/handlers";
import { getPendingSignup } from "@/server/services/auth";

/** Masked email for the verify page, from the signed pending-signup cookie. */
export async function GET() {
  return handle("auth.pending", async () =>
    Response.json(
      { pending: await getPendingSignup() },
      { headers: { "Cache-Control": "private, no-store" } },
    ),
  );
}
