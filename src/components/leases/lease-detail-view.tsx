"use client";

import {
  ArrowLeft01Icon,
  Calendar03Icon,
  SecurityCheckIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { StatCard, StatCardSkeleton } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { VehiclePhoto } from "@/components/app/vehicle-photo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
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
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  confirmPayment,
  getLease,
  PAYMENT_METHOD_LABEL,
  type PaymentStatus,
} from "@/lib/api/leases";
import { useQuery } from "@/lib/api/use-query";
import {
  formatDate,
  formatNaira,
  SCHEDULE_LABEL,
  SCHEDULE_UNIT,
} from "@/lib/format";
import { OWNER_SHARE } from "@/lib/pricing";
import { useSession } from "@/lib/session";
import type { Repayment, User } from "@/lib/types";
import { CheckoutDialog } from "./checkout-dialog";

export function LeaseDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const session = useSession();
  if (session.status !== "signed_in") return null;
  return <LeaseDetail id={id} user={session.user} />;
}

function LeaseDetail({ id, user }: { id: string; user: User }) {
  const q = useQuery(() => getLease(id, user), [id, user.id]);
  // The repayment being paid is captured when checkout opens, so the dialog
  // keeps showing its success screen after `lease.next` moves on.
  const [paying, setPaying] = useState<Repayment | null>(null);
  const returned = usePaymentReturn();
  const isDriver = user.role === "driver";

  if (q.status === "loading") {
    return (
      <>
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </>
    );
  }

  if (q.status === "error" || !q.data) {
    return (
      <Empty className="rounded-2xl border border-dashed p-12">
        <EmptyHeader>
          <EmptyTitle>Lease not found</EmptyTitle>
          <EmptyDescription>
            It may belong to another account, or the link is wrong.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ButtonLink href="/dashboard/leases">Back to leases</ButtonLink>
        </EmptyContent>
      </Empty>
    );
  }

  const lease = q.data;
  const vehicleName = `${lease.vehicle.make} ${lease.vehicle.model}`;
  const total = lease.repayments.length;
  const pct = Math.round((lease.paidCount / total) * 100);
  const collected = lease.repayments
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.amount, 0);
  const canPay = isDriver && lease.status === "active" && lease.next;

  return (
    <>
      <Link
        href="/dashboard/leases"
        className="-mb-4 flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        All leases
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {lease.vehicle.year} {vehicleName}
            <StatusBadge status={lease.status} />
          </span>
        }
        description={`${SCHEDULE_LABEL[lease.schedule]} lease · ${formatDate(lease.startDate)} to ${formatDate(lease.endDate)} · ${
          isDriver
            ? `owner ${lease.owner.firstName} ${lease.owner.lastName.charAt(0)}.`
            : `driver ${lease.driver.firstName} ${lease.driver.lastName}`
        }`}
        actions={
          <>
            <ButtonLink
              variant="outline"
              href={`/dashboard/disputes/new?lease=${lease.id}`}
            >
              Report a problem
            </ButtonLink>
            {canPay && (
              <Button onClick={() => setPaying(lease.next ?? null)}>
                Pay {formatNaira(lease.next?.amount ?? 0)}
              </Button>
            )}
          </>
        }
      />

      {returned && <PaymentReturnAlert result={returned} />}

      {lease.status === "completed" && (
        <Alert>
          <AlertTitle>Lease completed</AlertTitle>
          <AlertDescription>
            Every repayment has been made. The deposit of{" "}
            {formatNaira(lease.deposit)} is released after the return
            inspection.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label={isDriver ? "Next repayment" : "Next collection"}
          icon={Calendar03Icon}
          value={lease.next ? formatNaira(lease.next.amount) : "—"}
          hint={
            lease.next ? `Due ${formatDate(lease.next.dueDate)}` : "All paid"
          }
        />
        <StatCard
          label={isDriver ? "Outstanding" : "Still to collect"}
          icon={Wallet01Icon}
          value={formatNaira(lease.outstanding)}
          hint={`${total - lease.paidCount} repayments left`}
        />
        <StatCard
          label={isDriver ? "Paid so far" : "Your share so far"}
          icon={Wallet01Icon}
          value={formatNaira(isDriver ? collected : collected * OWNER_SHARE)}
          hint={
            isDriver
              ? `${lease.paidCount} of ${total} repayments`
              : `${Math.round(OWNER_SHARE * 100)}% of ${formatNaira(collected)} collected`
          }
        />
        <StatCard
          label="Deposit held"
          icon={SecurityCheckIcon}
          value={formatNaira(lease.deposit)}
          hint="Refundable at the end"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Repayment schedule</CardTitle>
            <CardDescription>
              {formatNaira(lease.vehicle.pricing[lease.schedule])} every{" "}
              {SCHEDULE_UNIT[lease.schedule]} for {lease.termMonths} months.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Progress value={pct} aria-label="Repayment progress">
              <div className="flex w-full justify-between text-sm">
                <span className="text-muted-foreground">
                  {lease.paidCount} of {total} paid
                </span>
                <span className="font-medium tabular-nums">{pct}%</span>
              </div>
            </Progress>
            {/* Full card width on phones so all four columns fit. */}
            <div className="-mx-4 max-h-[480px] overflow-auto border-y sm:mx-0 sm:rounded-lg sm:border">
              <Table className="[&_td]:px-2 [&_td:nth-child(2)]:pl-4 [&_td:last-child]:pr-4 [&_th]:px-2 [&_th:nth-child(2)]:pl-4 [&_th:last-child]:pr-4 sm:[&_td]:px-3 sm:[&_th]:px-3">
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="hidden w-12 sm:table-cell">
                      #
                    </TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Amount
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lease.repayments.map((r) => (
                    <TableRow
                      key={r.id}
                      data-state={
                        r.id === lease.next?.id ? "selected" : undefined
                      }
                    >
                      <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                        {r.index + 1}
                      </TableCell>
                      <TableCell>{formatDate(r.dueDate)}</TableCell>
                      <TableCell className="hidden tabular-nums sm:table-cell">
                        {formatNaira(r.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {r.status === "paid" ? (
                          <>
                            {r.method && (
                              <span className="hidden sm:inline">
                                {PAYMENT_METHOD_LABEL[r.method]} ·{" "}
                              </span>
                            )}
                            <span className="hidden font-mono sm:inline">
                              {r.reference}
                            </span>
                          </>
                        ) : r.id === lease.next?.id && canPay ? (
                          <Button size="xs" onClick={() => setPaying(r)}>
                            Pay now
                          </Button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit overflow-hidden pt-0">
          <VehiclePhoto
            vehicle={lease.vehicle}
            sizes="(min-width: 1024px) 30vw, 100vw"
            className="aspect-[16/10]"
            priority
          />
          <CardHeader>
            <CardTitle>
              {lease.vehicle.year} {vehicleName}
            </CardTitle>
            <CardDescription>
              {lease.vehicle.plate} · {lease.vehicle.colour} ·{" "}
              {lease.vehicle.city}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ButtonLink
              variant="outline"
              className="w-full"
              href={`/vehicles/${lease.vehicle.id}`}
            >
              View listing
            </ButtonLink>
          </CardContent>
        </Card>
      </div>

      {paying && (
        <CheckoutDialog
          open
          onOpenChange={(o) => !o && setPaying(null)}
          leaseId={lease.id}
          repayment={paying}
          vehicleName={vehicleName}
        />
      )}
    </>
  );
}

type ReturnState =
  | { state: "checking" }
  | { state: "done"; result: PaymentStatus }
  | { state: "error"; error: string };

/**
 * Paystack sends the driver back to `/dashboard/leases/<id>?reference=…`.
 * Confirm the payment once, then drop the reference from the URL.
 */
function usePaymentReturn(): ReturnState | null {
  const params = useSearchParams();
  const router = useRouter();
  const reference = params.get("reference");
  const [state, setState] = useState<ReturnState | null>(null);
  const started = useRef<string | null>(null);

  useEffect(() => {
    if (!reference || started.current === reference) return;
    started.current = reference;
    setState({ state: "checking" });
    void confirmPayment(reference).then((res) => {
      setState(
        res.ok
          ? { state: "done", result: res.data }
          : { state: "error", error: res.error },
      );
      router.replace(window.location.pathname, { scroll: false });
    });
  }, [reference, router]);

  return state;
}

function PaymentReturnAlert({ result }: { result: ReturnState }) {
  if (result.state === "checking")
    return (
      <Alert>
        <AlertTitle>Confirming your payment</AlertTitle>
        <AlertDescription>This takes a few seconds.</AlertDescription>
      </Alert>
    );
  if (result.state === "error")
    return (
      <Alert variant="destructive">
        <AlertTitle>We couldn&apos;t confirm this payment</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  const r = result.result;
  if (r.status === "success")
    return (
      <Alert>
        <AlertTitle>Payment successful</AlertTitle>
        <AlertDescription>
          {formatNaira(r.amount)} received. Reference{" "}
          <span className="font-mono">{r.reference}</span>.
        </AlertDescription>
      </Alert>
    );
  if (r.status === "pending")
    return (
      <Alert>
        <AlertTitle>Payment processing</AlertTitle>
        <AlertDescription>
          Bank transfers and USSD can take a few minutes. This page updates when
          it arrives.
        </AlertDescription>
      </Alert>
    );
  return (
    <Alert variant="destructive">
      <AlertTitle>Payment not completed</AlertTitle>
      <AlertDescription>
        Nothing was charged. Try again when you&apos;re ready.
      </AlertDescription>
    </Alert>
  );
}
