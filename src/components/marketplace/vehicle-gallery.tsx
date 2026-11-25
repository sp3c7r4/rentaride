"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Car01Icon,
  ZoomInAreaIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import { type KeyboardEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Vehicle } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Image that handles owner-uploaded data URLs and remote photos. */
function Photo({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (src.startsWith("data:")) {
    return (
      // biome-ignore lint/performance/noImgElement: owner-uploaded data URL
      <img
        src={src}
        alt={alt}
        className={cn("size-full object-cover", className)}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      loading={priority ? "eager" : undefined}
      className={cn("object-cover", className)}
    />
  );
}

/**
 * Cover photo with thumbnails, previous/next controls, arrow-key navigation
 * and a full-screen viewer. Falls back to a single image when there is one.
 */
export function VehicleGallery({
  vehicle,
}: {
  vehicle: Pick<Vehicle, "photo" | "gallery" | "make" | "model" | "year">;
}) {
  const photos = [vehicle.photo, ...(vehicle.gallery ?? [])].filter(Boolean);
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const count = photos.length;
  const multiple = count > 1;

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);
  const altFor = (i: number) => `${name}, photo ${i + 1} of ${count}`;

  function onKeyDown(e: KeyboardEvent) {
    if (!multiple) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  }

  if (count === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <HugeiconsIcon
          icon={Car01Icon}
          strokeWidth={1.25}
          className="size-12"
        />
        <span className="sr-only">{name}: no photos yet</span>
      </div>
    );
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={`${name} photos`}
      className="flex flex-col gap-3"
      onKeyDown={onKeyDown}
    >
      <div className="group relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="absolute inset-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
          aria-label={`Open full-screen viewer, ${altFor(index)}`}
        >
          <Photo
            key={photos[index]}
            src={photos[index]}
            alt={altFor(index)}
            sizes="(min-width: 1024px) 60vw, 100vw"
            priority={index === 0}
            className="animate-in fade-in duration-300"
          />
        </button>

        <span className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
          <HugeiconsIcon icon={ZoomInAreaIcon} className="size-3.5" />
          {multiple ? `${index + 1} / ${count}` : "View"}
        </span>

        {multiple && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Previous photo"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/90 shadow-md hover:bg-white sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Next photo"
              onClick={() => go(1)}
              className="absolute top-1/2 right-3 -translate-y-1/2 bg-white/90 shadow-md hover:bg-white sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} />
            </Button>
          </>
        )}
      </div>

      {multiple && (
        <ul
          className="grid grid-cols-4 gap-3 sm:grid-cols-5"
          aria-label="Choose a photo"
        >
          {photos.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1} of ${count}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted outline-none ring-offset-2 transition focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  i === index
                    ? "ring-2 ring-foreground"
                    : "opacity-70 hover:opacity-100",
                )}
              >
                <Photo src={src} alt="" sizes="160px" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent
          className="max-w-[calc(100vw-2rem)] gap-3 border-0 bg-zinc-950 p-3 text-white sm:max-w-5xl"
          onKeyDown={onKeyDown}
        >
          <DialogTitle className="sr-only">{name} photos</DialogTitle>
          <DialogDescription className="sr-only">
            Use the arrow keys to move between photos.
          </DialogDescription>
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-black">
            <Photo
              key={`viewer-${photos[index]}`}
              src={photos[index]}
              alt={altFor(index)}
              sizes="100vw"
              className="object-contain"
            />
            {multiple && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-lg"
                  aria-label="Previous photo"
                  onClick={() => go(-1)}
                  className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/90 text-zinc-900 hover:bg-white"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-lg"
                  aria-label="Next photo"
                  onClick={() => go(1)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 bg-white/90 text-zinc-900 hover:bg-white"
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} />
                </Button>
              </>
            )}
          </div>
          <p className="text-center text-sm text-zinc-400" aria-live="polite">
            {name} · {index + 1} of {count}
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
