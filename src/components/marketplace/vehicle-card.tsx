import { Location01Icon, StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { VehiclePhoto } from "@/components/app/vehicle-photo";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VEHICLE_TYPE_LABEL } from "@/lib/api/vehicles";
import { formatNaira, SCHEDULE_UNIT } from "@/lib/format";
import type { Schedule, Vehicle } from "@/lib/types";

export function VehicleCard({
  vehicle,
  schedule,
}: {
  vehicle: Vehicle;
  schedule: Schedule;
}) {
  return (
    <Link
      href={`/vehicles/${vehicle.id}?schedule=${schedule}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="relative">
        <VehiclePhoto
          vehicle={vehicle}
          sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="aspect-[4/3] transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <Badge className="absolute top-3 left-3 bg-white/95 text-zinc-900 shadow-sm">
          {VEHICLE_TYPE_LABEL[vehicle.type]}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-snug">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          {vehicle.rating > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-sm">
              <HugeiconsIcon
                icon={StarIcon}
                className="size-3.5 fill-amber-400 text-amber-400"
              />
              <span className="font-medium tabular-nums">
                {vehicle.rating.toFixed(1)}
              </span>
              <span className="text-muted-foreground">({vehicle.trips})</span>
            </span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <HugeiconsIcon icon={Location01Icon} className="size-3.5" />
          {vehicle.city} ·{" "}
          {vehicle.transmission === "automatic" ? "Automatic" : "Manual"} ·{" "}
          {vehicle.seats} seats
        </p>
        <p className="mt-auto pt-1 text-sm">
          <span className="text-lg font-semibold tabular-nums">
            {formatNaira(vehicle.pricing[schedule])}
          </span>{" "}
          <span className="text-muted-foreground">
            / {SCHEDULE_UNIT[schedule]}
          </span>
        </p>
      </div>
    </Link>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-1/3" />
      </div>
    </div>
  );
}
