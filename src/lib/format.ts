const ngn = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const ngnCompact = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** ₦25,000 */
export const formatNaira = (amount: number) => ngn.format(amount);

/** ₦1.2M */
export const formatNairaCompact = (amount: number) => ngnCompact.format(amount);

const dateFmt = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const shortDateFmt = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
});

const monthFmt = new Intl.DateTimeFormat("en-NG", {
  month: "long",
  year: "numeric",
});

/** 12 Nov 2026 */
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));

/** 12 Nov */
export const formatShortDate = (iso: string) =>
  shortDateFmt.format(new Date(iso));

/** "2026-11" → November 2026 */
export const formatPeriod = (period: string) =>
  monthFmt.format(new Date(`${period}-01T00:00:00`));

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 days ago", "in 2 days", "today" */
export function formatRelative(iso: string, now = new Date()) {
  const diffMs = new Date(iso).getTime() - now.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 1) return "just now";
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  const months = Math.round(days / 30);
  return rtf.format(months, "month");
}

export const SCHEDULE_LABEL = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
} as const;

export const SCHEDULE_UNIT = {
  daily: "day",
  weekly: "week",
  monthly: "month",
} as const;

export const initials = (first: string, last: string) =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
