import type { Metadata } from "next";
import { Suspense } from "react";
import { RequestsView } from "@/components/requests/requests-view";

export const metadata: Metadata = { title: "Requests | RentARide" };

export default function RequestsPage() {
  // RequestsView reads ?sent= with useSearchParams, which needs a boundary.
  return (
    <Suspense>
      <RequestsView />
    </Suspense>
  );
}
