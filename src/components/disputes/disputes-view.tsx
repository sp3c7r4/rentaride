"use client";

import { LegalHammerIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { DISPUTE_CATEGORY_LABEL, listDisputes } from "@/lib/api/disputes";
import { useQuery } from "@/lib/api/use-query";
import { formatRelative } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";

export function DisputesView() {
  const session = useSession();
  if (session.status !== "signed_in") return null;
  return <Disputes user={session.user} />;
}

function Disputes({ user }: { user: User }) {
  const q = useQuery(() => listDisputes(user), [user.id]);

  return (
    <>
      <PageHeader
        title="Disputes"
        description="Report a problem with a lease. A case manager works with both sides to resolve it."
        actions={
          <ButtonLink href="/dashboard/disputes/new">Open a dispute</ButtonLink>
        }
      />

      {q.status === "loading" && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
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
              <HugeiconsIcon icon={LegalHammerIcon} strokeWidth={1.5} />
            </EmptyMedia>
            <EmptyTitle>No disputes</EmptyTitle>
            <EmptyDescription>
              If something goes wrong on a lease, such as damage, a payment
              problem or the vehicle&apos;s condition, open a dispute and
              we&apos;ll step in.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ButtonLink variant="outline" href="/dashboard/disputes/new">
              Open a dispute
            </ButtonLink>
          </EmptyContent>
        </Empty>
      )}
      {q.status === "success" && q.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {q.data.map((d) => {
            const last = d.messages.at(-1);
            return (
              <li key={d.id}>
                <Link
                  href={`/dashboard/disputes/${d.id}`}
                  className="block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <Card size="sm" className="transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-semibold">{d.subject}</h2>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {DISPUTE_CATEGORY_LABEL[d.category]} · {d.vehicle.year}{" "}
                        {d.vehicle.make} {d.vehicle.model}
                        {d.openedBy === user.id
                          ? ""
                          : " · opened by the other party"}
                      </p>
                      {last && (
                        <p className="line-clamp-1 text-sm">
                          <span className="font-medium">
                            {last.authorId === user.id
                              ? "You"
                              : d.authors[last.authorId]}
                            :
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {last.body || "Sent an attachment"}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {formatRelative(last.createdAt)}
                          </span>
                        </p>
                      )}
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
