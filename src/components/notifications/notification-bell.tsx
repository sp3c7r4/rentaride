"use client";

import { Notification03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchUnreadCount,
  listNotifications,
  markAllRead,
} from "@/lib/api/notifications";
import { useQuery } from "@/lib/api/use-query";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NotificationItem } from "./notification-item";

/**
 * Unread count for the bell. Refreshes after any mutation and on focus, and
 * polls every minute for things that happen elsewhere (an owner approving).
 */
export function useUnreadCount(userId: string) {
  const q = useQuery(fetchUnreadCount, [userId]);
  const { refetch } = q;
  useEffect(() => {
    const t = setInterval(refetch, 60_000);
    return () => clearInterval(t);
  }, [refetch]);
  return q.status === "success" ? q.data : 0;
}

export function NotificationBell({
  user,
  className,
}: {
  user: User;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount(user.id);
  const label =
    unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className={cn("relative", className)}
          />
        }
      >
        <HugeiconsIcon icon={Notification03Icon} strokeWidth={1.75} />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold leading-none text-white tabular-nums"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(22rem,calc(100vw-2rem))] gap-0 p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="font-medium">Notifications</p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => void markAllRead(user.id)}
            >
              Mark all read
            </Button>
          )}
        </div>
        {open && <Latest user={user} onOpen={() => setOpen(false)} />}
        <div className="border-t p-2">
          <ButtonLink
            href="/dashboard/notifications"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </ButtonLink>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Latest({ user, onOpen }: { user: User; onOpen: () => void }) {
  const q = useQuery(() => listNotifications(user), [user.id]);
  if (q.status === "loading") {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }
  const items = q.status === "success" ? q.data.slice(0, 5) : [];
  if (items.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        You&apos;re all caught up.
      </p>
    );
  }
  return (
    <ul className="max-h-96 overflow-y-auto px-4">
      {items.map((n) => (
        <li key={n.id} className="border-b last:border-b-0">
          <NotificationItem notification={n} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}
