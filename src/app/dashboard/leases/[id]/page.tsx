import type { Metadata } from "next";
import { Suspense } from "react";
import { LeaseDetailView } from "@/components/leases/lease-detail-view";

export const metadata: Metadata = { title: "Lease | RentARide" };

export default function LeasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense>
      <LeaseDetailView params={params} />
    </Suspense>
  );
}
