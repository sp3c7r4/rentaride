"use client";

import { type FormEvent, useState } from "react";
import {
  BankAccountFields,
  useAccountResolution,
} from "@/components/payouts/bank-account-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldGroup } from "@/components/ui/field";
import { StepActions, StepFrame, type StepProps } from "./step-frame";

export function PayoutStep({
  data,
  onBack,
  onNext,
  submitting,
  error,
}: StepProps & { submitting: boolean; error: string | null }) {
  const [bankCode, setBankCode] = useState<string | null>(
    data.bankCode || null,
  );
  const [accountNumber, setAccountNumber] = useState(data.accountNumber);
  const resolution = useAccountResolution(bankCode, accountNumber, data);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!bankCode || resolution.status !== "ok") return;
    onNext({ bankCode, accountNumber, accountName: resolution.accountName });
  }

  return (
    <StepFrame
      title="Where should we pay you?"
      description="Your monthly reimbursements are sent to this account. The account name is verified automatically."
    >
      <form onSubmit={handleSubmit}>
        <FieldGroup className="gap-5">
          <BankAccountFields
            bankCode={bankCode}
            onBankCodeChange={setBankCode}
            accountNumber={accountNumber}
            onAccountNumberChange={setAccountNumber}
            resolution={resolution}
            disabled={submitting}
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <StepActions
            onBack={onBack}
            submitLabel="Finish and go to dashboard"
            loading={submitting}
            disabled={resolution.status !== "ok"}
          />
        </FieldGroup>
      </form>
    </StepFrame>
  );
}
