"use client";

import Link from "next/link";
import { markRead } from "@/lib/api/notifications";
import { formatRelative } from "@/lib/format";
import type { AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One notification row. Opening it marks it read. */
export function NotificationItem({
  notification: n,
  onOpen,
  className,
}: {
  notification: AppNotification;
  onOpen?: () => void;
  className?: string;
}) {
  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          n.read ? "bg-border" : "bg-amber-500",
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">
          {n.title}
          {!n.read && <span className="sr-only"> (unread)</span>}
        </span>
        <span className="text-sm text-muted-foreground">{n.body}</span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatRelative(n.createdAt)}
      </span>
    </>
  );

  if (!n.href) {
    return <div className={cn("flex gap-3 py-3", className)}>{body}</div>;
  }
  return (
    <Link
      href={n.href}
      onClick={() => {
        if (!n.read) void markRead(n.id, n.userId);
        onOpen?.();
      }}
      className={cn(
        "-mx-2 flex gap-3 rounded-lg px-2 py-3 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      {body}
    </Link>
  );
}
