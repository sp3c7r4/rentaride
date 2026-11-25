"use client";

import {
  ArrowLeft01Icon,
  Calendar03Icon,
  CustomerSupportIcon,
  DashboardSpeed01Icon,
  FuelStationIcon,
  GearsIcon,
  Location01Icon,
  SecurityCheckIcon,
  ShieldCheckIcon,
  StarIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { useQuery } from "@/lib/api/use-query";
import { getVehicle, VEHICLE_TYPE_LABEL } from "@/lib/api/vehicles";
import { formatNaira, SCHEDULE_LABEL, SCHEDULE_UNIT } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Schedule } from "@/lib/types";
import { LeaseRequestPanel } from "./lease-request-panel";
import { VehicleGallery } from "./vehicle-gallery";

const INCLUDED: { icon: IconSvgElement; title: string; body: string }[] = [
  {
    icon: ShieldCheckIcon,
    title: "Verified owner and vehicle",
    body: "Documents and condition checked by our team before listing.",
  },
  {
    icon: SecurityCheckIcon,
    title: "Refundable deposit",
    body: "Held by the platform and returned when the lease ends cleanly.",
  },
  {
    icon: CustomerSupportIcon,
    title: "Managed disputes",
    body: "Damage claims and missed payments handled by our support team.",
  },
];

function parseSchedule(v: string | null): Schedule {
  return v === "daily" || v === "monthly" ? v : "weekly";
}

export function VehicleDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const search = useSearchParams();
  const session = useSession();
  const viewerId = session.status === "signed_in" ? session.user.id : null;
  const q = useQuery(() => getVehicle(id), [id, viewerId]);
  const schedule = parseSchedule(search.get("schedule"));

  if (q.status === "loading") return <VehicleDetailSkeleton />;

  if (q.status === "error" || !q.data) {
    return (
      <Empty className="rounded-2xl border border-dashed p-12">
        <EmptyHeader>
          <EmptyTitle>Vehicle not found</EmptyTitle>
          <EmptyDescription>
            This listing may have been removed or is no longer available.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ButtonLink href="/browse">Browse vehicles</ButtonLink>
        </EmptyContent>
      </Empty>
    );
  }

  const { vehicle, owner } = q.data;
  const specs: { icon: IconSvgElement; label: string; value: string }[] = [
    { icon: Calendar03Icon, label: "Year", value: String(vehicle.year) },
    {
      icon: GearsIcon,
      label: "Transmission",
      value: vehicle.transmission === "automatic" ? "Automatic" : "Manual",
    },
    { icon: UserMultipleIcon, label: "Seats", value: `${vehicle.seats} seats` },
    {
      icon: FuelStationIcon,
      label: "Fuel",
      value: vehicle.fuel.charAt(0).toUpperCase() + vehicle.fuel.slice(1),
    },
    {
      icon: DashboardSpeed01Icon,
      label: "Mileage",
      value: `${vehicle.mileageKm.toLocaleString("en-NG")} km`,
    },
    { icon: Location01Icon, label: "Pickup city", value: vehicle.city },
  ];

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/browse"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        All vehicles
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{VEHICLE_TYPE_LABEL[vehicle.type]}</Badge>
          {vehicle.status === "leased" && (
            <Badge variant="outline">Currently leased</Badge>
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {vehicle.rating > 0 && (
            <span className="flex items-center gap-1">
              <HugeiconsIcon
                icon={StarIcon}
                className="size-4 fill-amber-400 text-amber-400"
              />
              <span className="font-medium text-foreground">
                {vehicle.rating.toFixed(1)}
              </span>
              ({vehicle.trips} leases)
            </span>
          )}
          <span className="flex items-center gap-1">
            <HugeiconsIcon icon={Location01Icon} className="size-4" />
            {vehicle.city}
          </span>
          <span>{vehicle.colour}</span>
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-10">
          <VehicleGallery vehicle={vehicle} />

          <section className="flex flex-col gap-4" aria-labelledby="specs">
            <h2 id="specs" className="text-lg font-semibold">
              Specifications
            </h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {specs.map((s) => (
                // A <dl> group may only hold <dt> and <dd>, so the icon sits
                // inside the term, positioned to the left of both lines.
                <div key={s.label} className="relative min-h-9 pl-12">
                  <dt className="text-xs text-muted-foreground">
                    <span
                      aria-hidden
                      className="absolute top-0 left-0 flex size-9 items-center justify-center rounded-lg bg-muted"
                    >
                      <HugeiconsIcon
                        icon={s.icon}
                        strokeWidth={1.75}
                        className="size-4"
                      />
                    </span>
                    {s.label}
                  </dt>
                  <dd className="text-sm font-medium">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="flex flex-col gap-4" aria-labelledby="pricing">
            <h2 id="pricing" className="text-lg font-semibold">
              Pricing
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["daily", "weekly", "monthly"] as Schedule[]).map((s) => (
                <div
                  key={s}
                  className="flex flex-col gap-1 rounded-xl border p-4 data-[active=true]:border-foreground"
                  data-active={s === schedule}
                >
                  <span className="text-sm text-muted-foreground">
                    {SCHEDULE_LABEL[s]}
                  </span>
                  <span className="text-xl font-semibold tabular-nums">
                    {formatNaira(vehicle.pricing[s])}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    per {SCHEDULE_UNIT[s]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-4" aria-labelledby="included">
            <h2 id="included" className="text-lg font-semibold">
              Included with every lease
            </h2>
            <ul className="grid gap-4 sm:grid-cols-3">
              {INCLUDED.map((i) => (
                <li key={i.title} className="flex flex-col gap-2">
                  <HugeiconsIcon
                    icon={i.icon}
                    strokeWidth={1.75}
                    className="size-5 text-foreground"
                  />
                  <p className="text-sm font-medium">{i.title}</p>
                  <p className="text-sm text-muted-foreground">{i.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <Card size="sm">
            <CardContent className="flex items-center gap-4">
              <Avatar className="size-11">
                <AvatarFallback className="bg-zinc-900 text-sm font-semibold text-white">
                  {owner.firstName.charAt(0)}
                  {owner.lastInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col">
                <p className="text-sm font-semibold">
                  Listed by {owner.firstName} {owner.lastInitial}.
                </p>
                <p className="text-sm text-muted-foreground">
                  Verified owner · {owner.vehicleCount} vehicle
                  {owner.vehicleCount === 1 ? "" : "s"} · member since{" "}
                  {new Date(owner.createdAt).getFullYear()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <LeaseRequestPanel
            key={schedule}
            vehicle={vehicle}
            initialSchedule={schedule}
          />
        </aside>
      </div>
    </div>
  );
}

export function VehicleDetailSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-4 w-24" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="aspect-[16/10] rounded-2xl" />
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    </div>
  );
}
