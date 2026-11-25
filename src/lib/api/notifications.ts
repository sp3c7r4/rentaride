import { apiGet, invalidate, mutate } from "@/lib/http";
import type { AppNotification, User } from "@/lib/types";
import { markAllReadAction, markReadAction } from "@/server/actions/account";

export async function listNotifications(
  _user: User,
): Promise<AppNotification[]> {
  return (
    await apiGet<{ notifications: AppNotification[] }>("/api/notifications")
  ).notifications;
}

export async function fetchUnreadCount(): Promise<number> {
  return (await apiGet<{ unread: number }>("/api/notifications", { count: 1 }))
    .unread;
}

export async function markRead(id: string, _userId: string) {
  // Fire and forget: the link navigates away immediately.
  await markReadAction(id);
  invalidate();
}

export const markAllRead = (_userId: string) => mutate(markAllReadAction());
