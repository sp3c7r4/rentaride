import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const POINTS = [
  "Every driver and vehicle is verified before they go live.",
  "Flexible daily, weekly or monthly repayment schedules.",
  "Owners receive predictable monthly reimbursements.",
];

/** Reassurance list for the left panel on sign in, sign up and verification. */
export function TrustPoints() {
  return (
    <ul className="flex max-w-sm flex-col gap-4">
      {POINTS.map((point) => (
        <li
          key={point}
          className="flex items-start gap-3 text-sm text-zinc-300"
        >
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-zinc-950">
            <HugeiconsIcon
              icon={Tick02Icon}
              strokeWidth={3}
              className="size-3"
            />
          </span>
          {point}
        </li>
      ))}
    </ul>
  );
}
