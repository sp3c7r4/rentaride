"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export function HeroAnimate({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        motion:  "(prefers-reduced-motion: no-preference)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (ctx) => {
        const { motion } = ctx.conditions as { motion: boolean; reduced: boolean };

        const headline = el.querySelectorAll<HTMLElement>("[data-hero-line]");
        const body     = el.querySelector<HTMLElement>("[data-hero-body]");
        const ctas     = el.querySelector<HTMLElement>("[data-hero-ctas]");
        const stats    = el.querySelectorAll<HTMLElement>("[data-hero-stat]");
        const car      = el.querySelector<HTMLElement>("[data-hero-car]");
        const bar      = el.querySelector<HTMLElement>("[data-hero-bar]");

        if (motion) {
          gsap.set([headline, body, ctas, stats, car, bar], { autoAlpha: 0 });
          gsap.set(headline, { y: 40 });
          gsap.set([body, ctas], { y: 24 });
          gsap.set(stats, { y: 16 });
          gsap.set(car, { x: 60 });
          gsap.set(bar, { y: 20 });

          const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

          tl.to(headline, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 });
          tl.to([body, ctas], { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.1 }, "-=0.5");
          tl.to(stats, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.07 }, "-=0.4");
          tl.to(car,  { autoAlpha: 1, x: 0, duration: 1.1, ease: "power3.out" }, "<-0.2");
          tl.to(bar,  { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.4");

          // Return local cleanup — do NOT call ctx.revert() here; mm.revert() handles it
          return () => { tl.kill(); };
        } else {
          gsap.set([headline, body, ctas, stats, car, bar], { autoAlpha: 1, clearProps: "all" });
          // no local cleanup needed for set()
        }
      }
    );

    // Outer cleanup reverts the matchMedia context
    return () => { mm.revert(); };
  }, []);

  return <div ref={ref} className="contents">{children}</div>;
}
