import logo from "@/assets/talkigram-icon.jpg";
import { cn } from "@/lib/utils";

export function AppLogo({ className }: { className?: string }) {
  return <img src={logo} alt="Talkigram logo" width={1024} height={1024} className={cn("shrink-0 rounded-lg object-contain", className)} />;
}