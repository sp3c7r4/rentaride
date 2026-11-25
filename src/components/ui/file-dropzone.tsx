"use client";

import {
  CloudUploadIcon,
  Delete02Icon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "cn";
import {
  type DragEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type FileDropzoneProps = {
  id: string;
  value: File | null | undefined;
  onChange: (file: File | null) => void;
  /** Allowed MIME types, e.g. ["image/jpeg", "application/pdf"]. */
  mimeTypes: string[];
  /** Human readable list of allowed formats, e.g. "JPG, PNG or PDF". */
  formatsLabel: string;
  title: string;
  maxSizeMB?: number;
  disabled?: boolean;
  /** External error (e.g. "required"). Takes priority over internal errors. */
  error?: string | null;
  /** Narrow layout for side-by-side placement. */
  compact?: boolean;
  className?: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Drag-and-drop or click-to-browse file picker with an image preview.
 * Composes shadcn `Empty` and `Button`; shadcn does not ship a dropzone.
 */
export function FileDropzone({
  id,
  value,
  onChange,
  mimeTypes,
  formatsLabel,
  title,
  maxSizeMB = 5,
  disabled,
  error,
  compact,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const message = error ?? localError;
  const describedBy = `${id}-hint`;

  useEffect(() => {
    if (!value || !value.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function accept(file: File | undefined) {
    if (!file) return;
    if (!mimeTypes.includes(file.type)) {
      setLocalError(`Unsupported file type. Use ${formatsLabel}.`);
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setLocalError(`File is too large. Maximum size is ${maxSizeMB} MB.`);
      return;
    }
    setLocalError(null);
    onChange(file);
  }

  const browse = () => {
    if (!disabled) inputRef.current?.click();
  };

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    accept(e.dataTransfer.files[0]);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      browse();
    }
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={mimeTypes.join(",")}
        hidden
        tabIndex={-1}
        disabled={disabled}
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {value ? (
        <div
          className={cn(
            "rounded-xl border bg-card p-3",
            compact ? "flex flex-col gap-3" : "flex items-center gap-3",
          )}
        >
          <div
            className={cn(
              "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground",
              compact ? "h-24 w-full" : "size-14",
            )}
          >
            {preview ? (
              // biome-ignore lint/performance/noImgElement: blob preview URL
              <img src={preview} alt="" className="size-full object-cover" />
            ) : (
              <HugeiconsIcon
                icon={File01Icon}
                strokeWidth={1.5}
                className="size-6"
              />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-sm font-medium">{value.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatSize(value.size)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={compact ? "flex-1" : undefined}
              onClick={browse}
              disabled={disabled}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${value.name}`}
              onClick={() => {
                setLocalError(null);
                onChange(null);
              }}
              disabled={disabled}
            >
              <HugeiconsIcon icon={Delete02Icon} />
            </Button>
          </div>
        </div>
      ) : (
        <Empty
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`${title}. ${formatsLabel}, up to ${maxSizeMB} MB.`}
          aria-describedby={describedBy}
          aria-disabled={disabled}
          onClick={browse}
          onKeyDown={onKeyDown}
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
          className={cn(
            "cursor-pointer rounded-xl border-2 bg-muted/30 outline-none transition-colors",
            compact ? "p-4" : "p-8",
            "hover:border-ring/50 hover:bg-muted/60",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            dragging && "border-ring bg-muted/60",
            message && "border-destructive/60",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={CloudUploadIcon} strokeWidth={1.5} />
            </EmptyMedia>
            <EmptyTitle
              className={cn("font-medium", compact ? "text-xs" : "text-sm")}
            >
              {dragging ? "Drop to upload" : title}
            </EmptyTitle>
            <EmptyDescription
              id={describedBy}
              className={compact ? "text-xs" : undefined}
            >
              Drag and drop, or{" "}
              <span className="font-medium text-foreground underline underline-offset-4">
                browse files
              </span>
              <br />
              {formatsLabel} · up to {maxSizeMB} MB
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
