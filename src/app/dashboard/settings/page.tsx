import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = { title: "Settings | RentARide" };

export default function SettingsPage() {
  // The active tab lives in ?tab=, read with useSearchParams.
  return (
    <Suspense>
      <SettingsView />
    </Suspense>
  );
}
