"use client";

import { DriverOverview } from "@/components/dashboard/driver-overview";
import { OwnerOverview } from "@/components/dashboard/owner-overview";
import { useSession } from "@/lib/session";

export default function DashboardPage() {
  const session = useSession();
  if (session.status !== "signed_in") return null;
  return session.user.role === "owner" ? (
    <OwnerOverview user={session.user} />
  ) : (
    <DriverOverview user={session.user} />
  );
}
