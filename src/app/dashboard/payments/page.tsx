"use client";

import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listPayments, PAYMENT_METHOD_LABEL } from "@/lib/api/leases";
import { useQuery } from "@/lib/api/use-query";
import { formatDate, formatNaira } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";

export default function PaymentsPage() {
  const session = useSession();
  if (session.status !== "signed_in") return null;
  return <Payments user={session.user} />;
}

function Payments({ user }: { user: User }) {
  const q = useQuery(() => listPayments(user), [user.id]);
  const total =
    q.status === "success"
      ? q.data.reduce((s, p) => s + p.amount + p.deposit, 0)
      : 0;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every repayment you've made, with its reference."
      />

      {q.status === "loading" && <Skeleton className="h-96 rounded-xl" />}
      {q.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{q.error}</AlertDescription>
        </Alert>
      )}
      {q.status === "success" && q.data.length === 0 && (
        <Empty className="rounded-2xl border border-dashed p-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={CreditCardIcon} strokeWidth={1.5} />
            </EmptyMedia>
            <EmptyTitle>No payments yet</EmptyTitle>
            <EmptyDescription>
              Your repayment history appears here once you start a lease.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {q.status === "success" && q.data.length > 0 && (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 sm:pl-6">Date</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="hidden sm:table-cell">Method</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Reference
                  </TableHead>
                  <TableHead className="pr-4 text-right sm:pr-6">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-4 sm:pl-6">
                      {formatDate(p.paidAt ?? p.dueDate)}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <Link
                        href={`/dashboard/leases/${p.leaseId}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {p.vehicle.year} {p.vehicle.make} {p.vehicle.model}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        Repayment {p.index + 1}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {p.method ? PAYMENT_METHOD_LABEL[p.method] : "Auto-debit"}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                      {p.reference}
                    </TableCell>
                    <TableCell className="pr-4 text-right tabular-nums sm:pr-6">
                      {formatNaira(p.amount + p.deposit)}
                      {p.deposit > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          incl. {formatNaira(p.deposit)} deposit
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="pl-4 font-medium sm:pl-6">
                    Total paid
                  </TableCell>
                  <TableCell className="hidden sm:table-cell" />
                  <TableCell className="hidden md:table-cell" />
                  <TableCell className="pr-4 text-right font-medium tabular-nums sm:pr-6">
                    {formatNaira(total)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
