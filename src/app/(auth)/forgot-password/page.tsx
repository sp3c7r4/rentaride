"use client";

import { MailSend01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  maskEmail,
  RESEND_COOLDOWN_SECONDS,
  requestPasswordReset,
} from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function send(email: string) {
    setError(null);
    setSubmitting(true);
    const res = await requestPasswordReset(email);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSentTo(email);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    void send(String(form.get("email")).trim().toLowerCase());
  }

  if (sentTo) {
    return (
      <div className="flex w-full max-w-md flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-4">
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <HugeiconsIcon
              icon={MailSend01Icon}
              strokeWidth={1.5}
              className="size-6"
            />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Check your email
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              If an account exists for{" "}
              <span className="font-medium text-foreground">
                {maskEmail(sentTo)}
              </span>
              , we&apos;ve sent a link to reset your password. It expires in one hour.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 w-full"
            disabled={cooldown > 0 || submitting}
            onClick={() => send(sentTo)}
          >
            {submitting && <Spinner data-icon="inline-start" />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
          </Button>
          <ButtonLink
            variant="ghost"
            size="lg"
            className="h-11 w-full"
            href="/login"
          >
            Back to sign in
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Forgot your password?
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Enter the email you signed up with and we&apos;ll send you a link to
          reset it.
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
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </FieldGroup>
      </form>

      <p className="text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
