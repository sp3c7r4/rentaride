import type { Metadata } from "next";
import { Suspense } from "react";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { BrowseClient } from "@/components/marketplace/browse-client";
import { VehicleCardSkeleton } from "@/components/marketplace/vehicle-card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Find a vehicle | RentARide",
  description:
    "Browse verified vehicles across Nigeria and lease one on a daily, weekly or monthly repayment schedule.",
};

export default function BrowsePage() {
  return (
    <>
      <Navbar solid />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-28 pb-20 sm:px-6 lg:px-8">
        {/* Search params are read on the client, so the page needs a boundary. */}
        <Suspense fallback={<BrowseFallback />}>
          <BrowseClient />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

function BrowseFallback() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <Skeleton className="h-16 rounded-2xl" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <VehicleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
