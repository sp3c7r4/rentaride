import type { Repayment, Schedule, TermMonths } from "@/lib/types";

/** Share of collected repayments paid to the owner. */
export const OWNER_SHARE = 0.8;

/** Deposit is two weeks of the weekly price. */
export const depositFor = (weeklyPrice: number) => weeklyPrice * 2;

/** Daily and monthly prices derived from the owner's weekly price. */
export const pricingFromWeekly = (
  weekly: number,
): Record<Schedule, number> => ({
  daily: Math.round(weekly / 6 / 500) * 500,
  weekly,
  monthly: weekly * 4,
});

const DAY = 24 * 60 * 60 * 1000;

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Number of repayments for a schedule over a term. */
export function repaymentCount(schedule: Schedule, termMonths: TermMonths) {
  if (schedule === "monthly") return termMonths;
  const days = Math.round(
    (addMonths(new Date(2026, 0, 1), termMonths).getTime() -
      new Date(2026, 0, 1).getTime()) /
      DAY,
  );
  return schedule === "weekly" ? Math.ceil(days / 7) : days;
}

/** Total paid over the term, excluding the refundable deposit. */
export const leaseTotal = (
  pricing: Record<Schedule, number>,
  schedule: Schedule,
  termMonths: TermMonths,
) => pricing[schedule] * repaymentCount(schedule, termMonths);

/** Due date of repayment `index` (0-based) for a lease starting on `start`. */
export function dueDateFor(start: Date, schedule: Schedule, index: number) {
  if (schedule === "monthly") return addMonths(start, index);
  const step = schedule === "weekly" ? 7 : 1;
  return new Date(start.getTime() + index * step * DAY);
}

/**
 * Build the repayment schedule. Repayments before `now` are marked paid,
 * the first one on or after `now` is due, the rest are upcoming.
 */
export function buildRepayments(
  start: Date,
  schedule: Schedule,
  termMonths: TermMonths,
  amount: number,
  now = new Date(),
  idPrefix = "rp",
): Repayment[] {
  const count = repaymentCount(schedule, termMonths);
  let dueAssigned = false;
  return Array.from({ length: count }, (_, i) => {
    const due = dueDateFor(start, schedule, i);
    let status: Repayment["status"] = "upcoming";
    let paidAt: string | undefined;
    if (due.getTime() < now.getTime() - DAY) {
      status = "paid";
      paidAt = due.toISOString();
    } else if (!dueAssigned) {
      status = "due";
      dueAssigned = true;
    }
    return {
      id: `${idPrefix}-${i}`,
      index: i,
      dueDate: due.toISOString(),
      amount,
      status,
      paidAt,
      reference: paidAt
        ? `RAR-${idPrefix.slice(-4).toUpperCase()}-${i}`
        : undefined,
    };
  });
}

/** Paid / total, 0 to 1. */
export const leaseProgress = (repayments: Repayment[]) =>
  repayments.length === 0
    ? 0
    : repayments.filter((r) => r.status === "paid").length / repayments.length;

export const outstanding = (repayments: Repayment[]) =>
  repayments
    .filter((r) => r.status !== "paid")
    .reduce((sum, r) => sum + r.amount, 0);

export const nextRepayment = (repayments: Repayment[]) =>
  repayments.find((r) => r.status === "due" || r.status === "overdue") ??
  repayments.find((r) => r.status === "upcoming");
