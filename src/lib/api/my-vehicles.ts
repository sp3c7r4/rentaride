import { apiGet, mutate } from "@/lib/http";
import type { ApiResult, User, Vehicle } from "@/lib/types";
import {
  createListingAction,
  setListedAction,
  updateListingAction,
} from "@/server/actions/vehicles";

export type OwnerVehicle = Vehicle & {
  pendingRequests: number;
  /** Active lease on this vehicle, if any. */
  activeLeaseId?: string;
};

/** The signed-in owner's vehicles, newest first, with request counts. */
export async function listMyVehicles(_user: User): Promise<OwnerVehicle[]> {
  return (await apiGet<{ vehicles: OwnerVehicle[] }>("/api/my/vehicles"))
    .vehicles;
}

export type VehicleInput = Pick<
  Vehicle,
  | "make"
  | "model"
  | "year"
  | "colour"
  | "plate"
  | "type"
  | "transmission"
  | "seats"
  | "fuel"
  | "city"
  | "mileageKm"
> & {
  weeklyPrice: number;
  /** Photo URLs from `uploadFile` (or existing ones). The first is the cover. */
  photos: string[];
  /** Upload key of a new registration document. */
  registrationKey?: string;
};

export const createVehicle = (
  input: VehicleInput,
): Promise<ApiResult<{ id: string }>> => mutate(createListingAction(input));

export const updateVehicle = (
  id: string,
  input: VehicleInput,
): Promise<ApiResult> => mutate(updateListingAction(id, input));

export const setVehicleListed = (
  id: string,
  listed: boolean,
): Promise<ApiResult<{ declined: number }>> =>
  mutate(setListedAction(id, listed));
