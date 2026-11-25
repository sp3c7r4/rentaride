import type { Metadata } from "next";
import {
  LegalPage,
  type LegalSection,
} from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy | RentARide",
};

const SECTIONS: LegalSection[] = [
  {
    id: "collect",
    title: "What we collect",
    body: [
      "- Account details: name, email, phone number and city.",
      "- Verification documents: driver's licence details and photos, vehicle registration documents.",
      "- Payout details for owners: bank, account number and account name.",
      "- Lease activity: requests, repayments, payouts, disputes and messages.",
      "- Technical data: device, browser and usage information needed to run the service.",
    ],
  },
  {
    id: "use",
    title: "How we use it",
    body: [
      "We use your data to verify you, run leases, process repayments and payouts, resolve disputes, prevent fraud and meet our legal obligations. We don't sell personal data.",
    ],
  },
  {
    id: "share",
    title: "Who we share it with",
    body: [
      "The other party to a lease sees your first name, the first letter of your last name, your city and your verification status. We share data with payment and identity-check providers that help us run the service, and with authorities when the law requires it.",
    ],
  },
  {
    id: "keep",
    title: "How long we keep it",
    body: [
      "We keep account and lease records for as long as your account is open and afterwards for as long as the law requires for financial and tax records. Verification documents are deleted when they are no longer needed.",
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    body: [
      "Under the Nigeria Data Protection Act 2023 you can ask to access, correct or delete your personal data, object to some uses of it, and complain to the Nigeria Data Protection Commission. Contact us to make a request.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    body: ["Email privacy@rentaride.ng with any question about this policy."],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="1 November 2026"
      intro="What personal data we collect, why, and the choices you have."
      sections={SECTIONS}
      current="/privacy"
    />
  );
}
