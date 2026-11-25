"use client";

import { Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { homeFor, signOut } from "@/lib/auth";
import { initials } from "@/lib/format";
import { useSession } from "@/lib/session";

/** Staff-only layout for the review console. */
export function ReviewShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === "signed_out")
      router.replace("/login?next=%2Freview");
    else if (session.status === "signed_in" && !session.user.staff)
      router.replace(homeFor(session.user));
  }, [session, router]);

  if (session.status !== "signed_in" || !session.user.staff) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-8">
        <span className="sr-only">Loading the review console</span>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-96" />
        {children}
      </div>
    );
  }

  const user = session.user;
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50/60">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-8">
          <Link href="/review" className="text-sm font-bold tracking-tight">
            RentARide
          </Link>
          <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
            Review
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-2 text-sm sm:flex">
              <Avatar className="size-7">
                <AvatarFallback className="text-[11px] font-semibold text-foreground">
                  {initials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              {user.firstName} {user.lastName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
            >
              <HugeiconsIcon icon={Logout01Icon} data-icon="inline-start" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}
