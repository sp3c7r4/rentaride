import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  MapPinIcon,
  Calendar01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { HeroAnimate } from "./hero-animate";

export function Hero() {
  return (
    <section className="bg-zinc-950 pt-16 min-h-screen flex flex-col overflow-hidden">
      <HeroAnimate>
        {/* ── Content area ── */}
        <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 items-center">

          {/* Left */}
          <div className="relative z-10 flex flex-col gap-7 py-16 lg:py-0 max-w-xl">
            <h1 className="text-5xl font-bold leading-[1.06] tracking-tight text-white sm:text-6xl lg:text-[4.5rem]">
              <span data-hero-line className="block">Lease a car</span>
              <span data-hero-line className="block">on your own</span>
              <span data-hero-line className="block text-amber-400">schedule.</span>
            </h1>

            <p data-hero-body className="max-w-sm text-[15px] leading-relaxed text-zinc-400">
              Nigeria's managed car-lease platform. Verified owners list
              vehicles. Verified drivers lease them daily, weekly, or monthly.
              The platform handles everything in between.
            </p>

            <div data-hero-ctas className="flex items-center gap-3">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-white text-zinc-950 hover:bg-zinc-100 font-semibold"
                )}
              >
                Get started
              </Link>
              <Link
                href="/browse"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                Browse cars
              </Link>
            </div>

            <div className="flex items-center gap-10 pt-1">
              {[
                { value: "3,200+", label: "Verified listings" },
                { value: "9,000+", label: "Active drivers" },
                { value: "45+", label: "Cities" },
              ].map(({ value, label }) => (
                <div key={label} data-hero-stat className="flex flex-col gap-0.5">
                  <span className="text-xl font-bold text-white tabular-nums">{value}</span>
                  <span className="text-xs text-zinc-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — car */}
          <div
            data-hero-car
            aria-hidden
            className="hidden lg:flex items-center justify-center relative pointer-events-none select-none"
          >
            <Image
              src="/images/bmw-m2-yellow.png"
              alt="Yellow BMW M2 — available on RentARide"
              width={1941}
              height={810}
              loading="eager"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>

        {/* ── Search bar ── */}
        <div data-hero-bar className="border-t border-zinc-800/60 relative z-10">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 divide-y divide-zinc-800/60 md:grid-cols-[1fr_1px_1fr_1px_1fr_1px_1fr] md:divide-y-0 md:divide-x">

              {/* Location */}
              <div className="flex flex-col gap-1.5 py-5 px-4 sm:px-6 lg:px-8 md:pr-6 md:pl-8">
                <label
                  htmlFor="hero-location"
                  className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400"
                >
                  Location
                </label>
                <div className="relative">
                  <HugeiconsIcon
                    icon={MapPinIcon}
                    className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    id="hero-location"
                    type="text"
                    placeholder="City or state"
                    className="h-9 w-full bg-transparent pl-6 text-sm text-white placeholder:text-zinc-400 outline-none"
                  />
                </div>
              </div>

              <div aria-hidden className="hidden md:block" />

              {/* Start date */}
              <div className="flex flex-col gap-1.5 py-5 px-4 sm:px-6 md:px-6">
                <label
                  htmlFor="hero-start"
                  className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400"
                >
                  Start date
                </label>
                <div className="relative">
                  <HugeiconsIcon
                    icon={Calendar01Icon}
                    className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    id="hero-start"
                    type="date"
                    className="h-9 w-full bg-transparent pl-6 text-sm text-zinc-400 outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              <div aria-hidden className="hidden md:block" />

              {/* Schedule */}
              <div className="flex flex-col gap-1.5 py-5 px-4 sm:px-6 md:px-6">
                <label htmlFor="hero-schedule" className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  Schedule
                </label>
                <Select>
                  <SelectTrigger id="hero-schedule" className="h-9 w-full rounded-none border-0 bg-transparent px-0 text-sm text-zinc-400 shadow-none focus-visible:ring-0 focus-visible:border-0 data-placeholder:text-zinc-400 [&>svg]:text-zinc-500">
                    <SelectValue placeholder="Repayment frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div aria-hidden className="hidden md:block" />

              {/* CTA */}
              <Link
                href="/browse"
                className="flex items-center justify-center bg-amber-400 hover:bg-amber-300 transition-colors h-16 md:h-auto md:self-stretch"
              >
                <span className="text-sm font-semibold text-zinc-950 whitespace-nowrap">
                  Find a vehicle
                </span>
              </Link>
            </div>
          </div>
        </div>
      </HeroAnimate>
    </section>
  );
}
