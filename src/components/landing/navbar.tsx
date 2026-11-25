"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSession } from "@/lib/session";

const navLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Browse Cars", href: "/browse" },
  { label: "List Your Car", href: "/#list" },
  { label: "About", href: "/about" },
];

/** `solid` keeps a white bar for pages without a dark hero (e.g. /browse). */
export function Navbar({ solid = false }: { solid?: boolean }) {
  const session = useSession();
  const signedIn = session.status === "signed_in";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isTransparent = !solid && !scrolled && !open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        isTransparent
          ? "bg-transparent"
          : "bg-white"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Wordmark */}
        <Link
          href="/"
          className={cn(
            "text-sm font-bold tracking-tight shrink-0 transition-colors duration-300",
            isTransparent ? "text-white" : "text-zinc-900"
          )}
        >
          RentARide
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            link.label === "List Your Car" ? (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "transition-colors duration-300 border-0",
                  isTransparent
                    ? "text-zinc-300 hover:text-white hover:bg-white/10"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                )}
              >
                {link.label}
              </Link>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm transition-colors duration-300",
                  isTransparent
                    ? "text-zinc-300 hover:text-white"
                    : "text-zinc-500 hover:text-zinc-900"
                )}
              >
                {link.label}
              </Link>
            )
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ size: "sm" }),
                isTransparent
                  ? "bg-white text-zinc-950 hover:bg-zinc-100"
                  : "bg-zinc-900 text-white hover:bg-zinc-800",
              )}
            >
              Dashboard
            </Link>
          ) : (
          <>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "transition-colors duration-300",
              isTransparent ? "text-zinc-300 hover:text-white hover:bg-white/10" : "text-zinc-600"
            )}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ size: "sm" }),
              isTransparent
                ? "bg-white text-zinc-950 hover:bg-zinc-100"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            )}
          >
            Get started
          </Link>
          </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md border md:hidden transition-colors duration-300",
            isTransparent
              ? "border-white/20 text-white"
              : "border-zinc-200 text-zinc-600"
          )}
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          <HugeiconsIcon
            icon={open ? Cancel01Icon : Menu01Icon}
            className="size-4"
          />
        </button>
      </div>

      {/* Mobile menu — always solid white when open */}
      {open && (
        <div
          id="mobile-nav"
          className="border-t border-zinc-200 bg-white px-4 pb-5 md:hidden"
        >
          <nav className="flex flex-col gap-0.5 pt-3" aria-label="Mobile primary">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Separator className="my-4" />
          <div className="flex flex-col gap-2">
            {signedIn ? (
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "w-full justify-center bg-zinc-900 text-white hover:bg-zinc-800",
                )}
              >
                Dashboard
              </Link>
            ) : (
            <>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full justify-center"
              )}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "sm" }),
                "w-full justify-center bg-zinc-900 text-white hover:bg-zinc-800"
              )}
            >
              Get started
            </Link>
            </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
