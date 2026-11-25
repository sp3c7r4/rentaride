import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ShieldCheckIcon,
  CreditCardIcon,
  CustomerSupportIcon,
  TimeScheduleIcon,
  DocumentValidationIcon,
  LockIcon,
} from "@hugeicons/core-free-icons";
import { ScrollReveal } from "./scroll-reveal";

interface Feature {
  icon: IconSvgElement;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: ShieldCheckIcon,
    title: "One-time verification",
    description:
      "Owners and drivers are verified once at onboarding. The same check covers every future assignment.",
  },
  {
    icon: TimeScheduleIcon,
    title: "Flexible repayment",
    description:
      "Drivers propose daily, weekly, or monthly repayment. Owners approve before any assignment is confirmed.",
  },
  {
    icon: CreditCardIcon,
    title: "Platform-held payments",
    description:
      "The platform collects repayments from drivers and reimburses owners on its own schedule.",
  },
  {
    icon: CustomerSupportIcon,
    title: "Managed disputes",
    description:
      "Damage claims and missed payments are handled by our support team, not left to owners and drivers directly.",
  },
  {
    icon: DocumentValidationIcon,
    title: "Full document trail",
    description:
      "Condition photos at handover and return, repayment history, and signed agreements. All logged.",
  },
  {
    icon: LockIcon,
    title: "Security deposit",
    description:
      "A platform-set deposit is held before handover and released once the lease ends cleanly.",
  },
];

export function Features() {
  return (
    <section id="about" className="scroll-mt-16 bg-white py-20">
      <ScrollReveal><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Built for trust
          </h2>
          <p className="mt-3 max-w-lg text-base text-zinc-500">
            Every feature addresses a real risk in a managed vehicle lease:
            identity fraud, payment defaults, and damage disputes.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon, title, description }) => (
            <div key={title} className="flex flex-col gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100">
                <HugeiconsIcon icon={icon} className="size-[18px] text-zinc-700" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
    </section>
  );
}
