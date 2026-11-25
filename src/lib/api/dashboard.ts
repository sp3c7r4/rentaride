import { apiGet } from "@/lib/http";
import type {
  DriverOverview,
  OwnerOverview,
} from "@/server/services/dashboard";
import type { LeaseView } from "@/server/services/leases";

export type { DriverOverview, OwnerOverview };
export type LeaseWithVehicle = LeaseView;

export async function getDriverOverview(
  _userId: string,
): Promise<DriverOverview> {
  const res = await apiGet<{ role: string; overview: DriverOverview }>(
    "/api/dashboard",
  );
  return res.overview;
}

export async function getOwnerOverview(
  _userId: string,
): Promise<OwnerOverview> {
  const res = await apiGet<{ role: string; overview: OwnerOverview }>(
    "/api/dashboard",
  );
  return res.overview;
}
