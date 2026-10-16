import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ScrollReveal } from "./scroll-reveal";

const categories = [
  { label: "Sedans", count: "820 available" },
  { label: "SUVs", count: "640 available" },
  { label: "Vans", count: "290 available" },
  { label: "Electric", count: "110 available" },
  { label: "Pickups", count: "180 available" },
  { label: "Luxury", count: "95 available" },
];

export function VehicleCategories() {
  return (
    <section id="browse" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                Available vehicles
              </h2>
              <p className="mt-2 text-base text-zinc-500">
                Every listing is owner-verified before it goes live.
              </p>
            </div>
            <Link
              href="/browse"
              className="hidden items-center gap-1 text-sm font-medium text-zinc-900 hover:text-amber-500 transition-colors sm:flex"
            >
              Browse all
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <div className="grid grid-cols-2 gap-px bg-zinc-100 sm:grid-cols-3 lg:grid-cols-6 rounded-xl overflow-hidden">
            {categories.map((cat) => (
              <Link
                key={cat.label}
                href={`/browse?type=${cat.label.toLowerCase()}`}
                className="group flex flex-col gap-1 bg-white px-5 py-7 transition-colors hover:bg-zinc-950"
              >
                <span className="text-sm font-semibold text-zinc-900 group-hover:text-white transition-colors">
                  {cat.label}
                </span>
                <span className="text-xs text-zinc-400 group-hover:text-zinc-500 transition-colors">
                  {cat.count}
                </span>
              </Link>
            ))}
          </div>
        </ScrollReveal>

        <div className="mt-5 sm:hidden">
          <Link
            href="/browse"
            className="flex items-center gap-1 text-sm font-medium text-zinc-900 hover:text-amber-500 transition-colors"
          >
            Browse all vehicles
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
