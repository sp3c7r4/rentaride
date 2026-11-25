"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTACT_TOPICS,
  type ContactTopic,
  sendContactMessage,
} from "@/lib/api/support";
import { useSession } from "@/lib/session";

const TOPIC_ITEMS = CONTACT_TOPICS.map((t) => ({
  value: t.value,
  label: t.label,
}));

export function ContactForm() {
  const params = useSearchParams();
  const session = useSession();
  const user = session.status === "signed_in" ? session.user : null;
  const initialTopic = CONTACT_TOPICS.some(
    (t) => t.value === params.get("topic"),
  )
    ? (params.get("topic") as ContactTopic)
    : "general";
  const [topic, setTopic] = useState<ContactTopic>(initialTopic);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSending(true);
    setError(null);
    const res = await sendContactMessage({
      name: String(f.get("name")),
      email: String(f.get("email")),
      topic,
      message: String(f.get("message")),
    });
    setSending(false);
    if (!res.ok) return setError(res.error);
    setTicket(res.data.ticket);
  }

  if (ticket) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-6">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            strokeWidth={1.75}
            className="size-8 text-emerald-600"
          />
          <h2 className="text-lg font-semibold">Message sent</h2>
          <p className="text-sm text-zinc-600">
            Your reference is{" "}
            <span className="font-mono font-medium text-zinc-950">
              {ticket}
            </span>
            . We reply to most messages within one working day.
          </p>
          <Button variant="outline" onClick={() => setTicket(null)}>
            Send another message
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FieldGroup className="gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="c-name">Name</FieldLabel>
                <Input
                  id="c-name"
                  name="name"
                  autoComplete="name"
                  // Keyed so the default fills in once the session loads.
                  key={user?.id ?? "anon-name"}
                  defaultValue={
                    user ? `${user.firstName} ${user.lastName}` : undefined
                  }
                  className="h-11"
                  required
                  disabled={sending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="c-email">Email</FieldLabel>
                <Input
                  id="c-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  key={user?.id ?? "anon-email"}
                  defaultValue={user?.email}
                  className="h-11"
                  required
                  disabled={sending}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="c-topic">Topic</FieldLabel>
              <Select
                items={TOPIC_ITEMS}
                value={topic}
                onValueChange={(v) => v && setTopic(v as ContactTopic)}
                disabled={sending}
              >
                <SelectTrigger
                  id="c-topic"
                  className="w-full data-[size=default]:h-11"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {TOPIC_ITEMS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="c-message">Message</FieldLabel>
              <Textarea
                id="c-message"
                name="message"
                rows={6}
                maxLength={2000}
                placeholder={
                  topic === "listing"
                    ? "Paste the listing link and tell us what looks wrong."
                    : "How can we help?"
                }
                required
                disabled={sending}
              />
              <FieldDescription>
                Have a problem with an active lease? Open a dispute from your
                dashboard so the other party can see it.
              </FieldDescription>
            </Field>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
          <Button type="submit" disabled={sending} className="w-fit">
            {sending && <Spinner data-icon="inline-start" />}
            Send message
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
