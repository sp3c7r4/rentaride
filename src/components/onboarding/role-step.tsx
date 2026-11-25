"use client";

import {
  ArrowRight01Icon,
  Car01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import type { Role } from "@/lib/auth";

const roles: {
  id: Role;
  title: string;
  description: string;
  icon: IconSvgElement;
}[] = [
  {
    id: "driver",
    title: "I want to drive",
    description:
      "Browse verified vehicles and lease one on a daily, weekly, or monthly repayment schedule.",
    icon: Car01Icon,
  },
  {
    id: "owner",
    title: "I want to earn",
    description:
      "List your idle vehicle, get verified once, and receive predictable monthly reimbursements.",
    icon: Wallet01Icon,
  },
];

export function RoleStep({
  firstName,
  onSelect,
}: {
  firstName?: string;
  onSelect: (role: Role) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const heading = el.querySelector<HTMLElement>("[data-heading]");
      const cards = el.querySelectorAll<HTMLElement>("[data-card]");

      gsap.set([heading, cards], { autoAlpha: 0, y: 20 });
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.to(heading, { autoAlpha: 1, y: 0, duration: 0.6 });
      tl.to(
        cards,
        { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1 },
        "-=0.3",
      );
      return () => {
        tl.kill();
      };
    });

    return () => {
      mm.revert();
    };
  }, []);

  return (
    <div ref={containerRef} className="flex w-full max-w-xl flex-col gap-8">
      <div data-heading className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          How will you use RentARide?
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {firstName ? `Welcome, ${firstName}. ` : ""}Choose the option that
          fits you. Each one has its own short verification.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map(({ id, title, description, icon }) => (
          <button
            key={id}
            type="button"
            data-card
            onClick={() => onSelect(id)}
            className="group relative flex flex-col gap-5 rounded-2xl border bg-card p-6 text-left transition-colors hover:border-foreground/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-6" />
            </span>
            <span className="flex flex-col gap-1.5">
              <span className="text-base font-semibold">{title}</span>
              <span className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </span>
            </span>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={1.5}
              className="absolute top-6 right-6 size-5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
