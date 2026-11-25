"use client";

import {
  Agreement01Icon,
  Calendar03Icon,
  Car01Icon,
  MoneyReceive01Icon,
} from "@hugeicons/core-free-icons";
import { ActivityList } from "@/components/app/activity-list";
import { PageHeader } from "@/components/app/page-header";
import { StatCard, StatCardSkeleton } from "@/components/app/stat-card";
import { VehiclePhoto } from "@/components/app/vehicle-photo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getOwnerOverview } from "@/lib/api/dashboard";
import { useQuery } from "@/lib/api/use-query";
import {
  formatDate,
  formatNaira,
  formatPeriod,
  formatRelative,
  SCHEDULE_LABEL,
} from "@/lib/format";
import type { User, VehicleStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { greeting } from "./greeting";

const STATUS_ROWS: { status: VehicleStatus; label: string; dot: string }[] = [
  { status: "live", label: "Live", dot: "bg-emerald-500" },
  { status: "leased", label: "Leased", dot: "bg-sky-500" },
  { status: "pending_review", label: "Pending review", dot: "bg-amber-500" },
  { status: "unlisted", label: "Unlisted", dot: "bg-zinc-400" },
  { status: "rejected", label: "Needs changes", dot: "bg-red-500" },
];

export function OwnerOverview({ user }: { user: User }) {
  const q = useQuery(() => getOwnerOverview(user.id), [user.id]);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.firstName}`}
        description="Your earnings, vehicles and lease requests at a glance."
        actions={
          <ButtonLink href="/dashboard/requests">Review requests</ButtonLink>
        }
      />

      {user.kycStatus === "pending" && (
        <Alert>
          <AlertTitle>We're verifying your account</AlertTitle>
          <AlertDescription>
            New vehicles go live once our team approves your details, usually
            within 48 hours.
          </AlertDescription>
        </Alert>
      )}

      {q.status === "loading" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </>
      )}
      {q.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{q.error}</AlertDescription>
        </Alert>
      )}
      {q.status === "success" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Earned this month"
              icon={MoneyReceive01Icon}
              value={formatNaira(q.data.earningsThisMonth)}
              hint={`${formatNaira(q.data.lifetimeEarnings)} paid out so far`}
            />
            <StatCard
              label="Next payout"
              icon={Calendar03Icon}
              value={
                q.data.nextPayout ? formatNaira(q.data.nextPayout.amount) : "—"
              }
              hint={
                q.data.nextPayout
                  ? `${formatPeriod(q.data.nextPayout.period)} · pays ${formatDate(q.data.nextPayout.payDate)}`
                  : "Nothing scheduled"
              }
            />
            <StatCard
              label="Vehicles"
              icon={Car01Icon}
              value={q.data.vehicleTotal}
              hint={`${q.data.vehicleCounts.live} live · ${q.data.vehicleCounts.leased} leased`}
            />
            <StatCard
              label="Active leases"
              icon={Agreement01Icon}
              value={q.data.activeLeases}
              hint={`${q.data.pendingRequests.length} request${q.data.pendingRequests.length === 1 ? "" : "s"} waiting`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Lease requests</CardTitle>
                <CardDescription>
                  Drivers waiting for your decision.
                </CardDescription>
                <CardAction>
                  <ButtonLink
                    variant="ghost"
                    size="sm"
                    href="/dashboard/requests"
                  >
                    View all
                  </ButtonLink>
                </CardAction>
              </CardHeader>
              <CardContent>
                {q.data.pendingRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You're all caught up. New requests will appear here.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {q.data.pendingRequests.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center gap-3 border-b py-3 last:border-b-0"
                      >
                        <VehiclePhoto
                          vehicle={r.vehicle}
                          sizes="48px"
                          className="size-12 shrink-0 rounded-lg"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <p className="truncate text-sm font-medium">
                            {r.driver.firstName} {r.driver.lastName} ·{" "}
                            {r.vehicle.make} {r.vehicle.model}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {SCHEDULE_LABEL[r.schedule]} · {r.termMonths} months
                            · from {formatDate(r.startDate)} ·{" "}
                            {formatRelative(r.createdAt)}
                          </p>
                        </div>
                        <ButtonLink
                          size="sm"
                          variant="outline"
                          href="/dashboard/requests"
                        >
                          Review
                        </ButtonLink>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your fleet</CardTitle>
                <CardDescription>Vehicles by status.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {STATUS_ROWS.map((row) => (
                    <li
                      key={row.status}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span
                        aria-hidden
                        className={cn("size-2 rounded-full", row.dot)}
                      />
                      <span className="flex-1 text-muted-foreground">
                        {row.label}
                      </span>
                      <span className="font-medium tabular-nums">
                        {q.data.vehicleCounts[row.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <ActivityList items={q.data.activity} />
        </>
      )}
    </>
  );
}
