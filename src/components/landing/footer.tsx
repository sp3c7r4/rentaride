import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const columns = {
  Product: [
    { label: "Browse cars", href: "/browse" },
    { label: "List your car", href: "/signup?role=owner" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "Pricing", href: "/pricing" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Terms of service", href: "/terms" },
    { label: "Privacy policy", href: "/privacy" },
    { label: "Cookie policy", href: "/cookies" },
  ],
  Support: [
    { label: "Help centre", href: "/help" },
    { label: "File a dispute", href: "/dashboard/disputes/new" },
    { label: "Verification FAQ", href: "/help#verification" },
    { label: "Report a listing", href: "/contact?topic=listing" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-500 overflow-hidden">

      {/* ── Top band — CTA left, link columns right ── */}
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">

          {/* Left — CTA */}
          <div className="flex flex-col gap-5">
            <p className="text-2xl font-bold leading-snug text-white max-w-[220px]">
              Start earning from your car today.
            </p>
            <Link
              href="/signup?role=owner"
              className={cn(
                buttonVariants({ size: "sm" }),
                "w-fit border border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
              )}
            >
              List your car
            </Link>
          </div>

          {/* Right — link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {Object.entries(columns).map(([section, items]) => (
              <div key={section} className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold text-zinc-300">
                  {section}
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {items.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm text-zinc-400 hover:text-white transition-colors"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom band — giant wordmark + legal ── */}
      <div className="">
        {/* Oversized wordmark */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-2">
          <div className="flex items-end justify-between">
            <Link
              href="/"
              className="text-xs font-semibold tracking-tight text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              RentARide
            </Link>
            <p className="text-xs text-zinc-400">
              © 2026 Arthurite Integrated
            </p>
          </div>
        </div>

        {/* Giant display wordmark */}
        <div className="select-none px-2 sm:px-4 lg:px-6 pb-0 -mb-3 overflow-hidden">
          <p
            className="font-bold text-zinc-900 leading-none tracking-tight whitespace-nowrap"
            style={{ fontSize: "clamp(4rem, 14vw, 13rem)" }}
            aria-hidden
          >
            RentARide
          </p>
        </div>
      </div>
    </footer>
  );
}
