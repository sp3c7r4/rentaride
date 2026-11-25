"use client";

import { type FormEvent, useState } from "react";
import { toast } from "sonner";
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
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { updatePayoutAccount } from "@/lib/api/payouts";
import type { User } from "@/lib/types";
import { BankAccountFields, useAccountResolution } from "./bank-account-fields";

type Account = NonNullable<User["payoutAccount"]>;

export function PayoutAccountDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {account ? "Change payout account" : "Add payout account"}
          </DialogTitle>
          <DialogDescription>
            Payouts are sent to this account. The account name must match the
            name on your RentARide profile.
          </DialogDescription>
        </DialogHeader>
        {/* The popup unmounts when closed, so each open starts fresh. */}
        <AccountForm account={account} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AccountForm({
  account,
  onDone,
}: {
  account: Account | null;
  onDone: () => void;
}) {
  const [bankCode, setBankCode] = useState<string | null>(
    account?.bankCode ?? null,
  );
  const [accountNumber, setAccountNumber] = useState(
    account?.accountNumber ?? "",
  );
  const resolution = useAccountResolution(
    bankCode,
    accountNumber,
    account ?? undefined,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unchanged =
    account?.bankCode === bankCode && account?.accountNumber === accountNumber;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!bankCode || resolution.status !== "ok" || unchanged) return;
    setSaving(true);
    setError(null);
    const res = await updatePayoutAccount(bankCode, accountNumber);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success("Payout account updated", {
      description: "Future payouts will go to the new account.",
    });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-5">
        <BankAccountFields
          idPrefix="payout-"
          bankCode={bankCode}
          onBankCodeChange={setBankCode}
          accountNumber={accountNumber}
          onAccountNumberChange={setAccountNumber}
          resolution={resolution}
          disabled={saving}
        />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving || resolution.status !== "ok" || unchanged}
        >
          {saving && <Spinner data-icon="inline-start" />}
          Save account
        </Button>
      </DialogFooter>
    </form>
  );
}
