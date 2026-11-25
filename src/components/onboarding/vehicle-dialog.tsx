"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { imageToDataUrl } from "@/lib/files";
import { VEHICLE_TYPES, type VehicleDraft } from "@/lib/kyc";
import type { VehicleType } from "@/lib/types";

const MAX_YEAR = new Date().getFullYear() + 1;
const DOC_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const PHOTO_TYPES = ["image/jpeg", "image/png"];

const TRANSMISSIONS = [
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
];

type VehicleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this vehicle. */
  vehicle?: VehicleDraft | null;
  onSave: (vehicle: VehicleDraft) => void;
};

export function VehicleDialog({
  open,
  onOpenChange,
  vehicle,
  onSave,
}: VehicleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {vehicle ? "Edit vehicle" : "Add your vehicle"}
          </DialogTitle>
          <DialogDescription>
            Enter the details exactly as they appear on your vehicle
            registration. Our team reviews every listing before it goes live.
          </DialogDescription>
        </DialogHeader>
        {/* Keyed so each open starts from fresh defaults. */}
        <VehicleForm
          key={vehicle?.id ?? "new"}
          vehicle={vehicle ?? undefined}
          onCancel={() => onOpenChange(false)}
          onSave={(v) => {
            onSave(v);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

type Errors = {
  type?: string;
  transmission?: string;
  registrationDoc?: string;
  photo?: string;
};

function VehicleForm({
  vehicle,
  onCancel,
  onSave,
}: {
  vehicle?: VehicleDraft;
  onCancel: () => void;
  onSave: (v: VehicleDraft) => void;
}) {
  const [transmission, setTransmission] = useState<string | null>(
    vehicle?.transmission ?? null,
  );
  const [registrationDoc, setRegistrationDoc] = useState<File | null>(
    vehicle?.registrationDoc ?? null,
  );
  const [photo, setPhoto] = useState<File | null>(vehicle?.photo ?? null);
  const [vehicleType, setVehicleType] = useState<string | null>(
    vehicle?.type ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Stop the submit from bubbling through the portal to any parent form.
    e.stopPropagation();

    const next: Errors = {};
    if (!vehicleType) next.type = "Select a vehicle type.";
    if (!transmission) next.transmission = "Select a transmission.";
    if (!registrationDoc)
      next.registrationDoc = "Upload your registration document.";
    if (!photo) next.photo = "Upload a photo of the vehicle.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const form = new FormData(e.currentTarget);
    setSaving(true);
    const photoDataUrl =
      photo && photo !== vehicle?.photo
        ? ((await imageToDataUrl(photo)) ?? undefined)
        : vehicle?.photoDataUrl;
    setSaving(false);
    onSave({
      id: vehicle?.id ?? crypto.randomUUID(),
      make: String(form.get("make")).trim(),
      model: String(form.get("model")).trim(),
      year: String(form.get("year")),
      colour: String(form.get("colour")).trim(),
      plate: String(form.get("plate")).trim().toUpperCase(),
      transmission: transmission as VehicleDraft["transmission"],
      type: vehicleType as VehicleType,
      weeklyPrice: Number(form.get("weeklyPrice")),
      photoDataUrl,
      registrationDoc: registrationDoc ?? undefined,
      photo: photo ?? undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          <Field>
            <FieldLabel htmlFor="v-make">Make</FieldLabel>
            <Input
              id="v-make"
              name="make"
              placeholder="Toyota"
              defaultValue={vehicle?.make}
              className="h-11"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="v-model">Model</FieldLabel>
            <Input
              id="v-model"
              name="model"
              placeholder="Corolla"
              defaultValue={vehicle?.model}
              className="h-11"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="v-year">Year</FieldLabel>
            <Input
              id="v-year"
              name="year"
              type="number"
              inputMode="numeric"
              placeholder="2018"
              min={2000}
              max={MAX_YEAR}
              defaultValue={vehicle?.year}
              className="h-11"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="v-colour">Colour</FieldLabel>
            <Input
              id="v-colour"
              name="colour"
              placeholder="Silver"
              defaultValue={vehicle?.colour}
              className="h-11"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="v-plate">Plate number</FieldLabel>
            <Input
              id="v-plate"
              name="plate"
              placeholder="ABC-123DE"
              autoCapitalize="characters"
              defaultValue={vehicle?.plate}
              className="h-11"
              required
            />
          </Field>
          <Field data-invalid={!!errors.transmission || undefined}>
            <FieldLabel htmlFor="v-transmission">Transmission</FieldLabel>
            <Select
              items={TRANSMISSIONS}
              value={transmission}
              onValueChange={(v) => {
                setTransmission(v);
                setErrors((prev) => ({ ...prev, transmission: undefined }));
              }}
            >
              <SelectTrigger
                id="v-transmission"
                className="w-full data-[size=default]:h-11"
                aria-invalid={!!errors.transmission}
              >
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {TRANSMISSIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.transmission && (
              <p role="alert" className="text-sm text-destructive">
                {errors.transmission}
              </p>
            )}
          </Field>
          <Field data-invalid={!!errors.type || undefined}>
            <FieldLabel htmlFor="v-type">Vehicle type</FieldLabel>
            <Select
              items={VEHICLE_TYPES}
              value={vehicleType}
              onValueChange={(v) => {
                setVehicleType(v);
                setErrors((prev) => ({ ...prev, type: undefined }));
              }}
            >
              <SelectTrigger
                id="v-type"
                className="w-full data-[size=default]:h-11"
                aria-invalid={!!errors.type}
              >
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {VEHICLE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.type && (
              <p role="alert" className="text-sm text-destructive">
                {errors.type}
              </p>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="v-price">Weekly price (₦)</FieldLabel>
            <Input
              id="v-price"
              name="weeklyPrice"
              type="number"
              inputMode="numeric"
              min={5000}
              step={500}
              placeholder="45000"
              defaultValue={vehicle?.weeklyPrice || undefined}
              className="h-11"
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 items-start gap-4">
          <Field data-invalid={!!errors.registrationDoc || undefined}>
            <FieldLabel htmlFor="v-reg">Registration document</FieldLabel>
            <FileDropzone
              id="v-reg"
              title="Upload document"
              mimeTypes={DOC_TYPES}
              formatsLabel="JPG, PNG or PDF"
              compact
              value={registrationDoc}
              onChange={(f) => {
                setRegistrationDoc(f);
                setErrors((p) => ({ ...p, registrationDoc: undefined }));
              }}
              error={errors.registrationDoc}
            />
          </Field>

          <Field data-invalid={!!errors.photo || undefined}>
            <FieldLabel htmlFor="v-photo">Vehicle photo</FieldLabel>
            <FileDropzone
              id="v-photo"
              title="Upload photo"
              mimeTypes={PHOTO_TYPES}
              formatsLabel="JPG or PNG"
              compact
              value={photo}
              onChange={(f) => {
                setPhoto(f);
                setErrors((p) => ({ ...p, photo: undefined }));
              }}
              error={errors.photo}
            />
          </Field>
        </div>
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {vehicle ? "Save changes" : "Save vehicle"}
        </Button>
      </DialogFooter>
    </form>
  );
}
