import type { Metadata } from "next";
import { Suspense } from "react";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import {
  VehicleDetailSkeleton,
  VehicleDetailView,
} from "@/components/marketplace/vehicle-detail";

export const metadata: Metadata = {
  title: "Vehicle details | RentARide",
};

export default function VehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <>
      <Navbar solid />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-28 pb-20 sm:px-6 lg:px-8">
        <Suspense fallback={<VehicleDetailSkeleton />}>
          <VehicleDetailView params={params} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
