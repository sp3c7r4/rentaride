import type { Metadata } from "next";
import { ReviewShell } from "@/components/review/review-shell";

export const metadata: Metadata = {
  title: "Review console | RentARide",
  robots: { index: false },
};

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReviewShell>{children}</ReviewShell>;
}
