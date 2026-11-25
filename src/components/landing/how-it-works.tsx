import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserAdd01Icon,
  DocumentValidationIcon,
  Car01Icon,
  CreditCardIcon,
  ShieldCheckIcon,
  MoneyBag01Icon,
} from "@hugeicons/core-free-icons";
import { ScrollReveal } from "./scroll-reveal";

interface Step {
  icon: IconSvgElement;
  title: string;
  description: string;
}

const driverSteps: Step[] = [
  {
    icon: UserAdd01Icon,
    title: "Sign up",
    description: "Create an account in minutes. No documents required.",
  },
  {
    icon: DocumentValidationIcon,
    title: "Complete KYC once",
    description:
      "Submit your ID, licence, and address. Verified once, valid for every future assignment.",
  },
  {
    icon: Car01Icon,
    title: "Request a car",
    description:
      "Browse listings, pick a vehicle, and propose a repayment frequency: daily, weekly, or monthly.",
  },
  {
    icon: CreditCardIcon,
    title: "Drive and repay",
    description:
      "Pay on schedule. The platform tracks everything; you get a clear statement.",
  },
];

const ownerSteps: Step[] = [
  {
    icon: Car01Icon,
    title: "List your vehicle",
    description: "Add details, photos, and your preferred reimbursement rate.",
  },
  {
    icon: ShieldCheckIcon,
    title: "One-time verification",
    description:
      "Submit ownership documents, insurance, and roadworthiness. Reviewed once.",
  },
  {
    icon: UserAdd01Icon,
    title: "Get matched",
    description:
      "A verified driver requests your car. Accept or decline their proposed frequency.",
  },
  {
    icon: MoneyBag01Icon,
    title: "Receive payouts",
    description:
      "The platform reimburses you on its own schedule. You never chase payments.",
  },
];

function StepRow({ step, index }: { step: Step; index: number }) {
  return (
    <div className="flex items-start gap-4 py-5 border-b border-zinc-100 last:border-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
        <HugeiconsIcon icon={step.icon} className="size-[18px] text-zinc-600" />
      </span>
      <div className="flex flex-col gap-1 pt-0.5 flex-1">
        <span className="text-sm font-semibold text-zinc-900">{step.title}</span>
        <span className="text-sm leading-relaxed text-zinc-500">{step.description}</span>
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-300 pt-0.5 min-w-[20px] text-right">
        {String(index + 1).padStart(2, "0")}
      </span>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 bg-zinc-50 py-20">
      <ScrollReveal><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-base text-zinc-500">
            Two sides, four steps each.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Drivers */}
          <div className="rounded-2xl bg-white p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              For Drivers
            </p>
            {driverSteps.map((step, i) => (
              <StepRow key={step.title} step={step} index={i} />
            ))}
          </div>

          {/* Owners */}
          <div className="rounded-2xl bg-white p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              For Car Owners
            </p>
            {ownerSteps.map((step, i) => (
              <StepRow key={step.title} step={step} index={i} />
            ))}
          </div>
        </div>
      </div>
    </ScrollReveal>
    </section>
  );
}
