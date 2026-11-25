"use client";

import { Note01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { KycBadge } from "@/components/app/kyc-badge";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { VehiclePhoto } from "@/components/app/vehicle-photo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listRequests, type RequestRow } from "@/lib/api/requests";
import { useQuery } from "@/lib/api/use-query";
import {
  formatDate,
  formatNaira,
  formatRelative,
  SCHEDULE_LABEL,
  SCHEDULE_UNIT,
} from "@/lib/format";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";
import { RequestActions } from "./request-actions";

type Filter = "pending" | "decided" | "all";

export function RequestsView() {
  const session = useSession();
  if (session.status !== "signed_in") return null;
  return <RequestsList user={session.user} />;
}

function RequestsList({ user }: { user: User }) {
  const params = useSearchParams();
  const sent = params.get("sent");
  const [filter, setFilter] = useState<Filter>("pending");
  const q = useQuery(() => listRequests(user), [user.id]);
  const isOwner = user.role === "owner";

  const rows =
    q.status === "success"
      ? q.data.filter((r) =>
          filter === "all"
            ? true
            : filter === "pending"
              ? r.status === "pending"
              : r.status !== "pending",
        )
      : [];
  const pendingCount =
    q.status === "success"
      ? q.data.filter((r) => r.status === "pending").length
      : 0;

  return (
    <>
      <PageHeader
        title="Lease requests"
        description={
          isOwner
            ? "Review drivers who want to lease your vehicles."
            : "Track the requests you've sent to owners."
        }
        actions={
          !isOwner && <ButtonLink href="/browse">Find a vehicle</ButtonLink>
        }
      />

      {sent && (
        <Alert>
          <AlertTitle>Request sent</AlertTitle>
          <AlertDescription>
            The owner usually responds within 24 hours. We'll notify you as soon
            as they do.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="decided">Decided</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {q.status === "loading" && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      )}
      {q.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{q.error}</AlertDescription>
        </Alert>
      )}
      {q.status === "success" && rows.length === 0 && (
        <Empty className="rounded-2xl border border-dashed p-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Note01Icon} strokeWidth={1.5} />
            </EmptyMedia>
            <EmptyTitle>
              {filter === "pending"
                ? "No pending requests"
                : "Nothing here yet"}
            </EmptyTitle>
            <EmptyDescription>
              {isOwner
                ? "When a driver requests one of your vehicles, it shows up here."
                : "Find a vehicle you like and send the owner a request."}
            </EmptyDescription>
          </EmptyHeader>
          {!isOwner && (
            <EmptyContent>
              <ButtonLink href="/browse">Browse vehicles</ButtonLink>
            </EmptyContent>
          )}
        </Empty>
      )}
      {rows.length > 0 && (
        <ul className="flex flex-col gap-4">
          {rows.map((r) => (
            <li key={r.id}>
              <RequestCard
                request={r}
                isOwner={isOwner}
                highlight={r.id === sent}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function RequestCard({
  request: r,
  isOwner,
  highlight,
}: {
  request: RequestRow;
  isOwner: boolean;
  highlight: boolean;
}) {
  const price = r.vehicle.pricing[r.schedule];
  return (
    <Card className={highlight ? "ring-2 ring-amber-400" : undefined}>
      <CardContent className="flex flex-col gap-5 md:flex-row md:items-start">
        <Link href={`/vehicles/${r.vehicle.id}`} className="shrink-0">
          <VehiclePhoto
            vehicle={r.vehicle}
            sizes="160px"
            className="aspect-[4/3] w-full rounded-xl md:w-40"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">
              {isOwner
                ? `${r.driver.firstName} ${r.driver.lastName}`
                : `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`}
            </h2>
            <StatusBadge status={r.status} />
            {isOwner && <KycBadge status={r.driver.kycStatus} />}
          </div>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model} · driver in ${r.driver.city || "—"} · member since ${new Date(r.driver.createdAt).getFullYear()}`
              : `Owner ${r.owner.firstName} ${r.owner.lastName.charAt(0)}. · ${r.vehicle.city}`}
          </p>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Schedule</dt>
              <dd className="font-medium">{SCHEDULE_LABEL[r.schedule]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Repayment</dt>
              <dd className="font-medium tabular-nums">
                {formatNaira(price)} / {SCHEDULE_UNIT[r.schedule]}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Term</dt>
              <dd className="font-medium">{r.termMonths} months</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Starts</dt>
              <dd className="font-medium">{formatDate(r.startDate)}</dd>
            </div>
          </dl>

          {r.message && (
            <blockquote className="border-l-2 pl-3 text-sm text-muted-foreground">
              “{r.message}”
            </blockquote>
          )}
          {r.status === "declined" && r.declineReason && (
            <p className="text-sm text-muted-foreground">
              Reason: {r.declineReason}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Sent {formatRelative(r.createdAt)}
            {r.decidedAt ? ` · decided ${formatRelative(r.decidedAt)}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 gap-2 md:flex-col md:items-end">
          {r.status === "pending" && (
            <RequestActions request={r} mode={isOwner ? "owner" : "driver"} />
          )}
          {r.status === "approved" && (
            <ButtonLink variant="outline" href="/dashboard/leases">
              View lease
            </ButtonLink>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
