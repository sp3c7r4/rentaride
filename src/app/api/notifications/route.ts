import { requireUser } from "@/server/auth/dal";
import { handle } from "@/server/handlers";
import { listNotifications, unreadCount } from "@/server/services/account";

/** Notifications, newest first. `?count=1` returns only the unread count. */
export async function GET(request: Request) {
  return handle("notifications", async () => {
    const user = await requireUser();
    if (new URL(request.url).searchParams.get("count"))
      return Response.json({ unread: await unreadCount(user) });
    return Response.json({ notifications: await listNotifications(user) });
  });
}
