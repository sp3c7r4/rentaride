import type { Metadata } from "next";
import { NotificationsView } from "@/components/notifications/notifications-view";

export const metadata: Metadata = { title: "Notifications | RentARide" };

export default function NotificationsPage() {
  return <NotificationsView />;
}
