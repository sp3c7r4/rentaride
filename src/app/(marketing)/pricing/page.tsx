import type { Metadata } from "next";
import { EarningsCalculator } from "@/components/marketing/earnings-calculator";
import { PageHero, Section } from "@/components/marketing/page-hero";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNaira } from "@/lib/format";
import {
  depositFor,
  OWNER_SHARE,
  pricingFromWeekly,
  repaymentCount,
} from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing | RentARide",
  description:
    "What drivers pay to lease a vehicle and what owners earn, with no hidden fees.",
};

const EXAMPLE_WEEKLY = 45_000;
const example = pricingFromWeekly(EXAMPLE_WEEKLY);

const ROWS = [
  {
    schedule: "Daily",
    price: example.daily,
    count: repaymentCount("daily", 6),
  },
  {
    schedule: "Weekly",
    price: example.weekly,
    count: repaymentCount("weekly", 6),
  },
  {
    schedule: "Monthly",
    price: example.monthly,
    count: repaymentCount("monthly", 6),
  },
];

const DRIVER_POINTS = [
  "No sign-up or booking fee.",
  `A refundable deposit of two weeks' repayments, held by RentARide and returned after the vehicle is inspected at the end of the lease.`,
  "Lease terms of 3, 6 or 12 months.",
  "Pay by card, bank transfer or USSD. Repayments are made in order.",
];

const OWNER_POINTS = [
  "Free to list. Listings are reviewed within 24 hours.",
  `You keep ${Math.round(OWNER_SHARE * 100)}% of every repayment collected.`,
  "One payout a month, on the 5th, for the previous month's collections.",
  "We collect repayments, hold the deposit and handle disputes.",
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Simple pricing for both sides of the lease."
        description="Owners set a weekly price. Drivers choose how often they pay. RentARide takes one fee from collected repayments, and nothing else."
      />

      <Section id="drivers">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
              For drivers
            </h2>
            <ul className="flex flex-col gap-3 text-zinc-600">
              {DRIVER_POINTS.map((p) => (
                <li key={p} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-400" />
                  {p}
                </li>
              ))}
            </ul>
            <ButtonLink href="/browse" className="w-fit">
              Browse vehicles
            </ButtonLink>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-zinc-950">
              Example: a sedan listed at {formatNaira(EXAMPLE_WEEKLY)} a week,
              6-month lease
            </p>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Schedule</TableHead>
                    <TableHead>Repayment</TableHead>
                    <TableHead className="pr-4 text-right">
                      Repayments
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ROWS.map((r) => (
                    <TableRow key={r.schedule}>
                      <TableCell className="pl-4 font-medium">
                        {r.schedule}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatNaira(r.price)}
                      </TableCell>
                      <TableCell className="pr-4 text-right tabular-nums">
                        {r.count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-zinc-500">
              Deposit: {formatNaira(depositFor(EXAMPLE_WEEKLY))}, refundable.
              Daily and monthly prices are worked out from the owner&apos;s
              weekly price.
            </p>
          </div>
        </div>
      </Section>

      <Section id="owners" className="border-t bg-zinc-50">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
              For owners
            </h2>
            <ul className="flex flex-col gap-3 text-zinc-600">
              {OWNER_POINTS.map((p) => (
                <li key={p} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-400" />
                  {p}
                </li>
              ))}
            </ul>
            <ButtonLink href="/signup?role=owner" className="w-fit">
              List your car
            </ButtonLink>
          </div>
          <EarningsCalculator />
        </div>
      </Section>
    </>
  );
}
