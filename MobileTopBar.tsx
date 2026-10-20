import { Link } from "@tanstack/react-router";
import { Bell, LogOut } from "lucide-react";
import { AppLogo } from "../AppLogo";
import { ThemeToggle } from "../ThemeToggle";
import { CountBadge } from "./CountBadge";

export function MobileTopBar({ unread, onSignOut }: { unread: number; onSignOut: () => void }) {
  return (
    <header className="glass sticky top-0 z-20 flex items-center justify-between border-b border-border px-4 py-2.5 md:hidden">
      <Link to="/feed" preload="intent" className="flex items-center gap-2" aria-label="Talkigram home">
        <AppLogo className="h-9 w-9" />
        <span className="font-display text-lg font-bold text-neon">Talkigram</span>
      </Link>
      <div className="flex items-center gap-1">
        <ThemeToggle className="p-2" />
        <Link
          to="/notifications"
          preload="intent"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative rounded-xl p-2 text-foreground transition-colors hover:bg-surface"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          <CountBadge count={unread} />
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
