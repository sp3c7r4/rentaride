"use client";

import { type FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import { StepActions, StepFrame, type StepProps } from "./step-frame";

const today = new Date().toISOString().slice(0, 10);
const LICENCE_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export function LicenceStep({
  data,
  onBack,
  onNext,
  submitting,
  error,
}: StepProps & { submitting: boolean; error: string | null }) {
  const [file, setFile] = useState<File | null>(data.licenceFile ?? null);
  const [fileError, setFileError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setFileError("Upload a photo of your licence to continue.");
      return;
    }
    const form = new FormData(e.currentTarget);
    onNext({
      licenceNumber: String(form.get("licenceNumber")).trim(),
      licenceExpiry: String(form.get("licenceExpiry")),
      licenceFile: file,
    });
  }

  return (
    <StepFrame
      title="Verify your driver's licence"
      description="We check every driver before they can lease a vehicle."
    >
      <form onSubmit={handleSubmit}>
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="licenceNumber">Licence number</FieldLabel>
            <Input
              id="licenceNumber"
              name="licenceNumber"
              placeholder="ABC12345AA01"
              defaultValue={data.licenceNumber}
              autoCapitalize="characters"
              className="h-11"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="licenceExpiry">Expiry date</FieldLabel>
            <Input
              id="licenceExpiry"
              name="licenceExpiry"
              type="date"
              min={today}
              defaultValue={data.licenceExpiry}
              className="h-11"
              required
            />
          </Field>
          <Field data-invalid={!!fileError || undefined}>
            <FieldLabel htmlFor="licenceFile">Licence photo</FieldLabel>
            <FileDropzone
              id="licenceFile"
              title="Upload a photo of your licence"
              mimeTypes={LICENCE_TYPES}
              formatsLabel="JPG, PNG or PDF"
              value={file}
              onChange={(f) => {
                setFile(f);
                setFileError(null);
              }}
              error={fileError}
              disabled={submitting}
            />
          </Field>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <StepActions
            onBack={onBack}
            submitLabel="Finish and find a vehicle"
            loading={submitting}
          />
        </FieldGroup>
      </form>
    </StepFrame>
  );
}
