import { connection } from "next/server";
import { handle } from "@/server/handlers";
import { listLiveCities } from "@/server/services/vehicles";

/** Cities that currently have live vehicles. */
export async function GET() {
  // Read the database at request time, not at build time.
  await connection();
  return handle("vehicles.cities", async () =>
    Response.json({ cities: await listLiveCities() }),
  );
}
