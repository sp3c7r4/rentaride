"use client";

import { Agreement01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { VehiclePhoto } from "@/components/app/vehicle-photo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
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
import { listLeases } from "@/lib/api/leases";
import { useQuery } from "@/lib/api/use-query";
import { formatDate, formatNaira, SCHEDULE_LABEL } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";

export default function LeasesPage() {
  const session = useSession();
  if (session.status !== "signed_in") return null;
  return <Leases user={session.user} />;
}

function Leases({ user }: { user: User }) {
  const q = useQuery(() => listLeases(user), [user.id]);
  const isDriver = user.role === "driver";

  return (
    <>
      <PageHeader
        title="Leases"
        description={
          isDriver
            ? "Your current and past vehicle leases."
            : "Leases on your vehicles and what has been collected."
        }
      />

      {q.status === "loading" && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      )}
      {q.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{q.error}</AlertDescription>
        </Alert>
      )}
      {q.status === "success" && q.data.length === 0 && (
        <Empty className="rounded-2xl border border-dashed p-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Agreement01Icon} strokeWidth={1.5} />
            </EmptyMedia>
            <EmptyTitle>No leases yet</EmptyTitle>
            <EmptyDescription>
              {isDriver
                ? "Once an owner approves your request, your lease appears here."
                : "Approve a lease request to start your first lease."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ButtonLink href={isDriver ? "/browse" : "/dashboard/requests"}>
              {isDriver ? "Find a vehicle" : "Review requests"}
            </ButtonLink>
          </EmptyContent>
        </Empty>
      )}
      {q.status === "success" && q.data.length > 0 && (
        <ul className="flex flex-col gap-4">
          {q.data.map((l) => {
            const pct = Math.round((l.paidCount / l.repayments.length) * 100);
            return (
              <li key={l.id}>
                <Link
                  href={`/dashboard/leases/${l.id}`}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      <VehiclePhoto
                        vehicle={l.vehicle}
                        sizes="160px"
                        className="aspect-[4/3] w-full shrink-0 rounded-xl sm:w-40"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold">
                            {l.vehicle.year} {l.vehicle.make} {l.vehicle.model}
                          </h2>
                          <StatusBadge status={l.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {SCHEDULE_LABEL[l.schedule]} ·{" "}
                          {formatDate(l.startDate)} to {formatDate(l.endDate)} ·{" "}
                          {isDriver
                            ? `owner ${l.owner.firstName} ${l.owner.lastName.charAt(0)}.`
                            : `driver ${l.driver.firstName} ${l.driver.lastName}`}
                        </p>
                        <Progress value={pct} aria-label="Repayment progress">
                          <div className="flex w-full justify-between text-xs">
                            <span className="text-muted-foreground">
                              {l.paidCount} of {l.repayments.length} repayments
                            </span>
                            <span className="tabular-nums">
                              {formatNaira(l.outstanding)} outstanding
                            </span>
                          </div>
                        </Progress>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
