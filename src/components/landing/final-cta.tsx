import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ScrollReveal } from "./scroll-reveal";

export function FinalCta() {
  return (
    <section className="bg-zinc-950 py-24">
      <ScrollReveal><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Get on the road.
            </h2>
            <p className="mt-3 max-w-lg text-base text-zinc-400">
              Sign up in minutes. Verify once. Drive on a schedule that works
              for you, or list your car and earn.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-amber-400 text-zinc-950 hover:bg-amber-300 font-semibold gap-2"
              )}
            >
              Start as a driver
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </Link>
            <Link
              href="/signup?role=owner"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white"
              )}
            >
              List your car
            </Link>
          </div>
        </div>
        <p className="mt-8 text-xs text-zinc-600">
          No credit card required. Open to verified users in Nigeria.
        </p>
      </div>
    </ScrollReveal>
    </section>
  );
}
