"use client";

import {
  Add01Icon,
  Car01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { VehiclePhoto } from "@/components/app/vehicle-photo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listMyVehicles,
  type OwnerVehicle,
  setVehicleListed,
} from "@/lib/api/my-vehicles";
import { useQuery } from "@/lib/api/use-query";
import { VEHICLE_TYPE_LABEL } from "@/lib/api/vehicles";
import { formatNaira } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { User, VehicleStatus } from "@/lib/types";
import { ListingDialog } from "./listing-dialog";

type Filter = "all" | "live" | "leased" | "review" | "unlisted";

const MATCH: Record<Filter, (s: VehicleStatus) => boolean> = {
  all: () => true,
  live: (s) => s === "live",
  leased: (s) => s === "leased",
  review: (s) => s === "pending_review" || s === "rejected",
  unlisted: (s) => s === "unlisted",
};

const TAB_LABEL: Record<Filter, string> = {
  all: "All",
  live: "Live",
  leased: "Leased",
  review: "In review",
  unlisted: "Unlisted",
};

export function VehiclesView() {
  const session = useSession();
  if (session.status !== "signed_in") return null;
  return <Vehicles user={session.user} />;
}

function Vehicles({ user }: { user: User }) {
  const q = useQuery(() => listMyVehicles(user), [user.id]);
  const [filter, setFilter] = useState<Filter>("all");
  // Kept after close so the dialog doesn't change mode while animating out.
  const [editing, setEditing] = useState<OwnerVehicle | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const [unlisting, setUnlisting] = useState<OwnerVehicle | null>(null);
  const [unlistOpen, setUnlistOpen] = useState(false);

  if (user.role !== "owner") {
    return (
      <Alert>
        <AlertTitle>Vehicles are for owners</AlertTitle>
        <AlertDescription>
          This page lists the vehicles an owner has on RentARide.
        </AlertDescription>
      </Alert>
    );
  }

  const all = q.status === "success" ? q.data : [];
  const rows = all.filter((v) => MATCH[filter](v.status));
  const count = (f: Filter) => all.filter((v) => MATCH[f](v.status)).length;

  async function relist(v: OwnerVehicle) {
    const res = await setVehicleListed(v.id, true);
    if (!res.ok) toast.error(res.error);
    else toast.success(`${v.make} ${v.model} is live again`);
  }

  return (
    <>
      <PageHeader
        title="Vehicles"
        description="Your listings, their status and what drivers see."
        actions={
          <Button onClick={openAdd}>
            <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
            List a vehicle
          </Button>
        }
      />

      {all.length > 0 && (
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
          className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
        >
          <TabsList>
            {(Object.keys(TAB_LABEL) as Filter[]).map((f) => (
              <TabsTrigger key={f} value={f}>
                {TAB_LABEL[f]}
                {f !== "all" && count(f) > 0 ? ` (${count(f)})` : ""}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {q.status === "loading" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="hidden h-80 rounded-2xl xl:block" />
        </div>
      )}
      {q.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{q.error}</AlertDescription>
        </Alert>
      )}
      {q.status === "success" && rows.length === 0 && (
        <Empty className="rounded-2xl border border-dashed p-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Car01Icon} strokeWidth={1.5} />
            </EmptyMedia>
            <EmptyTitle>
              {all.length === 0
                ? "List your first vehicle"
                : `No ${TAB_LABEL[filter].toLowerCase()} vehicles`}
            </EmptyTitle>
            <EmptyDescription>
              {all.length === 0
                ? "Add your vehicle's details and photos. We review every listing within 24 hours."
                : "Vehicles with this status will show up here."}
            </EmptyDescription>
          </EmptyHeader>
          {all.length === 0 && (
            <EmptyContent>
              <Button onClick={openAdd}>List a vehicle</Button>
            </EmptyContent>
          )}
        </Empty>
      )}
      {rows.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((v) => (
            <li key={v.id}>
              <VehicleTile
                vehicle={v}
                onEdit={() => {
                  setEditing(v);
                  setDialogOpen(true);
                }}
                onUnlist={() => {
                  setUnlisting(v);
                  setUnlistOpen(true);
                }}
                onRelist={() => relist(v)}
              />
            </li>
          ))}
        </ul>
      )}

      <ListingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicle={editing}
        defaultCity={user.city}
      />
      <UnlistDialog
        vehicle={unlisting}
        open={unlistOpen}
        onClose={() => setUnlistOpen(false)}
      />
    </>
  );
}

function VehicleTile({
  vehicle: v,
  onEdit,
  onUnlist,
  onRelist,
}: {
  vehicle: OwnerVehicle;
  onEdit: () => void;
  onUnlist: () => void;
  onRelist: () => void;
}) {
  const name = `${v.year} ${v.make} ${v.model}`;
  const isPublic = v.status === "live" || v.status === "leased";
  const photoCount = 1 + (v.gallery?.length ?? 0);

  return (
    <Card className="h-full gap-0 overflow-hidden pt-0 pb-0">
      <div className="relative">
        <VehiclePhoto
          vehicle={v}
          sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
          className="aspect-[16/10]"
        />
        <StatusBadge
          status={v.status}
          className="absolute top-3 left-3 shadow-sm"
        />
        {photoCount > 1 && (
          <span className="absolute right-3 bottom-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
            {photoCount} photos
          </span>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{name}</h2>
            <p className="text-sm text-muted-foreground">
              {v.plate} · {VEHICLE_TYPE_LABEL[v.type]} · {v.city}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${name}`}
                  className="-mr-2 shrink-0"
                />
              }
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={onEdit}
                  disabled={v.status === "leased"}
                >
                  <HugeiconsIcon icon={PencilEdit02Icon} />
                  Edit listing
                </DropdownMenuItem>
                {isPublic && (
                  <DropdownMenuItem
                    render={<Link href={`/vehicles/${v.id}`} />}
                  >
                    <HugeiconsIcon icon={ViewIcon} />
                    View on marketplace
                  </DropdownMenuItem>
                )}
                {v.status === "live" && (
                  <DropdownMenuItem variant="destructive" onClick={onUnlist}>
                    <HugeiconsIcon icon={ViewOffSlashIcon} />
                    Unlist
                  </DropdownMenuItem>
                )}
                {v.status === "unlisted" && (
                  <DropdownMenuItem onClick={onRelist}>
                    <HugeiconsIcon icon={ViewIcon} />
                    Relist
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {v.status === "rejected" && (
          <Alert variant="destructive" className="py-2.5">
            <AlertDescription>
              {v.reviewNote ?? "Our team needs changes before this goes live."}
            </AlertDescription>
          </Alert>
        )}
        {v.status === "pending_review" && (
          <p className="text-sm text-muted-foreground">
            Under review. Most listings are approved within 24 hours.
          </p>
        )}

        <dl className="mt-auto grid grid-cols-3 gap-2 border-t pt-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Weekly</dt>
            <dd className="font-medium tabular-nums">
              {formatNaira(v.pricing.weekly)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Trips</dt>
            <dd className="font-medium tabular-nums">
              {v.trips > 0 ? v.trips : "None yet"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rating</dt>
            <dd className="font-medium tabular-nums">
              {v.rating > 0 ? v.rating.toFixed(1) : "New"}
            </dd>
          </div>
        </dl>
      </CardContent>
      {(v.pendingRequests > 0 || v.activeLeaseId) && (
        <CardFooter className="border-t bg-muted/40 py-3 text-sm">
          {v.activeLeaseId ? (
            <Link
              href={`/dashboard/leases/${v.activeLeaseId}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              View active lease
            </Link>
          ) : (
            <Link
              href="/dashboard/requests"
              className="font-medium underline-offset-4 hover:underline"
            >
              {v.pendingRequests} request{v.pendingRequests === 1 ? "" : "s"}{" "}
              waiting
            </Link>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

function UnlistDialog({
  vehicle,
  open,
  onClose,
}: {
  vehicle: OwnerVehicle | null;
  open: boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

  async function run() {
    if (!vehicle) return;
    setBusy(true);
    setError(null);
    const res = await setVehicleListed(vehicle.id, false);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success(`${name} unlisted`, {
      description:
        res.data.declined > 0
          ? `${res.data.declined} pending request${res.data.declined === 1 ? " was" : "s were"} declined.`
          : "You can relist it at any time.",
    });
    onClose();
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !busy) {
          setError(null);
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unlist the {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Drivers will no longer find it on the marketplace.
            {vehicle && vehicle.pendingRequests > 0
              ? ` Its ${vehicle.pendingRequests} pending request${vehicle.pendingRequests === 1 ? "" : "s"} will be declined.`
              : ""}{" "}
            You can relist it at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={run}
            disabled={busy}
          >
            {busy && <Spinner data-icon="inline-start" />}
            Unlist vehicle
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
