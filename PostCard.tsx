import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Heart, MessageCircle, Send, Volume2, VolumeX } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/media";
import { toggleLike, type FeedPost } from "@/lib/queries";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";
import { FollowButton, VerifiedBadge } from "./SocialIdentity";
import { MediaLightbox } from "./MediaLightbox";

export async function sharePost(postId: string, userId: string | null, caption?: string | null) {
  const url = `${window.location.origin}/feed?p=${postId}`;
  try {
    if (navigator.share) await navigator.share({ title: "Talkigram", text: caption ?? "Check this out on Talkigram", url });
    else { await navigator.clipboard.writeText(url); toast.success("Link copied to clipboard"); }
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    toast.error("Could not share this post");
    return;
  }
  if (userId) await supabase.from("shares").upsert({ post_id: postId, user_id: userId }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
}

export function PostCard({ post, saved, onComments }: { post: FeedPost; saved: boolean; onComments: () => void }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [liked, setLiked] = useState(post.likes.some((l) => l.user_id === userId));
  const [count, setCount] = useState(post.likes.length);
  const [isSaved, setIsSaved] = useState(saved);
  const [burst, setBurst] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => { setLiked(post.likes.some((l) => l.user_id === userId)); setCount(post.likes.length); }, [post.likes, userId]);
  useEffect(() => { setIsSaved(saved); }, [saved]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (previewOpen) { video.pause(); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) void video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.6 });
    io.observe(video);
    return () => io.disconnect();
  }, [previewOpen]);

  function pop() { setBurst(true); setTimeout(() => setBurst(false), 700); }

  async function like(force?: boolean) {
    if (!userId) return;
    if (force && liked) { pop(); return; }
    const next = !liked;
    setLiked(next); setCount((c) => c + (next ? 1 : -1));
    if (next) pop();
    try { await toggleLike(post.id, userId, !next); }
    catch { setLiked(!next); setCount((c) => c + (next ? -1 : 1)); toast.error("Could not update like"); }
  }

  async function save() {
    if (!userId) return;
    const next = !isSaved;
    setIsSaved(next);
    const { error } = next
      ? await supabase.from("saves").insert({ post_id: post.id, user_id: userId })
      : await supabase.from("saves").delete().eq("post_id", post.id).eq("user_id", userId);
    if (error) { setIsSaved(!next); toast.error("Could not update saved posts"); return; }
    qc.invalidateQueries({ queryKey: ["saves"] });
  }

  const p = post.profiles;
  const isVideo = post.media_type === "video";
  const commentCount = post.comments[0]?.count ?? 0;
  const longCaption = (post.caption?.length ?? 0) > 140;

  return (
    <article className="border-b border-border pb-4 sm:mb-6 sm:overflow-hidden sm:rounded-3xl sm:border sm:bg-card sm:shadow-sm">
      <header className="flex items-center gap-3 px-4 py-3">
        {p && <Link to="/u/$username" params={{ username: p.username }} aria-label={`${p.username}'s profile`}><Avatar src={p.avatar_url} name={p.username} size={38} ring /></Link>}
        <div className="min-w-0 flex-1 leading-tight">
          {p && (
            <Link to="/u/$username" params={{ username: p.username }} className="inline-flex max-w-full items-center gap-1 text-sm font-semibold hover:underline">
              <span className="truncate">{p.display_name || p.username}</span><VerifiedBadge userId={p.id} />
            </Link>
          )}
          <p className="text-xs text-muted-foreground">
            @{p?.username} · <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
          </p>
        </div>
        <FollowButton targetId={post.user_id} compact />
      </header>

      <div className="relative select-none bg-surface" onDoubleClick={() => like(true)}>
        <button type="button" onClick={() => setPreviewOpen(true)} aria-label={isVideo ? "Open video preview" : "Open photo preview"} className="block w-full overflow-hidden">
          {isVideo
            ? <video ref={videoRef} src={post.media_url} className="max-h-[75vh] w-full object-cover" muted={muted} loop playsInline preload="metadata" />
            : <img src={post.media_url} alt={post.caption ?? `Post by ${p?.username ?? "a Talkigram user"}`} className="max-h-[75vh] w-full object-cover" loading="lazy" />}
        </button>
        {isVideo && (
          <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute video" : "Mute video"}
            className="absolute bottom-3 right-3 rounded-full bg-black/55 p-2 text-white backdrop-blur transition hover:bg-black/70">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}
        <AnimatePresence>
          {burst && (
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.2, opacity: 1 }} exit={{ scale: 1.6, opacity: 0 }} transition={{ type: "spring", damping: 10 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Heart className="h-28 w-28 fill-primary text-primary drop-shadow-[0_0_24px_var(--brand)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <MediaLightbox media={previewOpen ? post : null} onClose={() => setPreviewOpen(false)} onDoubleClick={() => like(true)} />

      <div className="flex items-center gap-1 px-2 pt-2">
        <ActionButton label={liked ? "Unlike" : "Like"} pressed={liked} onClick={() => like()}>
          <Heart className={cn("h-6 w-6 transition-all", liked && "scale-110 fill-primary text-primary")} />
        </ActionButton>
        <ActionButton label="Comment" onClick={onComments}><MessageCircle className="h-6 w-6" /></ActionButton>
        <ActionButton label="Share" onClick={() => sharePost(post.id, userId, post.caption)}><Send className="h-6 w-6" /></ActionButton>
        <ActionButton label={isSaved ? "Remove from saved" : "Save"} pressed={isSaved} onClick={save} className="ml-auto">
          <Bookmark className={cn("h-6 w-6 transition-all", isSaved && "fill-primary text-primary")} />
        </ActionButton>
      </div>

      <div className="space-y-1 px-4 pt-1 text-sm">
        <p className="font-semibold tabular-nums">
          {count.toLocaleString()} {count === 1 ? "like" : "likes"}
        </p>
        {post.caption && (
          <p className={cn("text-pretty", !expanded && longCaption && "line-clamp-2")}>
            <span className="font-semibold">{p?.username}</span> <Caption text={post.caption} />
          </p>
        )}
        {longCaption && !expanded && <button onClick={() => setExpanded(true)} className="text-muted-foreground">more</button>}
        {commentCount > 0 && (
          <button onClick={onComments} className="block text-muted-foreground hover:text-foreground">
            View all {commentCount} {commentCount === 1 ? "comment" : "comments"}
          </button>
        )}
      </div>
    </article>
  );
}

function ActionButton({ label, pressed, onClick, children, className }: { label: string; pressed?: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.8 }} onClick={onClick} aria-label={label} aria-pressed={pressed}
      className={cn("rounded-full p-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
      {children}
    </motion.button>
  );
}

export function Caption({ text }: { text: string }) {
  return <>{text.split(/(#\w+)/g).map((part, i) =>
    part.startsWith("#") ? <Link key={i} to="/explore" search={{ q: part }} className="font-medium text-cyan hover:underline">{part}</Link> : part)}</>;
}
