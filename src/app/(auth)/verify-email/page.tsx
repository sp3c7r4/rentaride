"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import {
  getPendingSignup,
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  resendOtp,
  verifyOtp,
} from "@/lib/auth";

const slotClass = "h-12 flex-1 text-lg";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  // Guard: no pending signup (cookie expired or skipped signup).
  useEffect(() => {
    let cancelled = false;
    void getPendingSignup().then((pending) => {
      if (cancelled) return;
      if (!pending) router.replace("/signup");
      else setEmail(pending.maskedEmail);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Resend cooldown countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = useCallback(
    async (value: string) => {
      if (!email || value.length !== OTP_LENGTH || verifying) return;
      setError(null);
      setNotice(null);
      setVerifying(true);
      const res = await verifyOtp(value);
      if (!res.ok) {
        setError(res.error);
        setCode("");
        setVerifying(false);
        return;
      }
      router.replace("/onboarding");
    },
    [email, verifying, router],
  );

  async function handleResend() {
    if (!email || cooldown > 0 || resending) return;
    setError(null);
    setNotice(null);
    setResending(true);
    const res = await resendOtp();
    setResending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCode("");
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setNotice("A new code is on its way.");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(code);
  }

  if (!email) return null;

  return (
    <div className="flex w-full max-w-md flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Check your email
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We sent a {OTP_LENGTH}-digit code to{" "}
          <span className="font-medium text-foreground">{email}</span>. It
          expires in 10 minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field data-invalid={!!error || undefined}>
            <FieldLabel htmlFor="otp" className="sr-only">
              Verification code
            </FieldLabel>
            <InputOTP
              id="otp"
              maxLength={OTP_LENGTH}
              pattern={REGEXP_ONLY_DIGITS}
              value={code}
              onChange={(v) => {
                setCode(v);
                if (error) setError(null);
              }}
              onComplete={submit}
              disabled={verifying}
              autoFocus
              containerClassName="w-full"
            >
              <InputOTPGroup className="flex-1">
                <InputOTPSlot
                  index={0}
                  aria-invalid={!!error}
                  className={slotClass}
                />
                <InputOTPSlot
                  index={1}
                  aria-invalid={!!error}
                  className={slotClass}
                />
                <InputOTPSlot
                  index={2}
                  aria-invalid={!!error}
                  className={slotClass}
                />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup className="flex-1">
                <InputOTPSlot
                  index={3}
                  aria-invalid={!!error}
                  className={slotClass}
                />
                <InputOTPSlot
                  index={4}
                  aria-invalid={!!error}
                  className={slotClass}
                />
                <InputOTPSlot
                  index={5}
                  aria-invalid={!!error}
                  className={slotClass}
                />
              </InputOTPGroup>
            </InputOTP>
          </Field>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!error && notice && (
            <Alert>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            size="lg"
            className="h-11 w-full"
            disabled={verifying || code.length !== OTP_LENGTH}
          >
            {verifying && <Spinner data-icon="inline-start" />}
            {verifying ? "Verifying…" : "Verify email"}
          </Button>
        </FieldGroup>
      </form>

      <div className="flex flex-col items-start gap-1">
        <FieldDescription className="flex items-center gap-1">
          Didn&apos;t get it?
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
          >
            {resending
              ? "Sending…"
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend code"}
          </Button>
        </FieldDescription>
        <FieldDescription>
          Wrong email? <Link href="/signup">Go back</Link>
        </FieldDescription>
      </div>

      {process.env.NODE_ENV === "development" && (
        <p className="text-center text-xs text-muted-foreground">
          Development: the code is in Mailpit at{" "}
          <a
            href="http://localhost:8026"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            localhost:8026
          </a>
        </p>
      )}
    </div>
  );
}
