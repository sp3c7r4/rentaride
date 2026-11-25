"use client";

import { ErrorState } from "@/components/app/error-state";

export default function ReviewError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorState {...props} homeHref="/review" homeLabel="Back to queue" />;
}
