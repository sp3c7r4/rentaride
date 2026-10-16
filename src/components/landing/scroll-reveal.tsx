"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  distance = 32,
}: ScrollRevealProps) {
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

        if (motion) {
          gsap.set(el, { autoAlpha: 0, y: distance });

          const trigger = ScrollTrigger.create({
            trigger: el,
            start: "top 88%",
            once: true,
            onEnter: () => {
              gsap.to(el, {
                autoAlpha: 1,
                y: 0,
                duration: 0.7,
                delay,
                ease: "power3.out",
              });
            },
          });

          // Local cleanup only — do NOT call ctx.revert() here
          return () => {
            trigger.kill();
            gsap.set(el, { clearProps: "all" });
          };
        } else {
          gsap.set(el, { autoAlpha: 1, clearProps: "all" });
        }
      }
    );

    return () => { mm.revert(); };
  }, [delay, distance]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
