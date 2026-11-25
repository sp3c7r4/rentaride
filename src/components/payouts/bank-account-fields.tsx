"use client";

import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { listBanks } from "@/lib/api/banks";
import { useQuery } from "@/lib/api/use-query";
import { resolveAccountName } from "@/lib/auth";

export const ACCOUNT_LENGTH = 10;

export type Resolution =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; accountName: string }
  | { status: "error"; message: string };

/**
 * Resolve the account holder once a bank and a full account number are set.
 * `initialName` skips the lookup for details that were already verified.
 */
export function useAccountResolution(
  bankCode: string | null,
  accountNumber: string,
  initial?: { bankCode: string; accountNumber: string; accountName: string },
): Resolution {
  const [resolution, setResolution] = useState<Resolution>(
    initial?.accountName
      ? { status: "ok", accountName: initial.accountName }
      : { status: "idle" },
  );

  useEffect(() => {
    if (!bankCode || accountNumber.length !== ACCOUNT_LENGTH) {
      setResolution({ status: "idle" });
      return;
    }
    if (
      initial?.accountName &&
      initial.bankCode === bankCode &&
      initial.accountNumber === accountNumber
    ) {
      setResolution({ status: "ok", accountName: initial.accountName });
      return;
    }

    let cancelled = false;
    setResolution({ status: "loading" });
    resolveAccountName(bankCode, accountNumber)
      .then((res) => {
        if (cancelled) return;
        setResolution(
          res.ok
            ? { status: "ok", accountName: res.accountName }
            : { status: "error", message: res.error },
        );
      })
      .catch(() => {
        if (!cancelled)
          setResolution({
            status: "error",
            message:
              "Verification failed. Check your connection and try again.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [
    bankCode,
    accountNumber,
    initial?.accountName,
    initial?.bankCode,
    initial?.accountNumber,
  ]);

  return resolution;
}

/** Banks from Paystack, as Select items. Shared across forms on a page. */
function useBanks() {
  const q = useQuery(listBanks, []);
  const items = useMemo(
    () =>
      q.status === "success"
        ? q.data.map((b) => ({ value: b.code, label: b.name }))
        : [],
    [q.status, q.data],
  );
  return {
    items,
    loading: q.status === "loading",
    error: q.status === "error" ? q.error : null,
  };
}

/** Bank select, NUBAN input and the account-name lookup result. */
export function BankAccountFields({
  idPrefix = "",
  bankCode,
  onBankCodeChange,
  accountNumber,
  onAccountNumberChange,
  resolution,
  disabled,
}: {
  idPrefix?: string;
  bankCode: string | null;
  onBankCodeChange: (code: string | null) => void;
  accountNumber: string;
  onAccountNumberChange: (value: string) => void;
  resolution: Resolution;
  disabled?: boolean;
}) {
  const banks = useBanks();
  const bankLabel = banks.items.find((b) => b.value === bankCode)?.label ?? "";
  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}bank`}>Bank</FieldLabel>
        <Select
          items={banks.items}
          value={bankCode}
          onValueChange={onBankCodeChange}
          disabled={disabled || banks.loading}
        >
          <SelectTrigger
            id={`${idPrefix}bank`}
            className="w-full data-[size=default]:h-11"
          >
            <SelectValue
              placeholder={
                banks.loading ? "Loading banks…" : "Select your bank"
              }
            />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="max-h-72">
            <SelectGroup>
              {banks.items.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {banks.error && (
          <p role="alert" className="text-sm text-destructive">
            Couldn&apos;t load the bank list. Refresh to try again.
          </p>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}accountNumber`}>
          Account number
        </FieldLabel>
        <Input
          id={`${idPrefix}accountNumber`}
          name="accountNumber"
          inputMode="numeric"
          autoComplete="off"
          maxLength={ACCOUNT_LENGTH}
          placeholder="10 digits"
          value={accountNumber}
          disabled={disabled}
          className="h-11"
          onChange={(e) =>
            onAccountNumberChange(
              e.target.value.replace(/\D/g, "").slice(0, ACCOUNT_LENGTH),
            )
          }
        />
        <FieldDescription>
          Enter your {ACCOUNT_LENGTH}-digit NUBAN account number.
        </FieldDescription>
      </Field>

      <div aria-live="polite">
        {resolution.status === "loading" && (
          <Alert>
            <Spinner />
            <AlertTitle>Verifying account.</AlertTitle>
            <AlertDescription>
              Looking up the account holder at {bankLabel}.
            </AlertDescription>
          </Alert>
        )}
        {resolution.status === "ok" && (
          <Alert>
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              strokeWidth={2}
              className="text-emerald-600"
            />
            <AlertTitle>{resolution.accountName}</AlertTitle>
            <AlertDescription>
              {bankLabel} · {accountNumber}
            </AlertDescription>
          </Alert>
        )}
        {resolution.status === "error" && (
          <Alert variant="destructive">
            <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
            <AlertTitle>Couldn&apos;t verify account</AlertTitle>
            <AlertDescription>{resolution.message}</AlertDescription>
          </Alert>
        )}
      </div>
    </>
  );
}
