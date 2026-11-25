"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createLeaseRequest } from "@/lib/api/requests";
import { formatNaira, SCHEDULE_LABEL, SCHEDULE_UNIT } from "@/lib/format";
import { depositFor, leaseTotal, repaymentCount } from "@/lib/pricing";
import { useSession } from "@/lib/session";
import type { Schedule, TermMonths, Vehicle } from "@/lib/types";

const SCHEDULES: Schedule[] = ["daily", "weekly", "monthly"];
const TERMS = [
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months" },
];

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function LeaseRequestPanel({
  vehicle,
  initialSchedule,
}: {
  vehicle: Vehicle;
  initialSchedule: Schedule;
}) {
  const router = useRouter();
  const session = useSession();
  const [schedule, setSchedule] = useState<Schedule>(initialSchedule);
  const [term, setTerm] = useState<TermMonths>(6);
  const [startDate, setStartDate] = useState(() =>
    isoDate(new Date(Date.now() + 2 * 86_400_000)),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = vehicle.pricing[schedule];
  const count = repaymentCount(schedule, term);
  const deposit = depositFor(vehicle.pricing.weekly);
  const total = leaseTotal(vehicle.pricing, schedule, term);
  const available = vehicle.status === "live";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const res = await createLeaseRequest({
      vehicleId: vehicle.id,
      schedule,
      termMonths: term,
      startDate,
      message: String(form.get("message") ?? ""),
    });
    if (!res.ok) {
      setError(res.error);
      setSubmitting(false);
      return;
    }
    router.push(`/dashboard/requests?sent=${res.data.id}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          <span className="tabular-nums">{formatNaira(price)}</span>{" "}
          <span className="text-sm font-normal text-muted-foreground">
            / {SCHEDULE_UNIT[schedule]}
          </span>
        </CardTitle>
        <CardDescription>
          Refundable deposit {formatNaira(deposit)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel id="schedule-label">Repayment schedule</FieldLabel>
              <ToggleGroup
                aria-labelledby="schedule-label"
                variant="outline"
                value={[schedule]}
                onValueChange={(v) => {
                  const picked = v.at(-1);
                  if (picked) setSchedule(picked as Schedule);
                }}
                className="w-full"
              >
                {SCHEDULES.map((s) => (
                  <ToggleGroupItem key={s} value={s} className="h-10 flex-1">
                    {SCHEDULE_LABEL[s]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="term">Lease term</FieldLabel>
                <Select
                  items={TERMS}
                  value={String(term)}
                  onValueChange={(v) => setTerm(Number(v) as TermMonths)}
                >
                  <SelectTrigger id="term" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {TERMS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="start">Start date</FieldLabel>
                <Input
                  id="start"
                  type="date"
                  min={isoDate(new Date())}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10"
                  required
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="message">Message to the owner</FieldLabel>
              <Textarea
                id="message"
                name="message"
                maxLength={500}
                rows={3}
                placeholder="Tell the owner how you'll use the vehicle."
              />
              <FieldDescription>
                Optional. Up to 500 characters.
              </FieldDescription>
            </Field>

            <dl className="flex flex-col gap-2.5 rounded-xl bg-muted/50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {formatNaira(price)} × {count} {SCHEDULE_UNIT[schedule]}
                  {count === 1 ? "" : "s"}
                </dt>
                <dd className="tabular-nums">{formatNaira(total)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Refundable deposit</dt>
                <dd className="tabular-nums">{formatNaira(deposit)}</dd>
              </div>
              <div className="mt-1 flex justify-between gap-4 border-t pt-3.5 font-medium">
                <dt>Due when approved</dt>
                <dd className="tabular-nums">{formatNaira(deposit + price)}</dd>
              </div>
            </dl>
            <p className="-mt-2 text-xs text-muted-foreground">
              Deposit plus your first repayment. Nothing is charged until the
              owner approves.
            </p>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!available ? (
              <Button type="button" size="lg" className="h-11 w-full" disabled>
                Currently leased
              </Button>
            ) : session.status === "signed_out" ? (
              <ButtonLink
                size="lg"
                className="h-11 w-full"
                href={`/login?next=${encodeURIComponent(`/vehicles/${vehicle.id}`)}`}
              >
                Sign in to request
              </ButtonLink>
            ) : session.status === "signed_in" &&
              session.user.role === "owner" ? (
              <Alert>
                <AlertTitle>Owner account</AlertTitle>
                <AlertDescription>
                  Sign in with a driver account to lease this vehicle.
                </AlertDescription>
              </Alert>
            ) : (
              <Button
                type="submit"
                size="lg"
                className="h-11 w-full"
                disabled={submitting || session.status === "loading"}
              >
                {submitting && <Spinner data-icon="inline-start" />}
                {submitting ? "Sending request…" : "Request lease"}
              </Button>
            )}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
