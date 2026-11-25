import { NotificationItem } from "@/components/notifications/notification-item";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AppNotification } from "@/lib/types";

export function ActivityList({ items }: { items: AppNotification[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Updates on your account.</CardDescription>
        <CardAction>
          <ButtonLink variant="ghost" size="sm" href="/dashboard/notifications">
            View all
          </ButtonLink>
        </CardAction>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="flex flex-col">
            {items.map((n) => (
              <li key={n.id} className="border-b last:border-b-0">
                <NotificationItem notification={n} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
