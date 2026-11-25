import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { TrustPoints } from "@/components/auth/trust-points";

export const metadata: Metadata = {
  title: "RentARide",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthShell
      headline="Verified people. Verified vehicles."
      description="Every member completes a short identity check. It keeps owners, drivers and vehicles safe."
      panel={<TrustPoints />}
    >
      {children}
    </AuthShell>
  );
}
