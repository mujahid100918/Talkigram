import { Link, useLocation } from "@tanstack/react-router";
import { Plus, UserRound } from "lucide-react";
import { Avatar } from "../Avatar";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isRouteActive } from "./nav-items";

type Props = {
  profile: { username: string; avatar_url: string | null } | null;
  onCreate: () => void;
};

const slot =
  "relative flex h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring rounded-xl";

function Dot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("h-1 w-1 rounded-full bg-primary transition-opacity dark:bg-cyan", active ? "opacity-100" : "opacity-0")}
    />
  );
}

export function MobileBottomNav({ profile, onCreate }: Props) {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-0 bottom-0 z-30 border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-center justify-between px-2 py-1">
        {NAV_ITEMS.map((item) => {
          if (item.kind === "create") {
            return (
              <li key="create" className="flex flex-1 justify-center">
                <button
                  type="button"
                  onClick={onCreate}
                  aria-label="Create post"
                  className="flex h-10 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/30 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Plus className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" />
                </button>
              </li>
            );
          }

          if (item.kind === "profile") {
            const active = !!profile && pathname === `/u/${profile.username}`;
            return (
              <li key="profile" className="flex flex-1">
                {profile ? (
                  <Link
                    to="/u/$username"
                    params={{ username: profile.username }}
                    preload="intent"
                    aria-label="Profile"
                    aria-current={active ? "page" : undefined}
                    className={cn(slot, active ? "text-primary dark:text-cyan" : "text-muted-foreground")}
                  >
                    <span className={cn("rounded-full", active && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
                      <Avatar src={profile.avatar_url} name={profile.username} size={24} />
                    </span>
                    <Dot active={active} />
                  </Link>
                ) : (
                  <span className={cn(slot, "text-muted-foreground opacity-60")} aria-hidden="true">
                    <UserRound className="h-6 w-6" />
                    <Dot active={false} />
                  </span>
                )}
              </li>
            );
          }

          const active = isRouteActive(pathname, item.to);
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex flex-1">
              <Link
                to={item.to}
                preload="intent"
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(slot, active ? "text-primary dark:text-cyan" : "text-muted-foreground hover:text-foreground")}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                <Dot active={active} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
