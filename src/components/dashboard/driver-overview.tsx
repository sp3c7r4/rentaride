"use client";

import {
  Calendar03Icon,
  Car01Icon,
  CreditCardIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ActivityList } from "@/components/app/activity-list";
import { PageHeader } from "@/components/app/page-header";
import { StatCard, StatCardSkeleton } from "@/components/app/stat-card";
import { VehiclePhoto } from "@/components/app/vehicle-photo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getDriverOverview } from "@/lib/api/dashboard";
import { useQuery } from "@/lib/api/use-query";
import {
  formatDate,
  formatNaira,
  formatRelative,
  SCHEDULE_LABEL,
  SCHEDULE_UNIT,
} from "@/lib/format";
import type { User } from "@/lib/types";
import { greeting } from "./greeting";

export function DriverOverview({ user }: { user: User }) {
  const q = useQuery(() => getDriverOverview(user.id), [user.id]);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.firstName}`}
        description="Your lease, repayments and requests at a glance."
        actions={<ButtonLink href="/browse">Find a vehicle</ButtonLink>}
      />

      {user.kycStatus === "pending" && (
        <Alert>
          <AlertTitle>We're reviewing your licence</AlertTitle>
          <AlertDescription>
            This usually takes under 48 hours. You can browse and request
            vehicles in the meantime.
          </AlertDescription>
        </Alert>
      )}

      {q.status === "loading" && <OverviewSkeleton />}
      {q.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{q.error}</AlertDescription>
        </Alert>
      )}
      {q.status === "success" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
            <StatCard
              label="Next repayment"
              icon={Calendar03Icon}
              value={
                q.data.activeLease?.next
                  ? formatNaira(q.data.activeLease.next.amount)
                  : "—"
              }
              hint={
                q.data.activeLease?.next
                  ? `Due ${formatDate(q.data.activeLease.next.dueDate)}`
                  : "No active lease"
              }
            />
            <StatCard
              label="Outstanding balance"
              icon={Wallet01Icon}
              value={formatNaira(q.data.activeLease?.outstanding ?? 0)}
              hint={
                q.data.activeLease
                  ? `Until ${formatDate(q.data.activeLease.endDate)}`
                  : "Nothing owed"
              }
            />
            <StatCard
              label="Total paid"
              icon={CreditCardIcon}
              value={formatNaira(q.data.totalPaid)}
              hint="Across all leases"
            />
          </div>

          {q.data.activeLease ? (
            <ActiveLeaseCard lease={q.data.activeLease} />
          ) : (
            <Card>
              <CardContent>
                <Empty className="p-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={Car01Icon} strokeWidth={1.5} />
                    </EmptyMedia>
                    <EmptyTitle>No active lease yet</EmptyTitle>
                    <EmptyDescription>
                      Browse verified vehicles near you and request one on a
                      daily, weekly or monthly schedule.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <ButtonLink href="/browse">Browse vehicles</ButtonLink>
                  </EmptyContent>
                </Empty>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pending requests</CardTitle>
                <CardDescription>
                  Waiting for the owner to respond.
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
                    No pending requests.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {q.data.pendingRequests.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center gap-3 border-b py-3 last:border-b-0"
                      >
                        <VehiclePhoto
                          vehicle={r.vehicle}
                          sizes="48px"
                          className="size-12 shrink-0 rounded-lg"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <p className="truncate text-sm font-medium">
                            {r.vehicle.year} {r.vehicle.make} {r.vehicle.model}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {SCHEDULE_LABEL[r.schedule]} · {r.termMonths} months
                            · sent {formatRelative(r.createdAt)}
                          </p>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <ActivityList items={q.data.activity} />
          </div>
        </>
      )}
    </>
  );
}

function ActiveLeaseCard({
  lease,
}: {
  lease: NonNullable<
    Awaited<ReturnType<typeof getDriverOverview>>["activeLease"]
  >;
}) {
  const total = lease.repayments.length;
  const pct = Math.round((lease.paidCount / total) * 100);
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <VehiclePhoto
          vehicle={lease.vehicle}
          sizes="(min-width: 768px) 40vw, 100vw"
          className="aspect-[16/10] md:aspect-auto md:h-full"
          priority
        />
        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">Active lease</p>
              <h2 className="text-xl font-semibold tracking-tight">
                {lease.vehicle.year} {lease.vehicle.make} {lease.vehicle.model}
              </h2>
              <p className="text-sm text-muted-foreground">
                {lease.vehicle.plate} · Owner {lease.owner.firstName}{" "}
                {lease.owner.lastName.charAt(0)}.
              </p>
            </div>
            <Badge variant="secondary">{SCHEDULE_LABEL[lease.schedule]}</Badge>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Repayment</dt>
              <dd className="font-medium tabular-nums">
                {formatNaira(lease.vehicle.pricing[lease.schedule])} /{" "}
                {SCHEDULE_UNIT[lease.schedule]}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Started</dt>
              <dd className="font-medium">{formatDate(lease.startDate)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Ends</dt>
              <dd className="font-medium">{formatDate(lease.endDate)}</dd>
            </div>
          </dl>

          <Progress value={pct} aria-label="Repayment progress">
            <div className="flex w-full justify-between text-sm">
              <span className="text-muted-foreground">
                {lease.paidCount} of {total} repayments made
              </span>
              <span className="font-medium tabular-nums">{pct}%</span>
            </div>
          </Progress>

          <div className="mt-auto flex flex-wrap gap-2">
            <ButtonLink href={`/dashboard/leases/${lease.id}`}>
              {lease.next ? "Make a payment" : "View lease"}
            </ButtonLink>
            <ButtonLink
              variant="outline"
              href={`/dashboard/leases/${lease.id}`}
            >
              Repayment schedule
            </ButtonLink>
          </div>
        </div>
      </div>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </>
  );
}
