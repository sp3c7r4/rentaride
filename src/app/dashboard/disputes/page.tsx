import type { Metadata } from "next";
import { DisputesView } from "@/components/disputes/disputes-view";

export const metadata: Metadata = { title: "Disputes | RentARide" };

export default function DisputesPage() {
  return <DisputesView />;
}
