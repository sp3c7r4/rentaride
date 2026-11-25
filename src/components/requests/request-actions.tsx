"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  approveRequest,
  declineRequest,
  type RequestRow,
  withdrawRequest,
} from "@/lib/api/requests";
import { formatDate, formatNaira, SCHEDULE_UNIT } from "@/lib/format";
import { depositFor, repaymentCount } from "@/lib/pricing";

type Pending = "approve" | "decline" | "withdraw" | null;

/** Confirmation dialogs for approve, decline and withdraw. */
export function RequestActions({
  request,
  mode,
}: {
  request: RequestRow;
  mode: "owner" | "driver";
}) {
  const router = useRouter();
  const [open, setOpen] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const close = () => {
    if (busy) return;
    setOpen(null);
    setError(null);
  };

  // A lease only starts for a verified driver (enforced again on the server).
  const notVerified =
    mode === "owner" && request.driver.kycStatus !== "verified";

  async function run() {
    setBusy(true);
    setError(null);
    if (open === "approve") {
      const res = await approveRequest(request.id);
      setBusy(false);
      if (!res.ok) return setError(res.error);
      setOpen(null);
      router.push(`/dashboard/leases/${res.data.leaseId}`);
      return;
    }
    const res =
      open === "decline"
        ? await declineRequest(request.id, reason)
        : await withdrawRequest(request.id);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setOpen(null);
  }

  const price = request.vehicle.pricing[request.schedule];
  const count = repaymentCount(request.schedule, request.termMonths);
  const vehicleName = `${request.vehicle.make} ${request.vehicle.model}`;

  return (
    <>
      {mode === "owner" ? (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpen("decline")}>
            Decline
          </Button>
          <Button
            onClick={() => setOpen("approve")}
            disabled={notVerified}
            title={
              notVerified
                ? "This driver's licence is still being verified."
                : undefined
            }
          >
            Approve
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setOpen("withdraw")}>
          Withdraw
        </Button>
      )}

      <AlertDialog open={open !== null} onOpenChange={(o) => !o && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {open === "approve"
                ? `Approve ${request.driver.firstName}'s request?`
                : open === "decline"
                  ? `Decline ${request.driver.firstName}'s request?`
                  : "Withdraw this request?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {open === "approve"
                ? `This starts a ${request.termMonths}-month lease of your ${vehicleName} from ${formatDate(request.startDate)}. Other pending requests for this vehicle will be declined.`
                : open === "decline"
                  ? "The driver will be notified. You can include a short reason."
                  : `The owner will no longer see your request for the ${vehicleName}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {open === "approve" && notVerified && (
            <Alert variant="destructive">
              <AlertDescription>
                This driver's licence hasn't been verified yet, so the lease
                can't start. They were told to finish verification.
              </AlertDescription>
            </Alert>
          )}

          {open === "approve" && (
            <dl className="flex flex-col gap-2 rounded-xl bg-muted/50 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Repayments</dt>
                <dd className="tabular-nums">
                  {count} × {formatNaira(price)} /{" "}
                  {SCHEDULE_UNIT[request.schedule]}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Deposit held</dt>
                <dd className="tabular-nums">
                  {formatNaira(depositFor(request.vehicle.pricing.weekly))}
                </dd>
              </div>
            </dl>
          )}

          {open === "decline" && (
            <Field>
              <FieldLabel htmlFor={`reason-${request.id}`}>Reason</FieldLabel>
              <Textarea
                id={`reason-${request.id}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="For example: the dates don't work for me."
              />
              <FieldDescription>
                Optional. Shared with the driver.
              </FieldDescription>
            </Field>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={run}
              disabled={busy}
              variant={open === "approve" ? "default" : "destructive"}
            >
              {busy && <Spinner data-icon="inline-start" />}
              {open === "approve"
                ? "Approve and start lease"
                : open === "decline"
                  ? "Decline request"
                  : "Withdraw request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
