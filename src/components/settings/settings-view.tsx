"use client";

import {
  BankIcon,
  CheckmarkCircle02Icon,
  File01Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { KycBadge } from "@/components/app/kyc-badge";
import { PageHeader } from "@/components/app/page-header";
import { PasswordInput } from "@/components/auth/password-input";
import { PayoutAccountDialog } from "@/components/payouts/payout-account-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  changePassword,
  updateLicence,
  updateProfile,
} from "@/lib/api/account";
import { maskAccount } from "@/lib/api/payouts";
import { formatDate } from "@/lib/format";
import { getKycLevels } from "@/lib/kyc";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";

type Tab = "profile" | "security" | "verification" | "payouts";

export function SettingsView() {
  const session = useSession();
  if (session.status !== "signed_in") return null;
  return <Settings user={session.user} />;
}

function Settings({ user }: { user: User }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isOwner = user.role === "owner";
  const tabs: Tab[] = isOwner
    ? ["profile", "security", "verification", "payouts"]
    : ["profile", "security", "verification"];
  const requested = params.get("tab") as Tab | null;
  const tab: Tab =
    requested && tabs.includes(requested) ? requested : "profile";

  const LABEL: Record<Tab, string> = {
    profile: "Profile",
    security: "Password",
    verification: "Verification",
    payouts: "Payout account",
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your profile, sign-in and verification details."
      />
      <Tabs
        value={tab}
        onValueChange={(v) =>
          router.replace(`${pathname}?tab=${v}`, { scroll: false })
        }
        className="gap-6"
      >
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <TabsList>
            {tabs.map((t) => (
              <TabsTrigger key={t} value={t}>
                {LABEL[t]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="profile">
          <ProfileCard user={user} />
        </TabsContent>
        <TabsContent value="security">
          <PasswordCard />
        </TabsContent>
        <TabsContent value="verification">
          <VerificationCard user={user} />
        </TabsContent>
        {isOwner && (
          <TabsContent value="payouts">
            <PayoutCard user={user} />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}

function ProfileCard({ user }: { user: User }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    const res = await updateProfile({
      firstName: String(f.get("firstName")),
      lastName: String(f.get("lastName")),
      phone: String(f.get("phone")),
      city: String(f.get("city")),
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    toast.success("Profile saved");
  }

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Owners and drivers see your first name and the first letter of your
            last name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="s-first">First name</FieldLabel>
                <Input
                  id="s-first"
                  name="firstName"
                  defaultValue={user.firstName}
                  autoComplete="given-name"
                  className="h-11"
                  required
                  disabled={saving}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="s-last">Last name</FieldLabel>
                <Input
                  id="s-last"
                  name="lastName"
                  defaultValue={user.lastName}
                  autoComplete="family-name"
                  className="h-11"
                  required
                  disabled={saving}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="s-email">Email</FieldLabel>
              <Input
                id="s-email"
                value={user.email}
                readOnly
                className="h-11 bg-muted/50 text-muted-foreground"
              />
              <FieldDescription>
                To change your email, contact support.
              </FieldDescription>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="s-phone">Phone number</FieldLabel>
                <Input
                  id="s-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  defaultValue={user.phone}
                  placeholder="0803 000 0000"
                  className="h-11"
                  required
                  disabled={saving}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="s-city">City</FieldLabel>
                <Input
                  id="s-city"
                  name="city"
                  autoComplete="address-level2"
                  defaultValue={user.city}
                  className="h-11"
                  required
                  disabled={saving}
                />
              </Field>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button type="submit" disabled={saving}>
            {saving && <Spinner data-icon="inline-start" />}
            Save profile
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const next = String(f.get("next"));
    if (next !== String(f.get("confirm"))) {
      setError("The new passwords don't match.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await changePassword(String(f.get("current")), next);
    setSaving(false);
    if (!res.ok) return setError(res.error);
    form.reset();
    toast.success("Password changed", {
      description: "Use your new password next time you sign in.",
    });
  }

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Use at least 8 characters. A passphrase of a few words is easiest to
            remember.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="s-current">Current password</FieldLabel>
              <PasswordInput
                id="s-current"
                name="current"
                autoComplete="current-password"
                required
                disabled={saving}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="s-next">New password</FieldLabel>
              <PasswordInput
                id="s-next"
                name="next"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={saving}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="s-confirm">Confirm new password</FieldLabel>
              <PasswordInput
                id="s-confirm"
                name="confirm"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={saving}
              />
            </Field>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button type="submit" disabled={saving}>
            {saving && <Spinner data-icon="inline-start" />}
            Change password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function VerificationCard({ user }: { user: User }) {
  const levels = user.role ? getKycLevels(user.role) : [];
  const done = (step: string | null) => {
    if (step === null || step === "basic") return true;
    if (step === "licence") return !!user.licence;
    if (step === "payout") return !!user.payoutAccount;
    return true; // vehicle step is optional
  };

  return (
    <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Verification status</CardTitle>
          <CardDescription>
            {user.kycStatus === "verified"
              ? "Your identity is verified."
              : user.kycStatus === "pending"
                ? "We're reviewing your details. This usually takes a few hours."
                : "We need a few more details before you can continue."}
          </CardDescription>
          <CardAction>
            <KycBadge status={user.kycStatus} />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {user.kycStatus === "action_needed" && user.kycNote && (
            <Alert variant="destructive">
              <AlertTitle>What to fix</AlertTitle>
              <AlertDescription>{user.kycNote}</AlertDescription>
            </Alert>
          )}
          <ol className="flex flex-col gap-3">
            {levels.map((l) => (
              <li key={l.level} className="flex items-start gap-3 text-sm">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className={
                    done(l.step)
                      ? "mt-0.5 size-4 shrink-0 text-emerald-600"
                      : "mt-0.5 size-4 shrink-0 text-muted-foreground/40"
                  }
                />
                <span>
                  <span className="font-medium">{l.title}</span>
                  <span className="block text-muted-foreground">
                    {l.step === null ? (
                      <span className="inline-flex items-center gap-1">
                        <HugeiconsIcon icon={Mail01Icon} className="size-3.5" />
                        {user.email}
                      </span>
                    ) : (
                      l.description
                    )}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      {user.role === "driver" && <LicenceCard user={user} />}
    </div>
  );
}

function LicenceCard({ user }: { user: User }) {
  const [editing, setEditing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setFileError("Upload a photo of the new licence.");
      return;
    }
    const f = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    const res = await updateLicence({
      number: String(f.get("number")).trim(),
      expiry: String(f.get("expiry")),
      file,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    toast.success("Licence submitted", {
      description: "Your verification restarts while we check it.",
    });
    setEditing(false);
    setFile(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver&apos;s licence</CardTitle>
        <CardDescription>
          Keep this up to date. An expired licence pauses new lease requests.
        </CardDescription>
        {!editing && (
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              Replace
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {!editing ? (
          user.licence ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Licence number</dt>
                <dd className="font-mono">{user.licence.number}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expires</dt>
                <dd>{formatDate(user.licence.expiry)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Document</dt>
                <dd className="flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={File01Icon}
                    className="size-4 text-muted-foreground"
                  />
                  {user.licence.fileName ?? "Verified at onboarding"}
                </dd>
              </div>
            </dl>
          ) : (
            <Alert>
              <AlertTitle>No licence on file</AlertTitle>
              <AlertDescription>
                Add your licence to start leasing.
              </AlertDescription>
            </Alert>
          )
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="lic-number">Licence number</FieldLabel>
                <Input
                  id="lic-number"
                  name="number"
                  placeholder="ABC12345AA01"
                  autoCapitalize="characters"
                  className="h-11 uppercase"
                  required
                  disabled={saving}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lic-expiry">Expiry date</FieldLabel>
                <Input
                  id="lic-expiry"
                  name="expiry"
                  type="date"
                  min={today}
                  className="h-11"
                  required
                  disabled={saving}
                />
              </Field>
            </div>
            <Field data-invalid={!!fileError || undefined}>
              <FieldLabel htmlFor="lic-file">Licence photo</FieldLabel>
              <FileDropzone
                id="lic-file"
                title="Upload licence"
                mimeTypes={["image/jpeg", "image/png", "application/pdf"]}
                formatsLabel="JPG, PNG or PDF"
                compact
                value={file}
                onChange={(f) => {
                  setFile(f);
                  setFileError(null);
                }}
                error={fileError}
                disabled={saving}
              />
            </Field>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner data-icon="inline-start" />}
                Submit licence
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function PayoutCard({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const account = user.payoutAccount ?? null;
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Payout account</CardTitle>
        <CardDescription>
          Monthly payouts are sent here on the 5th. The account name must match
          your profile.
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            {account ? "Change" : "Add account"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {account ? (
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <HugeiconsIcon
                icon={BankIcon}
                strokeWidth={1.75}
                className="size-5"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{account.accountName}</p>
              <p className="truncate text-sm text-muted-foreground">
                {account.bankName} · {maskAccount(account.accountNumber)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add a bank account so we can pay you.
          </p>
        )}
      </CardContent>
      <PayoutAccountDialog
        open={open}
        onOpenChange={setOpen}
        account={account}
      />
    </Card>
  );
}
