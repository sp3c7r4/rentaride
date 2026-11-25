import type { Metadata } from "next";
import { PayoutsView } from "@/components/payouts/payouts-view";

export const metadata: Metadata = { title: "Payouts | RentARide" };

export default function PayoutsPage() {
  return <PayoutsView />;
}
