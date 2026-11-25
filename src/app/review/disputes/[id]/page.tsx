import type { Metadata } from "next";
import { Suspense } from "react";
import { DisputeThreadView } from "@/components/disputes/dispute-thread";

export const metadata: Metadata = { title: "Dispute | RentARide" };

export default function ReviewDisputePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense>
      <DisputeThreadView params={params} variant="staff" />
    </Suspense>
  );
}
