"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { formatNaira } from "@/lib/format";
import { OWNER_SHARE } from "@/lib/pricing";

/** Weeks in an average month (52 / 12). */
const WEEKS_PER_MONTH = 52 / 12;

/** Owner estimate: weekly price × weeks in a month × owner share. */
export function EarningsCalculator() {
  const [weekly, setWeekly] = useState("45000");
  const value = Number(weekly) || 0;
  const gross = Math.round(value * WEEKS_PER_MONTH);
  const share = Math.round(gross * OWNER_SHARE);
  const fee = gross - share;

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <Field>
          <FieldLabel htmlFor="calc-weekly">Your weekly price</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>₦</InputGroupAddon>
            <InputGroupInput
              id="calc-weekly"
              inputMode="numeric"
              value={weekly}
              onChange={(e) =>
                setWeekly(e.target.value.replace(/\D/g, "").slice(0, 7))
              }
            />
          </InputGroup>
          <FieldDescription>
            Most sedans in Lagos lease for ₦35,000 to ₦60,000 a week.
          </FieldDescription>
        </Field>
        <dl className="flex flex-col gap-3 text-sm" aria-live="polite">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Collected from the driver</dt>
            <dd className="tabular-nums">{formatNaira(gross)} / month</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">
              RentARide fee ({Math.round((1 - OWNER_SHARE) * 100)}%)
            </dt>
            <dd className="tabular-nums">−{formatNaira(fee)}</dd>
          </div>
          <div className="flex justify-between border-t pt-3 text-base font-semibold">
            <dt>Your monthly payout</dt>
            <dd className="tabular-nums">{formatNaira(share)}</dd>
          </div>
        </dl>
        <p className="text-xs text-zinc-500">
          Estimate for a vehicle on an active lease for the whole month. Actual
          payouts depend on the repayments collected.
        </p>
      </CardContent>
    </Card>
  );
}
