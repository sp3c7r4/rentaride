"use client";

import {
  Attachment01Icon,
  Cancel01Icon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Attachment } from "@/lib/api/disputes";
import { uploadFile } from "@/lib/uploads";
import { cn } from "@/lib/utils";

const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_MB = 10;

/** An uploaded evidence file, ready to attach by key. */
export type PickedFile = Attachment & { key: string };

/** Thumbnail for images, file chip for documents. Opens in a new tab. */
export function AttachmentChip({
  value,
  onRemove,
}: {
  value: Attachment;
  onRemove?: () => void;
}) {
  return (
    <div className="relative flex items-center gap-2 overflow-hidden rounded-lg border bg-card text-sm">
      <a
        href={value.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label={`Open ${value.name}`}
      >
        {value.image ? (
          // biome-ignore lint/performance/noImgElement: access-checked private file
          <img
            src={value.url}
            alt={value.name}
            className="size-16 object-cover"
          />
        ) : (
          <span className="flex items-center gap-2 px-3 py-2">
            <HugeiconsIcon
              icon={File01Icon}
              strokeWidth={1.75}
              className="size-4 text-muted-foreground"
            />
            <span className="max-w-40 truncate">{value.name}</span>
          </span>
        )}
      </a>
      {onRemove && (
        <Button
          type="button"
          variant="secondary"
          size="icon-xs"
          aria-label={`Remove ${value.name}`}
          onClick={onRemove}
          className={cn(
            value.image ? "absolute top-1 right-1 bg-background/90" : "mr-1.5",
          )}
        >
          <HugeiconsIcon icon={Cancel01Icon} />
        </Button>
      )}
    </div>
  );
}

/** "Attach files" button plus chips for what's attached. Files upload as they're picked. */
export function EvidencePicker({
  id,
  value,
  onChange,
  max = 6,
  disabled,
  compact,
}: {
  id: string;
  value: PickedFile[];
  onChange: (v: PickedFile[]) => void;
  max?: number;
  disabled?: boolean;
  /** Icon-only trigger; the parent renders the chips. */
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(files: FileList) {
    const list = [...files];
    const ok = list.filter(
      (f) => TYPES.includes(f.type) && f.size <= MAX_MB * 1024 * 1024,
    );
    const room = max - value.length;
    setError(
      ok.length < list.length
        ? `Use JPG, PNG, WebP or PDF up to ${MAX_MB} MB.`
        : ok.length > room
          ? `You can attach up to ${max} files.`
          : null,
    );
    const accepted = ok.slice(0, room);
    if (accepted.length === 0) return;
    setBusy(true);
    const results = await Promise.allSettled(
      accepted.map((f) => uploadFile(f, "evidence")),
    );
    setBusy(false);
    const uploaded = results.flatMap((r) =>
      r.status === "fulfilled"
        ? [
            {
              key: r.value.key,
              url: r.value.url,
              name: r.value.name,
              image: r.value.contentType.startsWith("image/"),
            },
          ]
        : [],
    );
    const failed = results.find((r) => r.status === "rejected");
    if (failed)
      setError(
        failed.reason instanceof Error
          ? failed.reason.message
          : "Upload failed.",
      );
    onChange([...value, ...uploaded]);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={TYPES.join(",")}
        multiple
        hidden
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files) void add(e.target.files);
          e.target.value = "";
        }}
      />
      {!compact && value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((a) => (
            <AttachmentChip
              key={a.key}
              value={a}
              onRemove={() => onChange(value.filter((x) => x.key !== a.key))}
            />
          ))}
        </div>
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon" : "sm"}
          disabled={disabled || busy || value.length >= max}
          onClick={() => inputRef.current?.click()}
          aria-label={compact ? "Attach files" : undefined}
        >
          {busy ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <HugeiconsIcon icon={Attachment01Icon} data-icon="inline-start" />
          )}
          {!compact && "Attach photos or documents"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
