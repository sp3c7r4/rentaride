"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { homeFor, safeNext, signIn } from "@/lib/auth";
import {
  DEMO_DRIVER_EMAIL,
  DEMO_OWNER_EMAIL,
  DEMO_REVIEWER_EMAIL,
} from "@/lib/mock/seed";

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const res = await signIn(
      String(form.get("email")).trim().toLowerCase(),
      String(form.get("password")),
    );

    if (!res.ok) {
      setError(res.error);
      setSubmitting(false);
      return;
    }
    // The account exists but the email was never confirmed: a new code was sent.
    if ("verifyEmail" in res) {
      router.push("/verify-email");
      return;
    }
    const next = safeNext(
      new URLSearchParams(window.location.search).get("next"),
    );
    router.push(
      res.user.onboarded && !res.user.staff && next ? next : homeFor(res.user),
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Sign in to manage your bookings, vehicles and payments.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="emeka@example.com"
              autoComplete="email"
              className="h-11"
              disabled={submitting}
              required
            />
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Your password"
              autoComplete="current-password"
              disabled={submitting}
              required
            />
          </Field>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            size="lg"
            className="h-11 w-full"
            disabled={submitting}
          >
            {submitting && <Spinner data-icon="inline-start" />}
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </FieldGroup>
      </form>

      {process.env.NODE_ENV === "development" && (
        <Alert>
          <AlertDescription>
            Demo accounts: {DEMO_DRIVER_EMAIL}, {DEMO_OWNER_EMAIL}, or{" "}
            {DEMO_REVIEWER_EMAIL} for the review console. Password:{" "}
            <code className="font-mono">rentaride-demo</code>
          </AlertDescription>
        </Alert>
      )}

      <p className="text-sm text-muted-foreground">
        New to RentARide?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
