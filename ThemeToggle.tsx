import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ showLabel = false, className }: { showLabel?: boolean; className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} mode`}
      className={cn(
        "flex items-center gap-4 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {showLabel && <span className="hidden lg:block">{next === "light" ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
