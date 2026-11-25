"use client";

import { ArrowLeft01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { type FormEvent, use, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  DISPUTE_CATEGORY_LABEL,
  type DisputeView,
  getDispute,
  replyToDispute,
  resolveDispute,
} from "@/lib/api/disputes";
import { useQuery } from "@/lib/api/use-query";
import { formatDate, formatRelative } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AttachmentChip, EvidencePicker, type PickedFile } from "./evidence";

export function DisputeThreadView({
  params,
  variant = "member",
}: {
  params: Promise<{ id: string }>;
  /** Staff open the same thread from the review console, not the dashboard. */
  variant?: "member" | "staff";
}) {
  const { id } = use(params);
  const session = useSession();
  if (session.status !== "signed_in") return null;
  return <Thread id={id} user={session.user} variant={variant} />;
}

function Thread({
  id,
  user,
  variant,
}: {
  id: string;
  user: User;
  variant: "member" | "staff";
}) {
  const staff = variant === "staff";
  const q = useQuery(() => getDispute(id, user), [id, user.id]);

  if (q.status === "loading") {
    return (
      <>
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96 rounded-xl" />
      </>
    );
  }
  if (q.status === "error" || !q.data) {
    return (
      <Empty className="rounded-2xl border border-dashed p-12">
        <EmptyHeader>
          <EmptyTitle>Dispute not found</EmptyTitle>
          <EmptyDescription>
            It may belong to another account, or the link is wrong.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ButtonLink href={staff ? "/review" : "/dashboard/disputes"}>
            Back to disputes
          </ButtonLink>
        </EmptyContent>
      </Empty>
    );
  }

  const d = q.data;
  return (
    <>
      <Link
        href={staff ? "/review" : "/dashboard/disputes"}
        className="-mb-4 flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        {staff ? "Review queue" : "All disputes"}
      </Link>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {d.subject}
            <StatusBadge status={d.status} />
          </span>
        }
        description={`${DISPUTE_CATEGORY_LABEL[d.category]} · ${d.vehicle.year} ${d.vehicle.make} ${d.vehicle.model} · opened ${formatDate(d.createdAt)}`}
        actions={
          <>
            {!staff && (
              <ButtonLink
                variant="outline"
                href={`/dashboard/leases/${d.leaseId}`}
              >
                View lease
              </ButtonLink>
            )}
            {(d.openedBy === user.id || user.staff) &&
              d.status !== "resolved" && <ResolveButton id={d.id} />}
          </>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-6">
          <ol className="flex flex-col gap-5" aria-label="Messages">
            {d.messages.map((m) => (
              <Message key={m.id} dispute={d} message={m} me={user.id} />
            ))}
          </ol>
          {d.status === "resolved" ? (
            <Alert>
              <AlertDescription>
                This dispute is resolved. If the problem comes back, open a new
                dispute.
              </AlertDescription>
            </Alert>
          ) : (
            <ReplyBox id={d.id} />
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Message({
  dispute,
  message: m,
  me,
}: {
  dispute: DisputeView;
  message: DisputeView["messages"][number];
  me: string;
}) {
  const mine = m.authorId === me;
  const support = m.authorId === "support";
  const name = mine ? "You" : (dispute.authors[m.authorId] ?? "Member");
  const fullName = dispute.authors[m.authorId] ?? name;
  const initials = support
    ? "RR"
    : fullName
        .split(" ")
        .map((p) => p.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();

  return (
    <li className={cn("flex gap-3", mine && "flex-row-reverse")}>
      <Avatar className="size-8 shrink-0">
        <AvatarFallback
          className={cn(
            "text-[11px] font-semibold",
            support
              ? "bg-amber-100 text-amber-900"
              : "bg-muted text-foreground",
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "flex max-w-[min(36rem,85%)] flex-col gap-1.5",
          mine && "items-end",
        )}
      >
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{name}</span> ·{" "}
          <time dateTime={m.createdAt}>{formatRelative(m.createdAt)}</time>
        </p>
        {m.body && (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
              mine
                ? "rounded-tr-sm bg-primary text-primary-foreground"
                : support
                  ? "rounded-tl-sm border border-amber-200 bg-amber-50 text-amber-950"
                  : "rounded-tl-sm bg-muted",
            )}
          >
            {m.body}
          </div>
        )}
        {m.attachments && m.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {m.attachments.map((a) => (
              <AttachmentChip key={a.url} value={a} />
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

function ReplyBox({ id }: { id: string }) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await replyToDispute(
      id,
      body,
      files.map((f) => f.key),
    );
    setSending(false);
    if (!res.ok) return setError(res.error);
    setBody("");
    setFiles([]);
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-3 border-t pt-5">
      <label htmlFor="reply" className="sr-only">
        Reply
      </label>
      <Textarea
        id="reply"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Write a reply"
        disabled={sending}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((a) => (
            <AttachmentChip
              key={a.key}
              value={a}
              onRemove={() => setFiles(files.filter((x) => x.key !== a.key))}
            />
          ))}
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-start justify-between gap-2">
        <EvidencePicker
          id="reply-files"
          value={files}
          onChange={setFiles}
          disabled={sending}
          compact
        />
        <Button
          type="submit"
          disabled={sending || (!body.trim() && files.length === 0)}
        >
          {sending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <HugeiconsIcon icon={SentIcon} data-icon="inline-start" />
          )}
          Send
        </Button>
      </div>
    </form>
  );
}

function ResolveButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const res = await resolveDispute(id);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setOpen(false);
    toast.success("Dispute resolved");
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <AlertDialogTrigger render={<Button />}>
        Mark as resolved
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark this dispute as resolved?</AlertDialogTitle>
          <AlertDialogDescription>
            Do this once you and the other party have agreed an outcome. The
            thread closes and no more messages can be added.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={run} disabled={busy}>
            {busy && <Spinner data-icon="inline-start" />}
            Mark as resolved
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
