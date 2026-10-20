import { cn } from "@/lib/utils";

export function Avatar({
  src, name, size = 40, ring, online, className,
}: { src?: string | null | undefined; name?: string | null | undefined; size?: number; ring?: boolean | undefined; online?: boolean | undefined; className?: string | undefined }) {
  const inner = (
    <div
      className="flex items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-xs font-bold text-foreground"
      style={{ width: size, height: size }}
    >
      {src ? <img src={src} alt={name ?? ""} className="h-full w-full object-cover" /> : (name?.[0] ?? "?").toUpperCase()}
    </div>
  );
  return (
    <div className={cn("relative shrink-0", className)}>
      {ring ? <div className="ring-neon"><div className="rounded-full bg-background p-[2px]">{inner}</div></div> : inner}
      {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-online" />}
    </div>
  );
}
