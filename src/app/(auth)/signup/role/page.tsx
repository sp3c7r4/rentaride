"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";

const roles = [
  {
    id: "driver",
    href: "/dashboard/driver",
    title: "I want to drive",
    description:
      "Browse verified vehicles and lease one on a daily, weekly, or monthly repayment schedule that works for you.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="size-7"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
        />
      </svg>
    ),
  },
  {
    id: "owner",
    href: "/dashboard/owner",
    title: "I want to earn",
    description:
      "List your idle vehicle, get verified once, and receive predictable monthly reimbursements managed by the platform.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="size-7"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h1.5m-1.5 0h-1.5m-9 0H6m1.5 0H6"
        />
      </svg>
    ),
  },
] as const;

export default function RoleSelectPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (ctx) => {
        const { motion } = ctx.conditions as { motion: boolean; reduced: boolean };

        const heading = el.querySelector<HTMLElement>("[data-heading]");
        const cards   = el.querySelectorAll<HTMLElement>("[data-card]");
        const footer  = el.querySelector<HTMLElement>("[data-footer]");

        if (motion) {
          gsap.set([heading, cards, footer], { autoAlpha: 0, y: 28 });

          const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

          tl.to(heading, { autoAlpha: 1, y: 0, duration: 0.65 });
          tl.to(cards, {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            stagger: 0.12,
          }, "-=0.3");
          tl.to(footer, { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.2");
          // Return local cleanup — do NOT call ctx.revert() here
          return () => { tl.kill(); };
        } else {
          gsap.set([heading, cards, footer], { autoAlpha: 1, clearProps: "all" });
        }
      }
    );

    return () => { mm.revert(); };
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-lg flex flex-col gap-8">
      {/* Heading */}
      <div data-heading className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          How will you use RentARide?
        </h1>
        <p className="text-sm text-zinc-500">
          Choose your role. You can always manage this later.
        </p>
      </div>

      {/* Role cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map(({ id, href, title, description, icon }) => (
          <Link
            key={id}
            data-card
            href={href}
            className="group relative flex flex-col gap-4 rounded-2xl border-2 border-zinc-200 bg-white p-6 transition-all hover:border-zinc-900 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-zinc-900 group-hover:text-white">
              {icon}
            </span>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-base font-semibold text-zinc-900 pr-6">
                {title}
              </h2>
              <p className="text-sm leading-relaxed text-zinc-500">
                {description}
              </p>
            </div>

            {/* Arrow */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="absolute right-5 top-6 size-5 text-zinc-300 transition-colors group-hover:text-zinc-900"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        ))}
      </div>

      <p data-footer className="text-xs text-zinc-400 text-center">
        Changed your mind?{" "}
        <Link
          href="/signup"
          className="font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900 transition-colors"
        >
          Go back
        </Link>
      </p>
    </div>
  );
}
