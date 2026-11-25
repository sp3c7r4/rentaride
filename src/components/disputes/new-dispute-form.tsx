"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  createDispute,
  DISPUTE_CATEGORY_LABEL,
  listDisputableLeases,
} from "@/lib/api/disputes";
import { useQuery } from "@/lib/api/use-query";
import { useSession } from "@/lib/session";
import type { DisputeCategory, User } from "@/lib/types";
import { EvidencePicker, type PickedFile } from "./evidence";

const CATEGORIES = (
  Object.entries(DISPUTE_CATEGORY_LABEL) as [DisputeCategory, string][]
).map(([value, label]) => ({ value, label }));

export function NewDisputeForm() {
  const session = useSession();
  if (session.status !== "signed_in") return null;
  return <Form user={session.user} />;
}

function Form({ user }: { user: User }) {
  const router = useRouter();
  const params = useSearchParams();
  const leases = useQuery(() => listDisputableLeases(user), [user.id]);
  const [leaseId, setLeaseId] = useState<string | null>(params.get("lease"));
  const [category, setCategory] = useState<DisputeCategory | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [evidence, setEvidence] = useState<PickedFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const leaseItems =
    leases.status === "success"
      ? leases.data.map((l) => ({ value: l.id, label: l.label }))
      : [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!leaseId) next.lease = "Choose the lease this is about.";
    if (!category) next.category = "Choose what the problem is about.";
    if (subject.trim().length < 5) next.subject = "Add a short subject.";
    if (body.trim().length < 20)
      next.body = "Describe what happened in at least 20 characters.";
    setErrors(next);
    if (Object.keys(next).length > 0 || !leaseId || !category) return;

    setSaving(true);
    setFormError(null);
    const res = await createDispute({
      leaseId,
      category,
      subject,
      body,
      attachments: evidence.map((e) => e.key),
    });
    setSaving(false);
    if (!res.ok) return setFormError(res.error);
    toast.success("Dispute opened", {
      description: "A case manager will review it within 2 working days.",
    });
    router.push(`/dashboard/disputes/${res.data.id}`);
  }

  return (
    <>
      <Link
        href="/dashboard/disputes"
        className="-mb-4 flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        All disputes
      </Link>
      <PageHeader
        title="Open a dispute"
        description="Tell us what happened. Both parties can see the dispute and reply."
      />

      {leases.status === "loading" && <Skeleton className="h-96 rounded-xl" />}
      {leases.status === "success" && leases.data.length === 0 && (
        <Alert>
          <AlertTitle>You don&apos;t have any leases yet</AlertTitle>
          <AlertDescription>
            Disputes are opened on a lease. For anything else, contact support.
          </AlertDescription>
          <div className="mt-3">
            <ButtonLink href="/contact" variant="outline" size="sm">
              Contact support
            </ButtonLink>
          </div>
        </Alert>
      )}
      {leases.status === "success" && leases.data.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <Card>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <FieldGroup className="gap-5">
                  <Field data-invalid={!!errors.lease || undefined}>
                    <FieldLabel htmlFor="d-lease">Lease</FieldLabel>
                    <Select
                      items={leaseItems}
                      value={leaseId}
                      onValueChange={(v) => {
                        setLeaseId(v);
                        setErrors((x) => ({ ...x, lease: "" }));
                      }}
                      disabled={saving}
                    >
                      <SelectTrigger
                        id="d-lease"
                        className="w-full data-[size=default]:h-11"
                        aria-invalid={!!errors.lease}
                      >
                        <SelectValue placeholder="Select a lease" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {leaseItems.map((l) => (
                            <SelectItem key={l.value} value={l.value}>
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {errors.lease && (
                      <p role="alert" className="text-sm text-destructive">
                        {errors.lease}
                      </p>
                    )}
                  </Field>

                  <Field data-invalid={!!errors.category || undefined}>
                    <FieldLabel htmlFor="d-category">Category</FieldLabel>
                    <Select
                      items={CATEGORIES}
                      value={category}
                      onValueChange={(v) => {
                        setCategory(v as DisputeCategory | null);
                        setErrors((x) => ({ ...x, category: "" }));
                      }}
                      disabled={saving}
                    >
                      <SelectTrigger
                        id="d-category"
                        className="w-full data-[size=default]:h-11"
                        aria-invalid={!!errors.category}
                      >
                        <SelectValue placeholder="What is it about?" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {errors.category && (
                      <p role="alert" className="text-sm text-destructive">
                        {errors.category}
                      </p>
                    )}
                  </Field>

                  <Field data-invalid={!!errors.subject || undefined}>
                    <FieldLabel htmlFor="d-subject">Subject</FieldLabel>
                    <Input
                      id="d-subject"
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        setErrors((x) => ({ ...x, subject: "" }));
                      }}
                      maxLength={100}
                      placeholder="For example: Scratch on the rear bumper"
                      className="h-11"
                      aria-invalid={!!errors.subject}
                      disabled={saving}
                    />
                    {errors.subject && (
                      <p role="alert" className="text-sm text-destructive">
                        {errors.subject}
                      </p>
                    )}
                  </Field>

                  <Field data-invalid={!!errors.body || undefined}>
                    <FieldLabel htmlFor="d-body">What happened?</FieldLabel>
                    <Textarea
                      id="d-body"
                      value={body}
                      onChange={(e) => {
                        setBody(e.target.value);
                        setErrors((x) => ({ ...x, body: "" }));
                      }}
                      rows={6}
                      maxLength={2000}
                      placeholder="Include dates, times, where it happened and anything you've already agreed with the other party."
                      aria-invalid={!!errors.body}
                      disabled={saving}
                    />
                    <FieldDescription>
                      {body.trim().length}/2000 characters
                    </FieldDescription>
                    {errors.body && (
                      <p role="alert" className="text-sm text-destructive">
                        {errors.body}
                      </p>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="d-evidence">Evidence</FieldLabel>
                    <FieldDescription>
                      Optional. Photos, receipts or police reports, up to 6
                      files.
                    </FieldDescription>
                    <EvidencePicker
                      id="d-evidence"
                      value={evidence}
                      onChange={setEvidence}
                      disabled={saving}
                    />
                  </Field>

                  {formError && (
                    <Alert variant="destructive">
                      <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                  )}
                </FieldGroup>
                <div className="flex justify-end gap-2">
                  <ButtonLink variant="outline" href="/dashboard/disputes">
                    Cancel
                  </ButtonLink>
                  <Button type="submit" disabled={saving}>
                    {saving && <Spinner data-icon="inline-start" />}
                    Open dispute
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <aside className="flex flex-col gap-4 text-sm text-muted-foreground">
            <div>
              <h2 className="mb-1 font-medium text-foreground">
                What happens next
              </h2>
              <ol className="flex list-decimal flex-col gap-1.5 pl-4">
                <li>We notify the other party and assign a case manager.</li>
                <li>Both sides can add messages and evidence.</li>
                <li>
                  The case manager proposes an outcome within 2 working days.
                </li>
              </ol>
            </div>
            <p>
              In an emergency, such as an accident or theft, call the police
              first, then open a dispute.
            </p>
          </aside>
        </div>
      )}
    </>
  );
}
