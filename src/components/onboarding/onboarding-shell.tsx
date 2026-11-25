"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AuthShell } from "@/components/auth/auth-shell";
import { TrustPoints } from "@/components/auth/trust-points";
import { Progress } from "@/components/ui/progress";
import type { Role } from "@/lib/auth";
import { getKycLevels, getSteps } from "@/lib/kyc";
import { cn } from "@/lib/utils";

type ShellProps = {
  userRole: Role | null;
  /** Index into the role's steps. Ignored when role is null. */
  stepIndex: number;
  children: React.ReactNode;
};

const HEADLINES: Record<Role | "none", string> = {
  none: "Verified people. Verified vehicles.",
  driver: "Get verified once. Start driving sooner.",
  owner: "Turn an idle vehicle into steady income.",
};

export function OnboardingShell({
  userRole: role,
  stepIndex,
  children,
}: ShellProps) {
  const levels = role ? getKycLevels(role) : null;
  const totalSteps = role ? getSteps(role).length : 0;
  // Level 1 (email) is already done, so the current level is stepIndex + 2.
  const currentLevel = role ? stepIndex + 2 : 0;

  return (
    <AuthShell
      headline={HEADLINES[role ?? "none"]}
      description="Every member completes a short identity check. It keeps owners, drivers and vehicles safe."
      headerLabel="Account verification"
      wide={!role}
      headerRight={
        role && (
          <span className="text-sm text-muted-foreground tabular-nums">
            Step {stepIndex + 1} of {totalSteps}
          </span>
        )
      }
      progress={
        role && (
          <Progress
            value={((stepIndex + 1) / totalSteps) * 100}
            aria-label="Verification progress"
            className="gap-0 [&_[data-slot=progress-track]]:h-0.5 [&_[data-slot=progress-track]]:rounded-none"
          />
        )
      }
      panel={
        levels ? (
          <ol
            aria-label="Verification progress"
            className="flex max-w-sm flex-col"
          >
            {levels.map((l, i) => {
              const done = l.level < currentLevel;
              const current = l.level === currentLevel;
              const last = i === levels.length - 1;
              return (
                <li
                  key={l.level}
                  aria-current={current ? "step" : undefined}
                  className="relative flex gap-4 pb-7 last:pb-0"
                >
                  {!last && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-8 left-4 -ml-px h-[calc(100%-2rem)] w-px",
                        done ? "bg-amber-400" : "bg-white/15",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      done && "bg-amber-400 text-zinc-950",
                      current &&
                        "border-2 border-amber-400 bg-zinc-950 text-amber-400",
                      !done &&
                        !current &&
                        "border border-white/20 bg-zinc-950 text-zinc-500",
                    )}
                  >
                    {done ? (
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        strokeWidth={2.5}
                        className="size-4"
                      />
                    ) : (
                      l.level
                    )}
                  </span>
                  <div className="flex flex-col gap-0.5 pt-1">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        done || current ? "text-white" : "text-zinc-500",
                      )}
                    >
                      {l.title}
                    </p>
                    <p
                      className={cn(
                        "text-sm",
                        current ? "text-zinc-400" : "text-zinc-600",
                      )}
                    >
                      {l.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <TrustPoints />
        )
      }
    >
      {children}
    </AuthShell>
  );
}
