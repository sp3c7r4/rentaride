import {
  Agreement01Icon,
  Car01Icon,
  CreditCardIcon,
  DashboardSquare01Icon,
  LegalHammerIcon,
  Note01Icon,
  Search01Icon,
  Settings02Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { Role } from "@/lib/types";

export type NavItem = {
  label: string;
  href: string;
  icon: IconSvgElement;
  roles: Role[];
  /** Match only the exact path (for /dashboard). */
  exact?: boolean;
};

/** Sidebar navigation. Items are added as their pages ship (see tasks.md). */
export const NAV: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: DashboardSquare01Icon,
    roles: ["driver", "owner"],
    exact: true,
  },
  {
    label: "Find a vehicle",
    href: "/browse",
    icon: Search01Icon,
    roles: ["driver"],
  },
  {
    label: "Vehicles",
    href: "/dashboard/vehicles",
    icon: Car01Icon,
    roles: ["owner"],
  },
  {
    label: "Requests",
    href: "/dashboard/requests",
    icon: Note01Icon,
    roles: ["driver", "owner"],
  },
  {
    label: "Leases",
    href: "/dashboard/leases",
    icon: Agreement01Icon,
    roles: ["driver", "owner"],
  },
  {
    label: "Payments",
    href: "/dashboard/payments",
    icon: CreditCardIcon,
    roles: ["driver"],
  },
  {
    label: "Payouts",
    href: "/dashboard/payouts",
    icon: Wallet01Icon,
    roles: ["owner"],
  },
  {
    label: "Disputes",
    href: "/dashboard/disputes",
    icon: LegalHammerIcon,
    roles: ["driver", "owner"],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings02Icon,
    roles: ["driver", "owner"],
  },
];

export const navFor = (role: Role) => NAV.filter((i) => i.roles.includes(role));

export function isActive(item: NavItem, pathname: string) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
