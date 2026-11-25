"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useQuery } from "@/lib/api/use-query";
import {
  listCities,
  listVehicles,
  SORT_LABEL,
  VEHICLE_TYPE_LABEL,
  type VehicleSort,
} from "@/lib/api/vehicles";
import { SCHEDULE_LABEL } from "@/lib/format";
import type { Schedule, VehicleType } from "@/lib/types";
import { VehicleCard, VehicleCardSkeleton } from "./vehicle-card";

const ALL = "all";
const SCHEDULES: Schedule[] = ["daily", "weekly", "monthly"];

const typeItems = [
  { value: ALL, label: "All types" },
  ...Object.entries(VEHICLE_TYPE_LABEL).map(([value, label]) => ({
    value,
    label,
  })),
];
const sortItems = Object.entries(SORT_LABEL).map(([value, label]) => ({
  value,
  label,
}));

function parseSchedule(v: string | null): Schedule {
  return v === "daily" || v === "monthly" ? v : "weekly";
}

export function BrowseClient() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const type = (params.get("type") ?? "") as VehicleType | "";
  const city = params.get("city") ?? "";
  const schedule = parseSchedule(params.get("schedule"));
  const sort = (params.get("sort") ?? "recommended") as VehicleSort;
  const q = params.get("q") ?? "";

  const [search, setSearch] = useState(q);
  const citiesQ = useQuery(listCities, []);
  const cities = citiesQ.status === "success" ? citiesQ.data : [];
  const cityItems = useMemo(
    () => [
      { value: ALL, label: "All cities" },
      ...cities.map((c) => ({ value: c, label: c })),
    ],
    [cities],
  );

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (
        !v ||
        v === ALL ||
        (k === "schedule" && v === "weekly") ||
        (k === "sort" && v === "recommended")
      ) {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Debounce the search box into the URL.
  // biome-ignore lint/correctness/useExhaustiveDependencies: update reads current params
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => update({ q: search }), 300);
    return () => clearTimeout(t);
  }, [search]);

  const results = useQuery(
    () => listVehicles({ q, type, city, schedule, sort }),
    [q, type, city, schedule, sort],
  );
  const hasFilters = Boolean(q || type || city);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Find a vehicle
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Every listing is owner-verified and reviewed by our team. Choose a
          repayment schedule to see prices.
        </p>
      </div>

      <section
        aria-label="Filters"
        className="flex flex-col gap-3 rounded-2xl border bg-card p-3 lg:flex-row lg:items-center"
      >
        <InputGroup className="h-10 lg:max-w-xs">
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search by make or model"
            placeholder="Search make or model"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>

        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-1 sm:flex-wrap sm:items-center">
          <Select
            items={typeItems}
            value={type || ALL}
            onValueChange={(v) => update({ type: String(v) })}
          >
            <SelectTrigger
              aria-label="Vehicle type"
              className="h-10 w-full sm:w-40"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {typeItems.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            items={cityItems}
            value={city || ALL}
            onValueChange={(v) => update({ city: String(v) })}
          >
            <SelectTrigger aria-label="City" className="h-10 w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {cityItems.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <ToggleGroup
            aria-label="Repayment schedule"
            variant="outline"
            value={[schedule]}
            onValueChange={(v) => {
              const picked = v.at(-1);
              if (picked) update({ schedule: String(picked) });
            }}
            className="col-span-2 w-full sm:w-auto"
          >
            {SCHEDULES.map((s) => (
              <ToggleGroupItem
                key={s}
                value={s}
                className="h-10 flex-1 px-4 sm:flex-none"
              >
                {SCHEDULE_LABEL[s]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Select
            items={sortItems}
            value={sort}
            onValueChange={(v) => update({ sort: String(v) })}
          >
            <SelectTrigger
              aria-label="Sort by"
              className="col-span-2 h-10 w-full sm:ml-auto sm:w-48"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {sortItems.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </section>

      <div aria-live="polite" className="flex flex-col gap-4">
        {results.status === "success" && (
          <p className="text-sm text-muted-foreground">
            {results.data.length} vehicle{results.data.length === 1 ? "" : "s"}{" "}
            available
            {city ? ` in ${city}` : ""}
          </p>
        )}

        {results.status === "error" && (
          <Alert variant="destructive">
            <AlertDescription>{results.error}</AlertDescription>
          </Alert>
        )}

        {results.status === "loading" && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
              <VehicleCardSkeleton key={i} />
            ))}
          </div>
        )}

        {results.status === "success" && results.data.length === 0 && (
          <Empty className="rounded-2xl border border-dashed p-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={Search01Icon} strokeWidth={1.5} />
              </EmptyMedia>
              <EmptyTitle>No vehicles match your filters</EmptyTitle>
              <EmptyDescription>
                Try another city or vehicle type, or clear your search.
              </EmptyDescription>
            </EmptyHeader>
            {hasFilters && (
              <EmptyContent>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    update({ q: "", type: "", city: "" });
                  }}
                >
                  Clear filters
                </Button>
              </EmptyContent>
            )}
          </Empty>
        )}

        {results.status === "success" && results.data.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.data.map((v) => (
              <VehicleCard key={v.id} vehicle={v} schedule={schedule} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
