"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type FormEvent, useState } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { resetPassword } from "@/lib/auth";

export default function ResetPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    const confirm = String(form.get("confirm"));

    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    // The emailed link carries the token. Read it on submit so the page
    // stays statically renderable.
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setError(
        "This reset link is incomplete. Open the link from your email again.",
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await resetPassword(token, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex w-full max-w-md flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-4">
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-emerald-600">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              strokeWidth={1.5}
              className="size-6"
            />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Password updated
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your password has been changed. Sign in with your new password to
              continue.
            </p>
          </div>
        </div>
        <ButtonLink size="lg" className="h-11 w-full" href="/login">
          Continue to sign in
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set a new password
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Choose a strong password you don&apos;t use anywhere else.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="password">New password</FieldLabel>
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

          <Field data-invalid={mismatch || undefined}>
            <FieldLabel htmlFor="confirm">Confirm new password</FieldLabel>
            <PasswordInput
              id="confirm"
              name="confirm"
              placeholder="Repeat your password"
              autoComplete="new-password"
              aria-invalid={mismatch}
              disabled={submitting}
              required
              onChange={() => mismatch && setMismatch(false)}
            />
            {mismatch && (
              <p role="alert" className="text-sm text-destructive">
                The passwords don&apos;t match.
              </p>
            )}
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
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
