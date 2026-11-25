import { Badge } from "@/components/ui/badge";
import type { KycStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABEL: Record<KycStatus, string> = {
  verified: "Verified",
  pending: "Verification pending",
  action_needed: "Action needed",
};

export function KycBadge({
  status,
  className,
}: {
  status: KycStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={status === "action_needed" ? "destructive" : "secondary"}
      className={cn(
        status === "verified" &&
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        status === "pending" &&
          "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        className,
      )}
    >
      {LABEL[status]}
    </Badge>
  );
}
