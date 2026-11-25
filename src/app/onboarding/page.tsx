"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BasicStep } from "@/components/onboarding/basic-step";
import { LicenceStep } from "@/components/onboarding/licence-step";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { PayoutStep } from "@/components/onboarding/payout-step";
import { RoleStep } from "@/components/onboarding/role-step";
import { VehicleStep } from "@/components/onboarding/vehicle-step";
import { completeOnboarding, getPendingSignup, type Role } from "@/lib/auth";
import { emptyOnboardingData, getSteps, type OnboardingData } from "@/lib/kyc";
import { refreshSession } from "@/lib/session";

export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [firstName, setFirstName] = useState<string>();
  const [role, setRole] = useState<Role | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<OnboardingData>(emptyOnboardingData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: onboarding requires a signed-in user who has not finished it yet.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await refreshSession();
      if (cancelled) return;
      if (session.status !== "signed_in") {
        router.replace((await getPendingSignup()) ? "/verify-email" : "/login");
        return;
      }
      const user = session.user;
      if (user.staff) {
        router.replace("/review");
        return;
      }
      if (user.onboarded) {
        router.replace("/dashboard");
        return;
      }
      setFirstName(user.firstName);
      // A CTA such as "List your car" already told us the role.
      if (user.role) setRole(user.role);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) return null;

  if (!role) {
    return (
      <OnboardingShell userRole={null} stepIndex={0}>
        <RoleStep
          firstName={firstName}
          onSelect={(r) => {
            setRole(r);
            setStepIndex(0);
          }}
        />
      </OnboardingShell>
    );
  }

  const steps = getSteps(role);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  async function handleNext(patch: Partial<OnboardingData>) {
    if (!role) return;
    const merged = { ...data, ...patch };
    setData(merged);

    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }

    setError(null);
    setSubmitting(true);
    const res = await completeOnboarding(role, merged);
    if (!res.ok) {
      setError(res.error);
      setSubmitting(false);
      return;
    }
    router.replace("/dashboard");
  }

  function handleBack() {
    setError(null);
    if (stepIndex === 0) setRole(null);
    else setStepIndex((i) => i - 1);
  }

  const common = { data, onBack: handleBack, onNext: handleNext };

  return (
    <OnboardingShell userRole={role} stepIndex={stepIndex}>
      {step === "basic" && <BasicStep key={step} {...common} />}
      {step === "licence" && (
        <LicenceStep
          key={step}
          {...common}
          submitting={submitting}
          error={error}
        />
      )}
      {step === "vehicle" && <VehicleStep key={step} {...common} />}
      {step === "payout" && (
        <PayoutStep
          key={step}
          {...common}
          submitting={submitting}
          error={error}
        />
      )}
    </OnboardingShell>
  );
}
