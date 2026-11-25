"use client";

import { Notification03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listNotifications, markAllRead } from "@/lib/api/notifications";
import { useQuery } from "@/lib/api/use-query";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";
import { NotificationItem } from "./notification-item";

export function NotificationsView() {
  const session = useSession();
  if (session.status !== "signed_in") return null;
  return <Notifications user={session.user} />;
}

function Notifications({ user }: { user: User }) {
  const q = useQuery(() => listNotifications(user), [user.id]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const all = q.status === "success" ? q.data : [];
  const unread = all.filter((n) => !n.read).length;
  const rows = filter === "unread" ? all.filter((n) => !n.read) : all;

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Requests, payments, payouts and dispute updates."
        actions={
          unread > 0 && (
            <Button variant="outline" onClick={() => void markAllRead(user.id)}>
              Mark all as read
            </Button>
          )
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread{unread > 0 ? ` (${unread})` : ""}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {q.status === "loading" && <Skeleton className="h-80 rounded-xl" />}
      {q.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{q.error}</AlertDescription>
        </Alert>
      )}
      {q.status === "success" && rows.length === 0 && (
        <Empty className="rounded-2xl border border-dashed p-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Notification03Icon} strokeWidth={1.5} />
            </EmptyMedia>
            <EmptyTitle>
              {filter === "unread"
                ? "You're all caught up"
                : "No notifications yet"}
            </EmptyTitle>
            <EmptyDescription>
              We&apos;ll let you know when something needs your attention.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {rows.length > 0 && (
        <Card>
          <CardContent>
            <ul className="flex flex-col">
              {rows.map((n) => (
                <li key={n.id} className="border-b last:border-b-0">
                  <NotificationItem notification={n} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
