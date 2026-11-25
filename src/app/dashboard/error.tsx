"use client";

import { ErrorState } from "@/components/app/error-state";

export default function DashboardError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorState {...props} homeHref="/dashboard" homeLabel="Go to overview" />
  );
}
