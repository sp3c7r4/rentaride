"use client";

import { Add01Icon, Delete02Icon, StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type DragEvent, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { uploadFile } from "@/lib/uploads";
import { cn } from "@/lib/utils";

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 8;

/**
 * Multi-photo picker for a listing. The first photo is the cover; any other
 * photo can be promoted. Files upload as soon as they are added.
 */
export function PhotoManager({
  id,
  photos,
  onChange,
  max = 8,
  error,
  disabled,
}: {
  id: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
  error?: string | null;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const message = error ?? localError;
  const remaining = max - photos.length;

  async function add(files: FileList | File[]) {
    const list = [...files];
    const valid = list.filter(
      (f) => PHOTO_TYPES.includes(f.type) && f.size <= MAX_MB * 1024 * 1024,
    );
    const skipped = list.length - valid.length;
    const accepted = valid.slice(0, remaining);
    const over = valid.length - accepted.length;
    setLocalError(
      skipped > 0
        ? `Some files were skipped. Use JPG, PNG or WebP up to ${MAX_MB} MB.`
        : over > 0
          ? `You can add up to ${max} photos.`
          : null,
    );
    if (accepted.length === 0) return;

    setProcessing(accepted.length);
    // Uploaded straight away; the server resizes and strips metadata.
    const results = await Promise.allSettled(
      accepted.map((f) => uploadFile(f, "vehicle_photo")),
    );
    setProcessing(0);
    const ok = results.flatMap((r) =>
      r.status === "fulfilled" ? [r.value.url] : [],
    );
    const failed = results.find((r) => r.status === "rejected");
    if (failed)
      setLocalError(
        failed.reason instanceof Error
          ? failed.reason.message
          : "Some photos couldn't be uploaded. Try again.",
      );
    onChange([...photos, ...ok]);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!disabled) void add(e.dataTransfer.files);
  }

  const makeCover = (i: number) =>
    onChange([photos[i], ...photos.filter((_, j) => j !== i)]);
  const remove = (i: number) => onChange(photos.filter((_, j) => j !== i));

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        multiple
        hidden
        tabIndex={-1}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files) void add(e.target.files);
          e.target.value = "";
        }}
      />
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((src, i) => (
          <li
            // Data URLs are unique per photo; index disambiguates duplicates.
            key={`${i}-${src.slice(-24)}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted"
          >
            {/* biome-ignore lint/performance/noImgElement: data URL or remote preview */}
            <img
              src={src}
              alt={i === 0 ? "Cover" : `Gallery ${i}`}
              className="size-full object-cover"
            />
            {i === 0 && (
              <Badge className="absolute top-1.5 left-1.5 bg-background/90 text-foreground shadow-sm">
                Cover
              </Badge>
            )}
            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              {i > 0 && (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  className="bg-background/90 shadow-sm"
                  aria-label={`Make photo ${i + 1} the cover`}
                  title="Make cover"
                  onClick={() => makeCover(i)}
                  disabled={disabled}
                >
                  <HugeiconsIcon icon={StarIcon} />
                </Button>
              )}
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                className="bg-background/90 shadow-sm"
                aria-label={`Remove photo ${i + 1}`}
                title="Remove"
                onClick={() => remove(i)}
                disabled={disabled}
              >
                <HugeiconsIcon icon={Delete02Icon} />
              </Button>
            </div>
          </li>
        ))}
        {Array.from({ length: processing }, (_, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: transient placeholders
            key={`processing-${i}`}
            className="flex aspect-[4/3] items-center justify-center rounded-lg border bg-muted"
          >
            <Spinner />
          </li>
        ))}
        {remaining > processing && (
          <li>
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                  setDragging(false);
              }}
              onDrop={onDrop}
              aria-describedby={`${id}-hint`}
              className={cn(
                "flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed bg-muted/30 text-muted-foreground outline-none transition-colors",
                "hover:border-ring/50 hover:bg-muted/60 hover:text-foreground",
                "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                dragging && "border-ring bg-muted/60 text-foreground",
                message && "border-destructive/60",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              <HugeiconsIcon icon={Add01Icon} className="size-5" />
              <span className="text-xs font-medium">
                {dragging ? "Drop photos" : "Add photos"}
              </span>
            </button>
          </li>
        )}
      </ul>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        Drag and drop or browse. Up to {max} photos, JPG, PNG or WebP. The first
        photo is the cover.
      </p>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
