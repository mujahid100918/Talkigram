export function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-background"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
