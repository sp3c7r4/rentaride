"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/** Fallback UI for route error boundaries (`error.tsx`). */
export function ErrorState({
  error,
  retry,
  homeHref = "/",
  homeLabel = "Back to home",
  className,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  homeHref?: string;
  homeLabel?: string;
  className?: string;
}) {
  useEffect(() => {
    // Replace with an error-reporting service once one is set up.
    console.error(error);
  }, [error]);

  return (
    <Empty className={className ?? "rounded-2xl border border-dashed p-12"}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} />
        </EmptyMedia>
        <EmptyTitle>Something went wrong</EmptyTitle>
        <EmptyDescription>
          This page didn&apos;t load. Try again, and if it keeps happening,
          contact support.
          {error.digest && (
            <span className="mt-2 block font-mono text-xs">
              Reference {error.digest}
            </span>
          )}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <ButtonLink variant="outline" href={homeHref}>
          {homeLabel}
        </ButtonLink>
      </EmptyContent>
    </Empty>
  );
}
