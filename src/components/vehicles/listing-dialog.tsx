"use client";

import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
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
import { Spinner } from "@/components/ui/spinner";
import {
  createVehicle,
  type OwnerVehicle,
  updateVehicle,
  type VehicleInput,
} from "@/lib/api/my-vehicles";
import { formatNaira } from "@/lib/format";
import { CITIES, VEHICLE_TYPES } from "@/lib/kyc";
import { OWNER_SHARE, pricingFromWeekly } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { uploadFile } from "@/lib/uploads";
import { PhotoManager } from "./photo-manager";

const MAX_YEAR = new Date().getFullYear() + 1;
const DOC_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const TRANSMISSIONS = [
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
];
const FUELS = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid", label: "Hybrid" },
  { value: "electric", label: "Electric" },
];
const CITY_ITEMS = CITIES.map((c) => ({ value: c, label: c }));

/** Add or edit a marketplace listing. */
export function ListingDialog({
  open,
  onOpenChange,
  vehicle,
  defaultCity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this vehicle. */
  vehicle?: OwnerVehicle | null;
  defaultCity?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {vehicle ? "Edit listing" : "List a vehicle"}
          </DialogTitle>
          <DialogDescription>
            {vehicle?.status === "rejected"
              ? "Update the details below. Saving sends the listing back for review."
              : vehicle?.status === "pending_review"
                ? "Your changes are included in the review that's under way."
                : vehicle
                  ? "Changes to a live listing show on the marketplace straight away."
                  : "Enter the details exactly as they appear on the vehicle registration. Our team reviews every listing before it goes live."}
          </DialogDescription>
        </DialogHeader>
        {/* The popup unmounts when closed, so each open starts fresh. */}
        <ListingForm
          vehicle={vehicle ?? undefined}
          defaultCity={defaultCity}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

type Errors = Partial<
  Record<
    "type" | "transmission" | "fuel" | "city" | "photos" | "registrationDoc",
    string
  >
>;

function SelectField<T extends string>({
  id,
  label,
  items,
  value,
  onChange,
  error,
  disabled,
}: {
  id: string;
  label: string;
  items: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={items}
        value={value}
        onValueChange={(v) => onChange(v as T | null)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className="w-full data-[size=default]:h-11"
          aria-invalid={!!error}
        >
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className="max-h-72">
          <SelectGroup>
            {items.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </Field>
  );
}

function ListingForm({
  vehicle,
  defaultCity,
  onDone,
}: {
  vehicle?: OwnerVehicle;
  defaultCity?: string;
  onDone: () => void;
}) {
  const [type, setType] = useState<Vehicle["type"] | null>(
    vehicle?.type ?? null,
  );
  const [transmission, setTransmission] = useState<
    Vehicle["transmission"] | null
  >(vehicle?.transmission ?? null);
  const [fuel, setFuel] = useState<Vehicle["fuel"] | null>(
    vehicle?.fuel ?? null,
  );
  const [city, setCity] = useState<string | null>(
    vehicle?.city ??
      (defaultCity && CITIES.includes(defaultCity) ? defaultCity : null),
  );
  const [photos, setPhotos] = useState<string[]>(
    vehicle ? [vehicle.photo, ...(vehicle.gallery ?? [])].filter(Boolean) : [],
  );
  const [doc, setDoc] = useState<File | null>(null);
  const [weekly, setWeekly] = useState<string>(
    vehicle ? String(vehicle.pricing.weekly) : "",
  );
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const clear = (k: keyof Errors) =>
    setErrors((e) => ({ ...e, [k]: undefined }));
  const weeklyNum = Number(weekly);
  const preview = weeklyNum >= 5000 ? pricingFromWeekly(weeklyNum) : null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: Errors = {};
    if (!type) next.type = "Select a vehicle type.";
    if (!transmission) next.transmission = "Select a transmission.";
    if (!fuel) next.fuel = "Select a fuel type.";
    if (!city) next.city = "Select a city.";
    if (photos.length === 0) next.photos = "Add at least one photo.";
    if (!vehicle && !doc)
      next.registrationDoc = "Upload the registration document.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const form = new FormData(e.currentTarget);
    setSaving(true);
    setFormError(null);
    let registrationKey: string | undefined;
    if (doc) {
      try {
        registrationKey = (await uploadFile(doc, "registration")).key;
      } catch (err) {
        setSaving(false);
        setFormError(err instanceof Error ? err.message : "Upload failed.");
        return;
      }
    }
    const input: VehicleInput = {
      make: String(form.get("make")).trim(),
      model: String(form.get("model")).trim(),
      year: Number(form.get("year")),
      colour: String(form.get("colour")).trim(),
      plate: String(form.get("plate")).trim().toUpperCase(),
      seats: Number(form.get("seats")),
      mileageKm: Number(form.get("mileage")),
      type: type as Vehicle["type"],
      transmission: transmission as Vehicle["transmission"],
      fuel: fuel as Vehicle["fuel"],
      city: city as string,
      weeklyPrice: weeklyNum,
      photos,
      registrationKey,
    };

    const res = vehicle
      ? await updateVehicle(vehicle.id, input)
      : await createVehicle(input);
    setSaving(false);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    const name = `${input.make} ${input.model}`;
    if (!vehicle) {
      toast.success("Listing submitted", {
        description: `We'll review the ${name} within 24 hours.`,
      });
    } else if (vehicle.status === "rejected") {
      toast.success("Listing resubmitted", {
        description: `The ${name} is back in the review queue.`,
      });
    } else {
      toast.success("Listing updated");
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-6">
        <FieldSet>
          <FieldLegend>Vehicle</FieldLegend>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="l-make">Make</FieldLabel>
              <Input
                id="l-make"
                name="make"
                placeholder="Toyota"
                defaultValue={vehicle?.make}
                className="h-11"
                required
                disabled={saving}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="l-model">Model</FieldLabel>
              <Input
                id="l-model"
                name="model"
                placeholder="Corolla"
                defaultValue={vehicle?.model}
                className="h-11"
                required
                disabled={saving}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="l-year">Year</FieldLabel>
              <Input
                id="l-year"
                name="year"
                type="number"
                inputMode="numeric"
                placeholder="2018"
                min={2000}
                max={MAX_YEAR}
                defaultValue={vehicle?.year}
                className="h-11"
                required
                disabled={saving}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="l-colour">Colour</FieldLabel>
              <Input
                id="l-colour"
                name="colour"
                placeholder="Silver"
                defaultValue={vehicle?.colour}
                className="h-11"
                required
                disabled={saving}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="l-plate">Plate number</FieldLabel>
              <Input
                id="l-plate"
                name="plate"
                placeholder="ABC-123DE"
                autoCapitalize="characters"
                defaultValue={vehicle?.plate}
                className="h-11 uppercase"
                required
                disabled={saving}
              />
            </Field>
            <SelectField
              id="l-type"
              label="Vehicle type"
              items={VEHICLE_TYPES}
              value={type}
              onChange={(v) => {
                setType(v);
                if (v === "electric") setFuel("electric");
                clear("type");
              }}
              error={errors.type}
              disabled={saving}
            />
            <SelectField
              id="l-transmission"
              label="Transmission"
              items={
                TRANSMISSIONS as {
                  value: Vehicle["transmission"];
                  label: string;
                }[]
              }
              value={transmission}
              onChange={(v) => {
                setTransmission(v);
                clear("transmission");
              }}
              error={errors.transmission}
              disabled={saving}
            />
            <SelectField
              id="l-fuel"
              label="Fuel"
              items={FUELS as { value: Vehicle["fuel"]; label: string }[]}
              value={fuel}
              onChange={(v) => {
                setFuel(v);
                clear("fuel");
              }}
              error={errors.fuel}
              disabled={saving}
            />
            <Field>
              <FieldLabel htmlFor="l-seats">Seats</FieldLabel>
              <Input
                id="l-seats"
                name="seats"
                type="number"
                inputMode="numeric"
                min={2}
                max={18}
                defaultValue={vehicle?.seats ?? 5}
                className="h-11"
                required
                disabled={saving}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="l-mileage">Mileage (km)</FieldLabel>
              <Input
                id="l-mileage"
                name="mileage"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="85000"
                defaultValue={vehicle?.mileageKm}
                className="h-11"
                required
                disabled={saving}
              />
            </Field>
          </div>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Location and price</FieldLegend>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <SelectField
              id="l-city"
              label="City"
              items={CITY_ITEMS}
              value={city}
              onChange={(v) => {
                setCity(v);
                clear("city");
              }}
              error={errors.city}
              disabled={saving}
            />
            <Field>
              <FieldLabel htmlFor="l-price">Weekly price (₦)</FieldLabel>
              <Input
                id="l-price"
                name="weeklyPrice"
                type="number"
                inputMode="numeric"
                min={5000}
                step={500}
                placeholder="45000"
                value={weekly}
                onChange={(e) => setWeekly(e.target.value)}
                className="h-11"
                required
                disabled={saving}
              />
              <FieldDescription>
                {preview
                  ? `Drivers see ${formatNaira(preview.daily)} a day or ${formatNaira(preview.monthly)} a month. You receive ${Math.round(OWNER_SHARE * 100)}% of collections.`
                  : "Daily and monthly prices are worked out from this."}
              </FieldDescription>
            </Field>
          </div>
        </FieldSet>

        <Field data-invalid={!!errors.photos || undefined}>
          <FieldLabel htmlFor="l-photos">Photos</FieldLabel>
          <PhotoManager
            id="l-photos"
            photos={photos}
            onChange={(p) => {
              setPhotos(p);
              clear("photos");
            }}
            error={errors.photos}
            disabled={saving}
          />
        </Field>

        <Field data-invalid={!!errors.registrationDoc || undefined}>
          <FieldLabel htmlFor="l-reg">Registration document</FieldLabel>
          {vehicle?.registrationDoc && !doc && (
            <FieldDescription>
              On file: {vehicle.registrationDoc}. Upload a new one to replace
              it.
            </FieldDescription>
          )}
          <FileDropzone
            id="l-reg"
            title={vehicle ? "Replace document" : "Upload document"}
            mimeTypes={DOC_TYPES}
            formatsLabel="JPG, PNG or PDF"
            value={doc}
            onChange={(f) => {
              setDoc(f);
              clear("registrationDoc");
            }}
            error={errors.registrationDoc}
            disabled={saving}
          />
        </Field>

        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
      </FieldGroup>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Spinner data-icon="inline-start" />}
          {vehicle
            ? vehicle.status === "rejected"
              ? "Resubmit for review"
              : "Save changes"
            : "Submit for review"}
        </Button>
      </DialogFooter>
    </form>
  );
}
