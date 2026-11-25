"use client";

import {
  BankIcon,
  Calendar03Icon,
  MoneyReceive01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { StatCard, StatCardSkeleton } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPayouts, maskAccount } from "@/lib/api/payouts";
import { useQuery } from "@/lib/api/use-query";
import { formatDate, formatNaira, formatPeriod } from "@/lib/format";
import { OWNER_SHARE } from "@/lib/pricing";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";
import { PayoutAccountDialog } from "./payout-account-dialog";

export function PayoutsView() {
  const session = useSession();
  if (session.status !== "signed_in") return null;
  if (session.user.role !== "owner") {
    return (
      <Alert>
        <AlertTitle>Payouts are for owners</AlertTitle>
        <AlertDescription>
          Your repayment history is on the Payments page.
        </AlertDescription>
      </Alert>
    );
  }
  return <Payouts user={session.user} />;
}

function Payouts({ user }: { user: User }) {
  const q = useQuery(() => getPayouts(user), [user.id]);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <PageHeader
        title="Payouts"
        description={`You receive ${Math.round(OWNER_SHARE * 100)}% of every repayment collected. Each month's earnings are paid on the 5th of the following month.`}
      />

      {q.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{q.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {q.status === "success" ? (
          <>
            <StatCard
              label="Next payout"
              icon={Calendar03Icon}
              value={q.data.next ? formatNaira(q.data.next.amount) : "None"}
              hint={
                q.data.next
                  ? `${formatPeriod(q.data.next.period)} · pays ${formatDate(q.data.next.payDate)}`
                  : "Earnings from repayments appear here"
              }
            />
            <StatCard
              label="Paid to date"
              icon={MoneyReceive01Icon}
              value={formatNaira(q.data.paidToDate)}
              hint={`${q.data.payouts.filter((p) => p.status === "paid").length} payouts sent`}
            />
            <AccountCard
              account={q.data.account}
              onChange={() => setEditing(true)}
            />
          </>
        ) : (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        )}
      </div>

      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Payout history</CardTitle>
          <CardDescription>Scheduled and completed payouts.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {q.status === "loading" && (
            <div className="flex flex-col gap-2 px-6 pb-6">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          )}
          {q.status === "success" && q.data.payouts.length === 0 && (
            <Empty className="border-t p-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={Wallet01Icon} strokeWidth={1.5} />
                </EmptyMedia>
                <EmptyTitle>No payouts yet</EmptyTitle>
                <EmptyDescription>
                  Your first payout is scheduled once a driver makes a repayment
                  on one of your vehicles.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {q.status === "success" && q.data.payouts.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 sm:pl-6">Earnings for</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Pay date
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Reference
                  </TableHead>
                  <TableHead className="pr-4 text-right sm:pr-6">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-4 font-medium sm:pl-6">
                      {formatPeriod(p.period)}
                      <span className="block text-xs font-normal text-muted-foreground sm:hidden">
                        Pays {formatDate(p.payDate)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatDate(p.payDate)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                      {p.reference ?? "—"}
                    </TableCell>
                    <TableCell className="pr-4 text-right tabular-nums sm:pr-6">
                      {formatNaira(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {q.status === "success" && (
        <PayoutAccountDialog
          open={editing}
          onOpenChange={setEditing}
          account={q.data.account}
        />
      )}
    </>
  );
}

function AccountCard({
  account,
  onChange,
}: {
  account: User["payoutAccount"] | null;
  onChange: () => void;
}) {
  return (
    <Card size="sm" className="sm:col-span-2 lg:col-span-1">
      <CardHeader>
        <CardDescription>Payout account</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onChange}>
            {account ? "Change" : "Add account"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {account ? (
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <HugeiconsIcon
                icon={BankIcon}
                strokeWidth={1.75}
                className="size-5"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{account.accountName}</p>
              <p className="truncate text-sm text-muted-foreground">
                {account.bankName} · {maskAccount(account.accountNumber)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add a bank account so we can pay you.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
