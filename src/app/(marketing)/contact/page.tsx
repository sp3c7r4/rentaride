import {
  Call02Icon,
  Mail01Icon,
  Message01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactForm } from "@/components/marketing/contact-form";
import { PageHero, Section } from "@/components/marketing/page-hero";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Contact | RentARide",
  description: "Get in touch with the RentARide support team.",
};

// Placeholder contact details until the support lines are confirmed.
const CHANNELS = [
  {
    icon: Mail01Icon,
    label: "Email",
    value: "support@rentaride.ng",
    href: "mailto:support@rentaride.ng",
  },
  {
    icon: Call02Icon,
    label: "Phone",
    value: "+234 201 000 0000",
    href: "tel:+2342010000000",
  },
  {
    icon: Message01Icon,
    label: "Hours",
    value: "Monday to Saturday, 8am to 6pm WAT",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to our team."
        description="Questions about leasing, listing, payments or your account. We reply within one working day."
      />
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <ul className="flex flex-col gap-6">
            {CHANNELS.map((c) => (
              <li key={c.label} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                  <HugeiconsIcon
                    icon={c.icon}
                    strokeWidth={1.75}
                    className="size-5"
                  />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm text-zinc-500">{c.label}</span>
                  {c.href ? (
                    <a
                      href={c.href}
                      className="font-medium text-zinc-950 underline-offset-4 hover:underline"
                    >
                      {c.value}
                    </a>
                  ) : (
                    <span className="font-medium text-zinc-950">{c.value}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {/* The form reads ?topic= with useSearchParams. */}
          <Suspense fallback={<Skeleton className="h-[30rem] rounded-xl" />}>
            <ContactForm />
          </Suspense>
        </div>
      </Section>
    </>
  );
}
