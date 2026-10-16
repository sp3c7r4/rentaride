import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Separator } from "@/components/ui/separator";
import { ScrollReveal } from "./scroll-reveal";

const points = [
  "Your car is verified once, not re-checked for every driver.",
  "The platform collects repayments; you receive payouts on a fixed schedule.",
  "Damage claims, missed payments, and returns are handled by our support team.",
  "Security deposit held until the lease ends cleanly.",
];

const ledger = [
  { label: "Monthly payout", value: "₦ 120,000" },
  { label: "Lease duration", value: "6 months" },
  { label: "Next payout", value: "1 Nov 2026" },
  { label: "Status", value: "Active" },
];

export function OwnerCta() {
  return (
    <section id="list" className="bg-zinc-950 py-24">
      <ScrollReveal><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-16 lg:grid-cols-2">
          {/* Left */}
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Your idle car earns every month.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-400">
                List your vehicle, pass a one-time verification, and the
                platform handles matching, repayments, and disputes. You receive
                a reimbursement on a predictable schedule.
              </p>
            </div>

            <ul className="flex flex-col gap-3">
              {points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-sm text-zinc-400"
                >
                  <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {point}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3">
              <Link
                href="/signup?role=owner"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-amber-400 text-zinc-950 hover:bg-amber-300 font-semibold gap-2"
                )}
              >
                List your car
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </Link>
              <Link
                href="#how-it-works"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                See how it works
              </Link>
            </div>
          </div>

          {/* Right — illustrative ledger */}
          <div className="rounded-xl bg-zinc-900 overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-800">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Owner earnings, illustrative
              </p>
            </div>
            <div className="divide-y divide-zinc-800">
              {ledger.map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <span className="text-sm text-zinc-500">{label}</span>
                  <span className="text-sm font-semibold text-white tabular-nums">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-600">
                Actual earnings depend on car type, condition, and agreed rates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ScrollReveal>
    </section>
  );
}
