import { optionalUser } from "@/server/auth/dal";
import { handle } from "@/server/handlers";

/** The signed-in user, or `{ user: null }`. Never cached. */
export async function GET() {
  return handle("auth.me", async () => {
    const user = await optionalUser();
    return Response.json(
      { user },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  });
}
