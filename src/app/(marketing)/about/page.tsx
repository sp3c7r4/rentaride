import type { Metadata } from "next";
import { PageHero, Section } from "@/components/marketing/page-hero";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "About | RentARide",
  description:
    "RentARide is a managed car-lease marketplace that connects verified vehicle owners with verified drivers across Nigeria.",
};

const STATS = [
  { value: "3,200+", label: "Verified listings" },
  { value: "9,000+", label: "Active drivers" },
  { value: "45+", label: "Cities" },
];

const PRINCIPLES = [
  {
    title: "Everyone is verified",
    body: "Drivers confirm their identity and licence. Owners confirm ownership and registration. Nobody goes live until our team has checked them.",
  },
  {
    title: "Repayments people can plan around",
    body: "Drivers pick a daily, weekly or monthly schedule that matches how they earn. Owners receive one payout a month on a fixed date.",
  },
  {
    title: "We sit in the middle",
    body: "We collect repayments, hold deposits, pay owners and step in when something goes wrong. Neither side has to chase the other.",
  },
  {
    title: "Fair when things go wrong",
    body: "Every lease has a dispute process with a named case manager, a shared message thread and a decision within two working days.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About RentARide"
        title="A car to earn with, without the upfront cost."
        description="Many people in Nigeria can earn a living driving but can't buy a car outright. Many car owners have a vehicle sitting idle. RentARide connects the two and manages the lease from the first repayment to the last."
      />

      <Section>
        <dl className="grid gap-8 sm:grid-cols-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-1 border-l-2 border-amber-400 pl-5"
            >
              <dt className="text-sm text-zinc-500">{s.label}</dt>
              <dd className="text-3xl font-semibold tracking-tight tabular-nums text-zinc-950">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section className="border-t">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
              How we work
            </h2>
            <p className="text-zinc-600">
              The principles behind every lease on the platform.
            </p>
          </div>
          <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <li key={p.title} className="flex flex-col gap-2">
                <h3 className="font-semibold text-zinc-950">{p.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-600">
                  {p.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section className="border-t bg-zinc-950 text-white">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex max-w-xl flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Ready to get started?
            </h2>
            <p className="text-zinc-400">
              Find a vehicle to lease, or list yours and start earning.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink
              href="/browse"
              size="lg"
              className="bg-white text-zinc-950 hover:bg-zinc-200"
            >
              Browse vehicles
            </ButtonLink>
            <ButtonLink
              href="/signup?role=owner"
              size="lg"
              variant="outline"
              className="border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:text-white"
            >
              List your car
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
