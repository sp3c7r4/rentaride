import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "warning" | "success" | "info" | "danger";

const TONE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  info: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  danger: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

/** Map of status values to a label and colour, shared across list pages. */
export const STATUS: Record<string, { label: string; tone: Tone }> = {
  // Requests
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
  // Leases
  active: { label: "Active", tone: "success" },
  completed: { label: "Completed", tone: "neutral" },
  terminated: { label: "Terminated", tone: "danger" },
  // Repayments
  upcoming: { label: "Upcoming", tone: "neutral" },
  due: { label: "Due", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  overdue: { label: "Overdue", tone: "danger" },
  // Payouts
  scheduled: { label: "Scheduled", tone: "info" },
  // Vehicles
  pending_review: { label: "Pending review", tone: "warning" },
  live: { label: "Live", tone: "success" },
  leased: { label: "Leased", tone: "info" },
  unlisted: { label: "Unlisted", tone: "neutral" },
  rejected: { label: "Needs changes", tone: "danger" },
  // Disputes
  open: { label: "Open", tone: "warning" },
  in_review: { label: "In review", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const s = STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return (
    <Badge variant="secondary" className={cn(TONE[s.tone], className)}>
      {s.label}
    </Badge>
  );
}
