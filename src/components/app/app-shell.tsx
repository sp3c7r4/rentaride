"use client";

import {
  Logout01Icon,
  Settings02Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { signOut } from "@/lib/auth";
import { initials } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";
import { KycBadge } from "./kyc-badge";
import { isActive, navFor } from "./nav";

/**
 * Authenticated layout: guards the route, then renders sidebar + content.
 * Signed-out users go to /login?next=…; unfinished onboarding goes to /onboarding.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const session = useSession();

  if (
    session.status !== "signed_in" ||
    !session.user.onboarded ||
    session.user.staff
  ) {
    // Keep children mounted so the page segment still renders (pages show
    // nothing until a session exists). Required for instant-navigation checks.
    return (
      <ShellSkeleton>
        {/* usePathname suspends while prerendering dynamic routes. */}
        <Suspense>
          <SessionRedirect />
        </Suspense>
        {children}
      </ShellSkeleton>
    );
  }

  return (
    <TooltipProvider>
      <a
        href="#content"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SidebarProvider>
        <AppSidebar user={session.user} />
        <SidebarInset id="content" tabIndex={-1} className="outline-none">
          <TopBar user={session.user} />
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-8 sm:py-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

/** Sends signed-out users to sign in and new users to onboarding. */
function SessionRedirect() {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session.status === "signed_out") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (session.status === "signed_in" && session.user.staff) {
      router.replace("/review");
    } else if (session.status === "signed_in" && !session.user.onboarded) {
      router.replace("/onboarding");
    }
  }, [session, router, pathname]);

  return null;
}

function TopBar({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:hidden">
      <SidebarTrigger aria-label="Open navigation" />
      <Link href="/dashboard" className="text-sm font-bold tracking-tight">
        RentARide
      </Link>
      <NotificationBell user={user} className="ml-auto" />
    </header>
  );
}

function AppSidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const items = user.role ? navFor(user.role) : [];

  return (
    <Sidebar>
      <SidebarHeader className="flex-row items-start justify-between gap-2 px-4 pt-5 pb-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            href="/dashboard"
            className="text-base font-bold tracking-tight"
          >
            RentARide
          </Link>
          <p className="text-xs text-muted-foreground">
            {user.role === "owner" ? "Owner workspace" : "Driver workspace"}
          </p>
        </div>
        {/* The mobile top bar has its own bell. */}
        <NotificationBell user={user} className="-mr-1 hidden md:inline-flex" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item, pathname)}
                    render={
                      <Link
                        href={item.href}
                        onClick={() => setOpenMobile(false)}
                      />
                    }
                  >
                    <HugeiconsIcon icon={item.icon} strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 p-3">
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}

function UserMenu({ user }: { user: User }) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton size="lg" className="h-auto py-2.5">
            <Avatar className="size-9">
              <AvatarFallback className="bg-zinc-900 text-xs font-semibold text-white">
                {initials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
              <span className="w-full truncate text-sm font-medium">
                {user.firstName} {user.lastName}
              </span>
              <KycBadge status={user.kycStatus} />
            </span>
            <HugeiconsIcon
              icon={UnfoldMoreIcon}
              className="ml-auto text-muted-foreground"
            />
          </SidebarMenuButton>
        }
      />
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate font-medium text-foreground">
              {user.firstName} {user.lastName}
            </span>
            <span className="block truncate font-normal">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
            <HugeiconsIcon icon={Settings02Icon} />
            Settings
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
          >
            <HugeiconsIcon icon={Logout01Icon} />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ShellSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <span className="sr-only">Loading your workspace</span>
      <div className="hidden w-64 shrink-0 flex-col gap-3 border-r p-4 md:flex">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-6 h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex flex-1 flex-col gap-6 p-8">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
        {children}
      </div>
    </div>
  );
}
