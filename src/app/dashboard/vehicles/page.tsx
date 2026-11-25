import type { Metadata } from "next";
import { VehiclesView } from "@/components/vehicles/vehicles-view";

export const metadata: Metadata = { title: "Vehicles | RentARide" };

export default function VehiclesPage() {
  return <VehiclesView />;
}
