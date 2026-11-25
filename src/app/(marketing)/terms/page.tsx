import type { Metadata } from "next";
import {
  LegalPage,
  type LegalSection,
} from "@/components/marketing/legal-page";
import { OWNER_SHARE } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Terms of service | RentARide",
};

const SECTIONS: LegalSection[] = [
  {
    id: "about",
    title: "About these terms",
    body: [
      "These terms govern your use of RentARide, a marketplace operated by Arthurite Integrated that connects vehicle owners with drivers who lease their vehicles. By creating an account you agree to them.",
    ],
  },
  {
    id: "accounts",
    title: "Accounts and verification",
    body: [
      "You must give accurate information and keep it up to date. We verify every member before they can lease or list a vehicle, and we may suspend accounts that fail verification or break these terms.",
      "- Drivers must hold a valid Nigerian driver's licence for the whole lease.",
      "- Owners must own the vehicle or be authorised to lease it, and keep its registration, insurance and roadworthiness current.",
    ],
  },
  {
    id: "leases",
    title: "Leases",
    body: [
      "A lease starts when an owner approves a driver's request. Its schedule, term, start date and repayment amount are shown before approval and on the lease page.",
      "Drivers must use the vehicle lawfully, keep it in good condition and return it at the end of the term.",
    ],
  },
  {
    id: "payments",
    title: "Repayments, deposits and payouts",
    body: [
      "Drivers pay repayments through RentARide on the agreed schedule and in order. A refundable deposit equal to two weeks of the weekly price is held for the length of the lease.",
      `Owners receive ${Math.round(OWNER_SHARE * 100)}% of repayments collected, paid monthly on the 5th for the previous month. RentARide keeps the rest as its service fee.`,
    ],
  },
  {
    id: "disputes",
    title: "Disputes",
    body: [
      "If something goes wrong on a lease, either party can open a dispute. A case manager reviews the evidence from both sides and proposes an outcome. Deposits may be used to cover damage the case manager finds the driver responsible for.",
    ],
  },
  {
    id: "termination",
    title: "Ending a lease or account",
    body: [
      "We may end a lease early for repeated missed repayments, unsafe or unlawful use of the vehicle, or a serious breach of these terms. You can close your account once you have no active leases or open disputes.",
    ],
  },
  {
    id: "liability",
    title: "Liability",
    body: [
      "RentARide is not a party to the lease itself and does not own the vehicles listed. Nothing in these terms limits liability that can't be limited under Nigerian law.",
    ],
  },
  {
    id: "law",
    title: "Governing law",
    body: [
      "These terms are governed by the laws of the Federal Republic of Nigeria.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated="1 November 2026"
      intro="The rules for using RentARide as a driver or an owner."
      sections={SECTIONS}
      current="/terms"
    />
  );
}
