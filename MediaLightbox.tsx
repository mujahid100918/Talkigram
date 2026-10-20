import { useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { mediaGallery } from "@/lib/media-gallery";
import { MediaPostDetails } from "./MediaPostDetails";

type MediaLightboxProps = {
  media: { id?: string; media_url: string; media_type: string; caption?: string | null; media_items?: unknown } | null;
  onClose: () => void;
  onDoubleClick?: () => void;
};

export function MediaLightbox({ media, onClose, onDoubleClick }: MediaLightboxProps) {
  const [index, setIndex] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const reduced = useReducedMotion();
  const items = media ? mediaGallery(media) : [];
  const active = items[index] ?? items[0];
  const move = (delta: number) => setIndex((current) => (current + delta + items.length) % items.length);
  return (
    <DialogPrimitive.Root open={!!media} onOpenChange={(open) => { if (!open) { setIndex(0); onClose(); } }}>
      {media && (
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-xl motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-0 z-[71] overflow-y-auto outline-none lg:overflow-hidden"
            onClick={(event) => { if (event.target === event.currentTarget) { setIndex(0); onClose(); } }}
            onKeyDown={(event) => { if (event.target instanceof HTMLInputElement) return; if (items.length > 1 && event.key === "ArrowRight") move(1); if (items.length > 1 && event.key === "ArrowLeft") move(-1); }}
          >
            <DialogPrimitive.Title className="sr-only">{media.media_type === "video" ? "Video preview" : "Photo preview"}</DialogPrimitive.Title>
            <motion.div initial={reduced ? false : { scale: .94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .22 }} className={media.id ? "grid min-h-full grid-rows-[minmax(300px,55dvh)_minmax(360px,1fr)] lg:h-full lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-1" : "h-full"}>
              <div className="relative flex h-full min-h-0 items-center justify-center px-4 pb-6 pt-20 lg:px-16" data-media-stage
                onClick={(event) => { if (event.target === event.currentTarget) { setIndex(0); onClose(); } }}
                onTouchStart={(e) => { const point = e.touches[0]; touch.current = point ? { x: point.clientX, y: point.clientY } : null; }}
                onTouchEnd={(e) => { const point = e.changedTouches[0]; const start = touch.current; touch.current = null; if (!point || !start || items.length < 2) return; const dx = point.clientX - start.x; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(point.clientY - start.y)) move(dx < 0 ? 1 : -1); }}>
                {active && <LightboxMedia key={active.url} media={{ media_url: active.url, media_type: active.type, caption: media.caption ?? null }} {...(onDoubleClick ? { onDoubleClick } : {})} />}
                {items.length > 1 && <><Button variant="secondary" size="icon" title="Previous photo" aria-label="Previous media" onClick={() => move(-1)} className="absolute left-2 top-1/2 z-20 rounded-full"><ChevronLeft /></Button><Button variant="secondary" size="icon" title="Next photo" aria-label="Next media" onClick={() => move(1)} className="absolute right-2 top-1/2 z-20 rounded-full"><ChevronRight /></Button><span aria-live="polite" className="absolute bottom-2 rounded-full bg-surface px-3 py-1 text-xs">{index + 1} / {items.length}</span></>}
              </div>
              {media.id && <MediaPostDetails key={media.id} postId={media.id} />}
            </motion.div>
            <DialogPrimitive.Close asChild>
              <Button variant="secondary" size="icon" aria-label="Close media preview" title="Close" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] h-11 w-11 rounded-full border border-border sm:right-6">
                <X />
              </Button>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </DialogPrimitive.Root>
  );
}

function LightboxMedia({ media, onDoubleClick }: { media: NonNullable<MediaLightboxProps["media"]>; onDoubleClick?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const sizing = "relative z-10 block max-h-full max-w-full object-contain";
  return (
    <>
      {loading && !failed && <Loader2 role="status" aria-label="Loading media" className="pointer-events-none absolute h-8 w-8 animate-spin text-cyan" />}
      {failed && <p role="alert" className="absolute bottom-4 text-center text-sm text-foreground">This media could not load. Please close and try again.</p>}
      {media.media_type === "video" ? (
        <video src={media.media_url} controls autoPlay loop playsInline preload="auto" className={sizing} onLoadedData={() => setLoading(false)} onError={() => setFailed(true)} />
      ) : (
        <img src={media.media_url} alt={media.caption || "Full-size photo"} className={sizing} onLoad={() => setLoading(false)} onError={() => setFailed(true)} onDoubleClick={onDoubleClick} />
      )}
    </>
  );
}