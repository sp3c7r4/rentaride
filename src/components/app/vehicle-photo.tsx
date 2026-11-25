import { Car01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import type { Vehicle } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Vehicle photo with a neutral placeholder when none was uploaded. */
export function VehiclePhoto({
  vehicle,
  sizes,
  className,
  priority,
}: {
  vehicle: Pick<Vehicle, "photo" | "make" | "model" | "year">;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const alt = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted text-muted-foreground",
        className,
      )}
    >
      {!vehicle.photo ? (
        <div className="flex size-full items-center justify-center">
          <HugeiconsIcon
            icon={Car01Icon}
            strokeWidth={1.25}
            className="size-1/4 max-w-12"
          />
          <span className="sr-only">{alt}</span>
        </div>
      ) : vehicle.photo.startsWith("data:") ? (
        // biome-ignore lint/performance/noImgElement: owner-uploaded data URL
        <img src={vehicle.photo} alt={alt} className="size-full object-cover" />
      ) : (
        <Image
          src={vehicle.photo}
          alt={alt}
          fill
          sizes={sizes}
          loading={priority ? "eager" : undefined}
          className="object-cover"
        />
      )}
    </div>
  );
}
