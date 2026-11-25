"use client";

import { CheckmarkCircle02Icon, File01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { KycBadge } from "@/components/app/kyc-badge";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { VehiclePhoto } from "@/components/app/vehicle-photo";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DISPUTE_CATEGORY_LABEL,
  type DisputeView,
  listDisputes,
} from "@/lib/api/disputes";
import { maskAccount } from "@/lib/api/payouts";
import {
  decideKyc,
  decideListing,
  getReviewQueues,
  type KycItem,
  type ListingItem,
} from "@/lib/api/review";
import { useQuery } from "@/lib/api/use-query";
import { VEHICLE_TYPE_LABEL } from "@/lib/api/vehicles";
import { formatDate, formatNaira, formatRelative } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { ApiResult, User } from "@/lib/types";

type Queue = "kyc" | "listings" | "disputes";

/** A pending decision: what's being rejected and how to submit it. */
type Rejecting = {
  title: string;
  description: string;
  submit: (reason: string) => Promise<ApiResult>;
};

export function ReviewConsole() {
  const session = useSession();
  // The shell redirects non-staff; don't query until we know who this is.
  if (session.status !== "signed_in" || !session.user.staff) return null;
  return <Console user={session.user} />;
}

function Console({ user }: { user: User }) {
  const q = useQuery(getReviewQueues, []);
  const disputesQ = useQuery(() => listDisputes(user), [user.id]);
  const [queue, setQueue] = useState<Queue>("kyc");
  const [rejecting, setRejecting] = useState<Rejecting | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const kyc = q.status === "success" ? q.data.kyc : [];
  const listings = q.status === "success" ? q.data.listings : [];
  const disputes = disputesQ.status === "success" ? disputesQ.data : [];
  const openDisputes = disputes.filter((d) => d.status !== "resolved");

  function reject(r: Rejecting) {
    setRejecting(r);
    setRejectOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Review queue"
        description="Check members' documents, approve listings and answer disputes. Oldest first."
      />

      <Tabs value={queue} onValueChange={(v) => setQueue(v as Queue)}>
        <TabsList>
          <TabsTrigger value="kyc">Verification ({kyc.length})</TabsTrigger>
          <TabsTrigger value="listings">
            Listings ({listings.length})
          </TabsTrigger>
          <TabsTrigger value="disputes">
            Disputes ({openDisputes.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {q.status === "loading" && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      )}
      {q.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{q.error}</AlertDescription>
        </Alert>
      )}

      {q.status === "success" &&
        (queue === "kyc" ? (
          kyc.length === 0 ? (
            <QueueEmpty label="No members waiting for verification." />
          ) : (
            <ul className="flex flex-col gap-4">
              {kyc.map((m) => (
                <li key={m.id}>
                  <KycCard member={m} onReject={reject} />
                </li>
              ))}
            </ul>
          )
        ) : queue === "listings" ? (
          listings.length === 0 ? (
            <QueueEmpty label="No listings waiting for review." />
          ) : (
            <ul className="flex flex-col gap-4">
              {listings.map((v) => (
                <li key={v.id}>
                  <ListingCard vehicle={v} onReject={reject} />
                </li>
              ))}
            </ul>
          )
        ) : disputesQ.status === "error" ? (
          <Alert variant="destructive">
            <AlertDescription>{disputesQ.error}</AlertDescription>
          </Alert>
        ) : disputes.length === 0 ? (
          <QueueEmpty label="No disputes have been opened." />
        ) : (
          <ul className="flex flex-col gap-4">
            {disputes.map((d) => (
              <li key={d.id}>
                <DisputeCard dispute={d} />
              </li>
            ))}
          </ul>
        ))}

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        rejecting={rejecting}
      />
    </>
  );
}

/** One dispute, with the two parties and where it stands. */
function DisputeCard({ dispute }: { dispute: DisputeView }) {
  const last = dispute.messages[dispute.messages.length - 1];
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/review/disputes/${dispute.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {dispute.subject}
          </Link>
          <StatusBadge status={dispute.status} />
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Detail label="About">
            {DISPUTE_CATEGORY_LABEL[dispute.category]}
          </Detail>
          <Detail label="Vehicle">
            {dispute.vehicle.year} {dispute.vehicle.make}{" "}
            {dispute.vehicle.model}
          </Detail>
          <Detail label="Opened by">
            {dispute.authors[dispute.openedBy] ?? "—"}
          </Detail>
          <Detail label="Opened">{formatDate(dispute.createdAt)}</Detail>
        </dl>
        {last && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {dispute.authors[last.authorId] ?? "Support"}:
            </span>{" "}
            {last.body}
          </p>
        )}
        <ButtonLink
          variant="outline"
          size="sm"
          className="w-fit"
          href={`/review/disputes/${dispute.id}`}
        >
          Open thread
        </ButtonLink>
      </CardContent>
    </Card>
  );
}

function QueueEmpty({ label }: { label: string }) {
  return (
    <Empty className="rounded-2xl border border-dashed bg-background p-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={1.5} />
        </EmptyMedia>
        <EmptyTitle>All clear</EmptyTitle>
        <EmptyDescription>{label}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** Document on file, opened in a new tab (staff can read private files). */
function Doc({ name, href }: { name?: string; href?: string }) {
  if (name && href)
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
      >
        <HugeiconsIcon
          icon={File01Icon}
          className="size-4 text-muted-foreground"
        />
        {name}
      </a>
    );
  return name ? (
    <span className="inline-flex items-center gap-1.5">
      <HugeiconsIcon
        icon={File01Icon}
        className="size-4 text-muted-foreground"
      />
      {name}
    </span>
  ) : (
    <span className="text-muted-foreground">Not uploaded</span>
  );
}

function ApproveButton({
  label,
  run,
  success,
}: {
  label: string;
  run: () => Promise<ApiResult>;
  success: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await run();
        setBusy(false);
        if (res.ok) toast.success(success);
        else toast.error(res.error);
      }}
    >
      {busy && <Spinner data-icon="inline-start" />}
      {label}
    </Button>
  );
}

