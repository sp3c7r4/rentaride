"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  PAYMENT_METHOD_LABEL,
  type PaymentMethod,
  quotePayment,
  startCheckout,
} from "@/lib/api/leases";
import { formatDate, formatNaira } from "@/lib/format";
import type { Repayment } from "@/lib/types";

const METHODS: { value: PaymentMethod; hint: string }[] = [
  { value: "card", hint: "Visa, Mastercard or Verve" },
  { value: "transfer", hint: "Pay from any Nigerian bank app" },
  { value: "ussd", hint: "Dial a code from your phone" },
];

type Quote = { repayment: number; deposit: number; total: number };

/**
 * Checkout for the next repayment. Paystack hosts the payment page; the
 * browser comes back to the lease with `?reference=` and the page confirms it.
 */
export function CheckoutDialog({
  open,
  onOpenChange,
  leaseId,
  repayment,
  vehicleName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaseId: string;
  repayment: Repayment;
  vehicleName: string;
}) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settled, setSettled] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void quotePayment(leaseId, repayment.id).then((res) => {
      if (cancelled) return;
      if (res.ok) setQuote(res.data);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [open, leaseId, repayment.id]);

  function handleOpenChange(next: boolean) {
    if (busy) return;
    onOpenChange(next);
    if (!next) {
      setError(null);
      setSettled(null);
    }
  }

  async function pay() {
    setBusy(true);
    setError(null);
    const res = await startCheckout(leaseId, repayment.id, method);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    if (res.data.kind === "redirect") {
      // Keep the spinner while the browser leaves for Paystack.
      window.location.assign(res.data.url);
      return;
    }
    setBusy(false);
    setSettled(res.data.reference);
  }

  const total = quote?.total ?? repayment.amount;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {settled ? (
          <>
            <DialogHeader className="items-start">
              <span className="mb-2 flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={1.75}
                />
              </span>
              <DialogTitle>Payment successful</DialogTitle>
              <DialogDescription>
                {formatNaira(total)} paid for your {vehicleName}. Reference{" "}
                <span className="font-mono">{settled}</span>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Pay {formatNaira(total)}</DialogTitle>
              <DialogDescription>
                Repayment {repayment.index + 1} for your {vehicleName}, due{" "}
                {formatDate(repayment.dueDate)}.
              </DialogDescription>
            </DialogHeader>

            {quote
              ? quote.deposit > 0 && (
                  <dl className="flex flex-col gap-2 rounded-xl bg-muted/50 p-4 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        Repayment {repayment.index + 1}
                      </dt>
                      <dd className="tabular-nums">
                        {formatNaira(quote.repayment)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        Refundable deposit
                      </dt>
                      <dd className="tabular-nums">
                        {formatNaira(quote.deposit)}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-medium">
                      <dt>Total today</dt>
                      <dd className="tabular-nums">
                        {formatNaira(quote.total)}
                      </dd>
                    </div>
                  </dl>
                )
              : !error && <Skeleton className="h-10 rounded-xl" />}

            <RadioGroup
              value={method}
              onValueChange={(v) => setMethod(v as PaymentMethod)}
              aria-label="Payment method"
            >
              {METHODS.map((m) => (
                <FieldLabel key={m.value} htmlFor={`pm-${m.value}`}>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{PAYMENT_METHOD_LABEL[m.value]}</FieldTitle>
                      <FieldDescription>{m.hint}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value={m.value} id={`pm-${m.value}`} />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <p className="text-xs text-muted-foreground">
              You&apos;ll complete the payment on Paystack&apos;s secure page,
              then come back here.
            </p>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button onClick={pay} disabled={busy || !quote}>
                {busy && <Spinner data-icon="inline-start" />}
                {busy ? "Opening Paystack…" : `Pay ${formatNaira(total)}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
