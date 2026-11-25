"use client";

import { ErrorState } from "@/components/app/error-state";

/** Errors in public pages and auth screens. */
export default function RootError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <ErrorState {...props} className="max-w-md p-0" />
    </main>
  );
}
