"use client";

import {
  Add01Icon,
  Car01Icon,
  Delete02Icon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatNaira } from "@/lib/format";
import type { VehicleDraft } from "@/lib/kyc";
import { StepActions, StepFrame, type StepProps } from "./step-frame";
import { VehicleDialog } from "./vehicle-dialog";

export function VehicleStep({ data, onBack, onNext }: StepProps) {
  const [vehicles, setVehicles] = useState<VehicleDraft[]>(data.vehicles);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleDraft | null>(null);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (v: VehicleDraft) => {
    setEditing(v);
    setDialogOpen(true);
  };
  const save = (v: VehicleDraft) =>
    setVehicles((prev) =>
      prev.some((p) => p.id === v.id)
        ? prev.map((p) => (p.id === v.id ? v : p))
        : [...prev, v],
    );
  const remove = (id: string) =>
    setVehicles((prev) => prev.filter((p) => p.id !== id));

  return (
    <StepFrame
      title={
        <>
          Add your vehicle
          <Badge variant="secondary">Optional</Badge>
        </>
      }
      description="Add the vehicle you want to earn from now, or skip and do it later from your dashboard."
    >
      <div className="flex flex-col gap-5">
        {vehicles.length === 0 ? (
          <Empty className="rounded-xl border-2 bg-muted/30 p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={Car01Icon} strokeWidth={1.5} />
              </EmptyMedia>
              <EmptyTitle className="text-sm font-medium">
                No vehicle added yet
              </EmptyTitle>
              <EmptyDescription>
                Add the make, model, plate number and registration document.
              </EmptyDescription>
            </EmptyHeader>
            <Button type="button" onClick={openAdd}>
              <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
              Add your vehicle
            </Button>
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {vehicles.map((v) => (
              <Card key={v.id} size="sm">
                <CardContent className="flex items-center gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <HugeiconsIcon
                      icon={Car01Icon}
                      strokeWidth={1.5}
                      className="size-5"
                    />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate text-sm font-semibold">
                      {v.year} {v.make} {v.model}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {v.plate} · {formatNaira(v.weeklyPrice)}/week
                    </p>
                  </div>
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    Pending review
                  </Badge>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${v.make} ${v.model}`}
                      onClick={() => openEdit(v)}
                    >
                      <HugeiconsIcon icon={PencilEdit01Icon} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${v.make} ${v.model}`}
                      onClick={() => remove(v.id)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button type="button" variant="outline" onClick={openAdd}>
              <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
              Add another vehicle
            </Button>
          </div>
        )}

        <StepActions
          onBack={onBack}
          submitLabel={vehicles.length === 0 ? "Skip for now" : "Continue"}
          onSubmit={() => onNext({ vehicles })}
        />
      </div>

      <VehicleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicle={editing}
        onSave={save}
      />
    </StepFrame>
  );
}
