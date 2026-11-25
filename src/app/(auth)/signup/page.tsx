"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { type Role, signUp } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    // CTAs like "List your car" link here with ?role=owner. Read it on submit
    // so the page stays statically renderable.
    const hint = new URLSearchParams(window.location.search).get("role");
    const role: Role | undefined =
      hint === "owner" || hint === "driver" ? hint : undefined;

    const payload = {
      firstName: String(form.get("firstName")).trim(),
      lastName: String(form.get("lastName")).trim(),
      email: String(form.get("email")).trim().toLowerCase(),
      role,
    };

    const res = await signUp({
      ...payload,
      password: String(form.get("password")),
    });

    if (!res.ok) {
      setError(res.error);
      setSubmitting(false);
      return;
    }

    router.push("/verify-email");
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Takes about two minutes. We&apos;ll verify your email next.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <FieldGroup className="gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="first-name">First name</FieldLabel>
              <Input
                id="first-name"
                name="firstName"
                placeholder="Emeka"
                autoComplete="given-name"
                className="h-11"
                disabled={submitting}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="last-name">Last name</FieldLabel>
              <Input
                id="last-name"
                name="lastName"
                placeholder="Okafor"
                autoComplete="family-name"
                className="h-11"
                disabled={submitting}
                required
              />
            </Field>
          </div>

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
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Create a password"
              autoComplete="new-password"
              minLength={8}
              disabled={submitting}
              required
            />
            <FieldDescription>Use at least 8 characters.</FieldDescription>
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
            {submitting ? "Creating account…" : "Continue"}
          </Button>
        </FieldGroup>
      </form>

      <div className="flex flex-col gap-3 text-sm text-muted-foreground">
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
        <p className="text-xs leading-relaxed">
          By continuing, you agree to RentARide&apos;s{" "}
          <Link
            href="/terms"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
