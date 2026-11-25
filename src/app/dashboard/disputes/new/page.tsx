import type { Metadata } from "next";
import { Suspense } from "react";
import { NewDisputeForm } from "@/components/disputes/new-dispute-form";

export const metadata: Metadata = { title: "Open a dispute | RentARide" };

export default function NewDisputePage() {
  // The form reads ?lease= with useSearchParams, which needs a boundary.
  return (
    <Suspense>
      <NewDisputeForm />
    </Suspense>
  );
}
