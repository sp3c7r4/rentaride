import type { Metadata } from "next";
import { Faq, type FaqGroup } from "@/components/marketing/faq";
import { PageHero, Section } from "@/components/marketing/page-hero";
import { ButtonLink } from "@/components/ui/button-link";
import { OWNER_SHARE } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Help centre | RentARide",
  description:
    "Answers to common questions about leasing, listing, payments, verification and disputes on RentARide.",
};

const SHARE = `${Math.round(OWNER_SHARE * 100)}%`;

const GROUPS: FaqGroup[] = [
  {
    id: "drivers",
    title: "Leasing a vehicle",
    items: [
      {
        q: "Who can lease a vehicle?",
        a: "Anyone with a valid Nigerian driver's licence who completes verification. You'll need your licence number, its expiry date and a clear photo of the licence.",
      },
      {
        q: "How do I request a vehicle?",
        a: "Open a listing, choose a repayment schedule, a lease term and a start date, then send a request. The owner usually responds within 24 hours. If they approve, your lease starts on the date you chose.",
      },
      {
        q: "Can I have more than one request open?",
        a: "Yes. When one is approved, your other requests stay open until you withdraw them, so withdraw any you no longer need.",
      },
      {
        q: "What happens at the end of a lease?",
        a: "Return the vehicle for inspection. If there's no damage beyond normal wear, your deposit is refunded to the account you paid from.",
      },
    ],
  },
  {
    id: "owners",
    title: "Listing a vehicle",
    items: [
      {
        q: "What do I need to list my car?",
        a: "The vehicle's registration document, at least one clear photo, and a payout account in your name. Each listing is reviewed before it goes live, usually within 24 hours.",
      },
      {
        q: "How much do I earn?",
        a: `You keep ${SHARE} of every repayment collected. You set a weekly price, and the daily and monthly prices are worked out from it. See the pricing page for an estimate.`,
      },
      {
        q: "Can I take my car off the marketplace?",
        a: "Yes. Unlist it from the Vehicles page whenever it isn't on an active lease. Any pending requests for it are declined, and you can relist at any time.",
      },
      {
        q: "Who chooses the driver?",
        a: "You do. You see each driver's verification status and message before approving or declining a request.",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments and payouts",
    items: [
      {
        q: "How do repayments work?",
        a: "Drivers pay on the schedule they chose: daily, weekly or monthly. Repayments are paid in order by card, bank transfer or USSD from the lease page.",
      },
      {
        q: "How much is the deposit?",
        a: "Two weeks of the vehicle's weekly price. RentARide holds it for the length of the lease and refunds it after the return inspection.",
      },
      {
        q: "When are owners paid?",
        a: "On the 5th of each month, for repayments collected in the previous month. Payouts go to the bank account in your settings.",
      },
      {
        q: "What if a driver misses a repayment?",
        a: "We remind the driver and follow up. If a repayment stays overdue, we contact both parties and may end the lease. Owners don't need to chase payment themselves.",
      },
    ],
  },
  {
    id: "verification",
    title: "Verification",
    items: [
      {
        q: "Why do I need to be verified?",
        a: "Verification keeps owners, drivers and vehicles safe. Every member confirms their email, phone and identity before they can lease or list.",
      },
      {
        q: "How long does verification take?",
        a: "Usually a few hours on working days. You'll get a notification as soon as it's done.",
      },
      {
        q: "My licence was renewed. What should I do?",
        a: "Go to Settings, then Verification, and replace your licence. Your account shows 'Verification pending' while we check the new one.",
      },
      {
        q: "Is my data safe?",
        a: "We only use your documents to verify you and to resolve disputes. See the privacy policy for how we store and protect your data.",
      },
    ],
  },
  {
    id: "disputes",
    title: "Disputes",
    items: [
      {
        q: "How do I report a problem with a lease?",
        a: "Open the lease in your dashboard and choose 'Report a problem', or go to Disputes and open one. Add a description and any photos or documents.",
      },
      {
        q: "What happens after I open a dispute?",
        a: "We notify the other party and assign a case manager. Both sides can add messages and evidence. The case manager proposes an outcome within two working days.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <PageHero
        eyebrow="Help centre"
        title="How can we help?"
        description="Answers to the questions drivers and owners ask most."
      />
      <Section className="bg-zinc-50/60">
        <Faq groups={GROUPS} />
      </Section>
      <Section className="border-t">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">
              Still need help?
            </h2>
            <p className="text-zinc-600">
              Our support team replies within one working day.
            </p>
          </div>
          <ButtonLink href="/contact">Contact support</ButtonLink>
        </div>
      </Section>
    </>
  );
}
