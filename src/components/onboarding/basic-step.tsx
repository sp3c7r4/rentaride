"use client";

import type { FormEvent } from "react";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { StepActions, StepFrame, type StepProps } from "./step-frame";

export function BasicStep({ data, onBack, onNext }: StepProps) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onNext({
      phone: String(form.get("phone")).trim(),
      city: String(form.get("city")).trim(),
    });
  }

  return (
    <StepFrame
      title="Tell us about you"
      description="We use these details to contact you about bookings and payments."
    >
      <form onSubmit={handleSubmit}>
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="phone">Phone number</FieldLabel>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0803 000 0000"
              defaultValue={data.phone}
              className="h-11"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="city">City</FieldLabel>
            <Input
              id="city"
              name="city"
              autoComplete="address-level2"
              placeholder="Lagos"
              defaultValue={data.city}
              className="h-11"
              required
            />
          </Field>
          <StepActions onBack={onBack} submitLabel="Continue" />
        </FieldGroup>
      </form>
    </StepFrame>
  );
}
