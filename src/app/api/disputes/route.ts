import { requireUser } from "@/server/auth/dal";
import { handle } from "@/server/handlers";
import { listDisputes } from "@/server/services/disputes";

export async function GET() {
  return handle("disputes.list", async () =>
    Response.json({ disputes: await listDisputes(await requireUser()) }),
  );
}
