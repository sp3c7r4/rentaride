import { apiGet } from "@/lib/http";
import type { Schedule, Vehicle, VehicleType } from "@/lib/types";

export type VehicleSort = "recommended" | "price_asc" | "price_desc" | "rating";

export type VehicleFilters = {
  q?: string;
  type?: VehicleType | "";
  city?: string;
  schedule?: Schedule;
  sort?: VehicleSort;
};

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  sedan: "Sedan",
  suv: "SUV",
  van: "Van",
  pickup: "Pickup",
  electric: "Electric",
  luxury: "Luxury",
};

export const SORT_LABEL: Record<VehicleSort, string> = {
  recommended: "Recommended",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  rating: "Top rated",
};

/** Cities that currently have live vehicles, alphabetically. */
export async function listCities(): Promise<string[]> {
  return (await apiGet<{ cities: string[] }>("/api/vehicles/cities")).cities;
}

export async function listVehicles(
  filters: VehicleFilters,
): Promise<Vehicle[]> {
  return (await apiGet<{ vehicles: Vehicle[] }>("/api/vehicles", filters))
    .vehicles;
}

export type VehicleDetail = {
  vehicle: Vehicle;
  owner: {
    firstName: string;
    lastInitial: string;
    city: string;
    createdAt: string;
    vehicleCount: number;
  };
};

/** Null when the listing doesn't exist or isn't visible to this viewer. */
export async function getVehicle(id: string): Promise<VehicleDetail | null> {
  try {
    return await apiGet<VehicleDetail>(
      `/api/vehicles/${encodeURIComponent(id)}`,
    );
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}
