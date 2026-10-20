import { Link, useLocation } from "@tanstack/react-router";
import { Bell, LogOut, Plus, UserRound } from "lucide-react";
import { AppLogo } from "../AppLogo";
import { Avatar } from "../Avatar";
import { ThemeToggle } from "../ThemeToggle";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isRouteActive } from "./nav-items";
import { CountBadge } from "./CountBadge";

type Props = {
  profile: { username: string; avatar_url: string | null } | null;
  unread: number;
  onCreate: () => void;
  onSignOut: () => void;
};

const itemBase =
  "group relative flex items-center gap-4 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:justify-center lg:justify-start";
const itemIdle = "text-muted-foreground hover:bg-surface hover:text-foreground";
const itemActive = "bg-primary/10 text-primary font-semibold dark:bg-primary/15 dark:text-cyan";

function ActiveBar({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute left-0 top-1/2 h-6 w-1 -translate-x-3 -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
        active ? "opacity-100" : "opacity-0",
      )}
    />
  );
}

export function DesktopSidebar({ profile, unread, onCreate, onSignOut }: Props) {
  const { pathname } = useLocation();
  const profilePath = profile ? `/u/${profile.username}` : null;

  return (
    <aside
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col border-r border-border bg-background px-3 py-6 md:flex lg:w-64"
    >
      <Link
        to="/feed"
        preload="intent"
        className="mb-8 flex items-center gap-3 rounded-xl px-2 md:justify-center lg:justify-start"
        aria-label="Talkigram home"
      >
        <AppLogo className="h-10 w-10" />
        <span className="hidden font-display text-xl font-bold text-neon lg:block">Talkigram</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          if (item.kind === "create") {
            return (
              <button
                key="create"
                type="button"
                onClick={onCreate}
                aria-label="Create post"
                className={cn(itemBase, "my-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90")}
              >
                <Plus className="h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                <span className="hidden lg:block">Create</span>
              </button>
            );
          }

          if (item.kind === "profile") {
            const active = !!profilePath && pathname === profilePath;
            return profile ? (
              <Link
                key="profile"
                to="/u/$username"
                params={{ username: profile.username }}
                preload="intent"
                aria-current={active ? "page" : undefined}
                aria-label="Profile"
                className={cn(itemBase, active ? itemActive : itemIdle)}
              >
                <ActiveBar active={active} />
                <span className={cn("rounded-full", active && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
                  <Avatar src={profile.avatar_url} name={profile.username} size={22} />
                </span>
                <span className="hidden lg:block">Profile</span>
              </Link>
            ) : (
              <span key="profile" className={cn(itemBase, itemIdle, "opacity-60")} aria-hidden="true">
                <UserRound className="h-5 w-5 shrink-0" />
                <span className="hidden lg:block">Profile</span>
              </span>
            );
          }

          const active = isRouteActive(pathname, item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              preload="intent"
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={cn(itemBase, active ? itemActive : itemIdle)}
            >
              <ActiveBar active={active} />
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          );
        })}

        <Link
          to="/notifications"
          preload="intent"
          aria-current={isRouteActive(pathname, "/notifications") ? "page" : undefined}
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className={cn(itemBase, isRouteActive(pathname, "/notifications") ? itemActive : itemIdle)}
        >
          <ActiveBar active={isRouteActive(pathname, "/notifications")} />
          <span className="relative">
            <Bell className="h-5 w-5 shrink-0" aria-hidden="true" />
            <CountBadge count={unread} />
          </span>
          <span className="hidden lg:block">Notifications</span>
        </Link>
      </nav>

      <div className="flex flex-col gap-1 border-t border-border pt-4">
        <ThemeToggle showLabel className="px-3 py-2.5 md:justify-center lg:justify-start" />
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          className={cn(itemBase, itemIdle)}
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="hidden lg:block">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