function KycCard({
  member: m,
  onReject,
}: {
  member: KycItem;
  onReject: (r: Rejecting) => void;
}) {
  const name = `${m.firstName} ${m.lastName}`;
  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{name}</h2>
              <Badge variant="secondary" className="capitalize">
                {m.role ?? "No role"}
              </Badge>
              <KycBadge status="pending" />
            </div>
            <p className="text-sm text-muted-foreground">
              {m.email} · joined {formatRelative(m.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                onReject({
                  title: `Ask ${m.firstName} for changes?`,
                  description:
                    "They'll see your note on their verification page and can resubmit.",
                  submit: (reason) => decideKyc(m.id, false, reason),
                })
              }
            >
              Request changes
            </Button>
            <ApproveButton
              label="Verify member"
              run={() => decideKyc(m.id, true)}
              success={`${name} is verified`}
            />
          </div>
        </div>
        <dl className="grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Phone">{m.phone || "Not given"}</Detail>
          <Detail label="City">{m.city || "Not given"}</Detail>
          {m.role === "driver" && (
            <>
              <Detail label="Licence number">
                <span className="font-mono">
                  {m.licence?.number ?? "Not given"}
                </span>
              </Detail>
              <Detail label="Licence expiry">
                {m.licence?.expiry ? formatDate(m.licence.expiry) : "Not given"}
              </Detail>
              <Detail label="Licence photo">
                <Doc name={m.licence?.fileName} href={m.licenceUrl} />
              </Detail>
            </>
          )}
          {m.role === "owner" && (
            <Detail label="Payout account">
              {m.payoutAccount
                ? `${m.payoutAccount.accountName}, ${m.payoutAccount.bankName} ${maskAccount(m.payoutAccount.accountNumber)}`
                : "Not given"}
            </Detail>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

function ListingCard({
  vehicle: v,
  onReject,
}: {
  vehicle: ListingItem;
  onReject: (r: Rejecting) => void;
}) {
  const name = `${v.year} ${v.make} ${v.model}`;
  const photos = [v.photo, ...(v.gallery ?? [])].filter(Boolean);
  return (
    <Card>
      <CardContent className="grid gap-5 md:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <VehiclePhoto
            vehicle={v}
            sizes="256px"
            className="aspect-[4/3] rounded-lg"
          />
          {photos.length > 1 && (
            <ul className="grid grid-cols-4 gap-1.5" aria-label="More photos">
              {photos.slice(1, 5).map((src, i) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: photo order is stable
                  key={i}
                  className="aspect-square overflow-hidden rounded-md bg-muted"
                >
                  {/* biome-ignore lint/performance/noImgElement: data URLs and remote previews */}
                  <img
                    src={src}
                    alt={`${name}, view ${i + 2}`}
                    className="size-full object-cover"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="font-semibold">{name}</h2>
              <p className="text-sm text-muted-foreground">
                Listed by {v.owner.firstName} {v.owner.lastName} ·{" "}
                {formatRelative(v.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  onReject({
                    title: `Send the ${v.make} ${v.model} back?`,
                    description:
                      "The owner sees your note on the listing and can edit and resubmit it.",
                    submit: (reason) => decideListing(v.id, false, reason),
                  })
                }
              >
                Request changes
              </Button>
              <ApproveButton
                label="Approve listing"
                run={() => decideListing(v.id, true)}
                success={`${v.make} ${v.model} is live`}
              />
            </div>
          </div>
          {v.owner.kycStatus !== "verified" && (
            <Alert>
              <AlertDescription>
                The owner isn&apos;t verified yet. Check their verification
                before approving.
              </AlertDescription>
            </Alert>
          )}
          <dl className="grid gap-4 border-t pt-4 sm:grid-cols-3">
            <Detail label="Plate">
              <span className="font-mono">{v.plate}</span>
            </Detail>
            <Detail label="Type">{VEHICLE_TYPE_LABEL[v.type]}</Detail>
            <Detail label="City">{v.city}</Detail>
            <Detail label="Colour">{v.colour}</Detail>
            <Detail label="Transmission">
              <span className="capitalize">{v.transmission}</span>
            </Detail>
            <Detail label="Mileage">
              {v.mileageKm.toLocaleString("en-NG")} km
            </Detail>
            <Detail label="Weekly price">
              {formatNaira(v.pricing.weekly)}
            </Detail>
            <Detail label="Photos">{photos.length}</Detail>
            <Detail label="Registration">
              <Doc name={v.registrationDoc} href={v.registrationUrl} />
            </Detail>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

function RejectDialog({
  open,
  onOpenChange,
  rejecting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rejecting: Rejecting | null;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!rejecting) return;
    setBusy(true);
    setError(null);
    const res = await rejecting.submit(reason);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success("Sent back with your note");
    setReason("");
    onOpenChange(false);
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        if (!o) setError(null);
        onOpenChange(o);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{rejecting?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {rejecting?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="reject-reason">What needs to change</FieldLabel>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="For example: the licence photo is blurred. Upload a clear photo of the front."
          />
          <FieldDescription>Shared with the member.</FieldDescription>
        </Field>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={submit}
            disabled={busy}
          >
            {busy && <Spinner data-icon="inline-start" />}
            Request changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
