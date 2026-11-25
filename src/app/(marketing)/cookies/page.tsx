import type { Metadata } from "next";
import {
  LegalPage,
  type LegalSection,
} from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Cookie policy | RentARide",
};

const SECTIONS: LegalSection[] = [
  {
    id: "what",
    title: "What cookies are",
    body: [
      "Cookies and similar browser storage are small pieces of data a website saves on your device. We use them to keep you signed in and to make the site work.",
    ],
  },
  {
    id: "use",
    title: "What we use",
    body: [
      "- Essential: keeps you signed in and remembers steps in progress, such as sign-up. The site doesn't work without these.",
      "- Preferences: remembers choices such as your search filters.",
      "- Analytics: if enabled, helps us understand which pages are used so we can improve them. These are only set with your consent.",
    ],
  },
  {
    id: "control",
    title: "Your choices",
    body: [
      "You can clear or block cookies in your browser settings. Blocking essential cookies will sign you out and stop parts of the site from working.",
    ],
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie policy"
      updated="1 November 2026"
      intro="How RentARide uses cookies and browser storage."
      sections={SECTIONS}
      current="/cookies"
    />
  );
}
