import { Clapperboard, Home, MessageCircle, Search, type LucideIcon } from "lucide-react";

export type RouteNavItem = {
  kind: "route";
  to: "/feed" | "/explore" | "/reels" | "/messages";
  label: string;
  icon: LucideIcon;
};

export type NavItem = RouteNavItem | { kind: "create"; label: string } | { kind: "profile"; label: string };

export const NAV_ITEMS: NavItem[] = [
  { kind: "route", to: "/feed", label: "Home", icon: Home },
  { kind: "route", to: "/explore", label: "Search", icon: Search },
  { kind: "create", label: "Create" },
  { kind: "route", to: "/reels", label: "Reels", icon: Clapperboard },
  { kind: "route", to: "/messages", label: "Messages", icon: MessageCircle },
  { kind: "profile", label: "Profile" },
];

export function isRouteActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}
