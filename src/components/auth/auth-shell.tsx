import Link from "next/link";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  headline: string;
  description: string;
  /** Extra content in the left panel, under the description. */
  panel?: React.ReactNode;
  /** Small label at the left of the right-hand header (large screens). */
  headerLabel?: string;
  /** Right side of the header row, e.g. a step counter. */
  headerRight?: React.ReactNode;
  /** Full-width element directly under the header, e.g. a progress bar. */
  progress?: React.ReactNode;
  /** Use a wider content column (e.g. two-column choice cards). */
  wide?: boolean;
  children: React.ReactNode;
};

/**
 * Two-column shell shared by login, signup, verification and onboarding.
 * Left: brand, message and wordmark on a dark panel. Right: the form.
 */
export function AuthShell({
  headline,
  description,
  panel,
  headerLabel,
  headerRight,
  progress,
  wide,
  children,
}: AuthShellProps) {
  const axis = wide ? "max-w-xl" : "max-w-md";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-zinc-950 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex flex-1 flex-col gap-12 p-12">
          <Link href="/" className="w-fit text-lg font-bold tracking-tight">
            RentARide
          </Link>

          <div className="flex max-w-md flex-col gap-3">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">
              {headline}
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              {description}
            </p>
          </div>

          {panel}
        </div>

        <p
          aria-hidden
          className="-mb-[0.12em] select-none whitespace-nowrap px-12 font-bold leading-none tracking-tight text-zinc-900"
          style={{ fontSize: "clamp(4rem, 8.4vw, 8.25rem)" }}
        >
          RentARide
        </p>
      </aside>

      <div className="flex min-h-screen flex-col bg-background">
        <header className="shrink-0">
          <div className="px-6 sm:px-10">
            <div
              className={cn(
                "mx-auto flex h-16 w-full items-center justify-between",
                axis,
              )}
            >
              <Link
                href="/"
                className="text-sm font-bold tracking-tight lg:hidden"
              >
                RentARide
              </Link>
              <span className="hidden text-sm text-muted-foreground lg:block">
                {headerLabel}
              </span>
              {headerRight}
            </div>
          </div>
          {progress}
        </header>

        <main className="flex flex-1 justify-center px-6 pt-10 pb-12 sm:px-10 sm:pt-16">
          {children}
        </main>

        <footer className="shrink-0 px-6 pb-6 text-xs text-muted-foreground sm:px-10">
          <div className={cn("mx-auto w-full", axis)}>
            Need help?{" "}
            <Link
              href="/contact"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Contact support
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
