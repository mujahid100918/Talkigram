import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Clapperboard, Heart, Lock, MessageCircle, Music2, Play, Repeat2, Search, Send, Share2, Volume2, VolumeX, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toggleLike } from "@/lib/queries";
import { Avatar } from "@/components/Avatar";
import { CommentsSheet } from "@/components/Comments";
import { useOpenCreate } from "@/components/AppShell";
import { Caption } from "@/components/PostCard";
import { cn } from "@/lib/utils";
import { FollowButton, VerifiedBadge } from "@/components/SocialIdentity";

export const Route = createFileRoute("/_authenticated/reels")({
  validateSearch: (s: Record<string, unknown>): { r?: string } => (typeof s["r"] === "string" ? { r: s["r"] } : {}),
  head: () => ({ meta: [{ title: "Reels — Talkigram" }, { name: "description", content: "Short vertical videos on Talkigram." }, { property: "og:title", content: "Reels — Talkigram" }, { property: "og:description", content: "Short vertical videos on Talkigram." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Reels,
});

type ReelRow = {
  id: string; user_id: string; media_url: string; media_type: string; caption: string | null; privacy: string; created_at: string;
  profiles: { id: string; username: string; avatar_url: string | null; display_name: string | null } | null;
  likes: { user_id: string }[]; comments: { count: number }[]; shares: { count: number }[]; saves: { user_id: string }[];
};

const REEL_SELECT = "id, user_id, media_url, media_type, caption, privacy, created_at, profiles!posts_user_id_fkey(id, username, avatar_url, display_name), likes(user_id), comments(count), shares(count), saves(user_id)";

function Reels() {
  const { userId } = useAuth();
  const { r } = Route.useSearch();
  const { data: reels = [], isLoading } = useQuery({
    queryKey: ["posts", "reels", userId],
    enabled: !!userId,
    queryFn: async () => {
      // RLS returns only reels this account may see (public, friends, own).
      const { data, error } = await supabase.from("posts").select(REEL_SELECT).eq("kind", "reel").eq("media_type", "video").order("created_at", { ascending: false }).limit(40);
      if (error) throw error;
      const rows = (data ?? []) as unknown as ReelRow[];
      if (r) { const i = rows.findIndex((x) => x.id === r); if (i > 0) rows.unshift(...rows.splice(i, 1)); }
      return rows;
    },
  });
  const [muted, setMuted] = useState(true);
  const [active, setActive] = useState(0);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [shareFor, setShareFor] = useState<ReelRow | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const openCreate = useOpenCreate();

  if (!isLoading && reels.length === 0) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center px-8 text-center">
        <Clapperboard className="h-12 w-12 text-cyan" />
        <h2 className="mt-4 font-display text-lg font-bold">No reels yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">Upload a short vertical video to start the loop.</p>
        <button onClick={openCreate} className="mt-6 rounded-full bg-neon px-6 py-2.5 text-sm font-semibold text-primary-foreground">Create reel</button>
      </div>
    );
  }

  function goTo(i: number) {
    const el = feedRef.current?.querySelectorAll<HTMLElement>("[data-reel]")[i];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div ref={feedRef} tabIndex={-1} aria-label="Reels feed"
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "ArrowDown") { e.preventDefault(); goTo(Math.min(active + 1, reels.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); goTo(Math.max(active - 1, 0)); }
      }}
      className="no-scrollbar h-[calc(100dvh-4rem)] snap-y snap-mandatory overflow-y-scroll overscroll-contain scroll-smooth bg-black outline-none md:h-[100dvh]">
      {reels.map((reel, i) => (
        <Reel key={reel.id} reel={reel} index={i} active={active} onActive={setActive} muted={muted} setMuted={setMuted}
          onEnded={() => { if (autoScroll && i < reels.length - 1) goTo(i + 1); }}
          autoScroll={autoScroll} setAutoScroll={setAutoScroll}
          onComments={() => setCommentsFor(reel.id)} onShare={() => setShareFor(reel)} />
      ))}
      <CommentsSheet postId={commentsFor} onClose={() => setCommentsFor(null)} />
      <ShareSheet reel={shareFor} onClose={() => setShareFor(null)} />
    </div>
  );
}

function Reel({ reel, index, active, onActive, muted, setMuted, onComments, onShare, onEnded, autoScroll, setAutoScroll }: {
  reel: ReelRow; index: number; active: number; onActive: (i: number) => void; muted: boolean; setMuted: (m: boolean) => void; onComments: () => void; onShare: () => void;
  onEnded: () => void; autoScroll: boolean; setAutoScroll: (v: boolean) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const section = useRef<HTMLElement>(null);
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [liked, setLiked] = useState(reel.likes.some((l) => l.user_id === userId));
  const [count, setCount] = useState(reel.likes.length);
  const [saved, setSaved] = useState(reel.saves.some((s) => s.user_id === userId));
  const [burst, setBurst] = useState(false);
  const [paused, setPaused] = useState(false);
  // Only attach video sources near the visible reel to save mobile data.
  const near = Math.abs(index - active) <= 1;
  const isActive = index === active;

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) onActive(index); }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [index, onActive]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (isActive && !paused) v.play().catch(() => {});
    else v.pause();
    if (!isActive) { setPaused(false); v.currentTime = 0; }
  }, [isActive, paused, near]);

  async function like(force?: boolean) {
    if (!userId) return;
    if (force) { setBurst(true); setTimeout(() => setBurst(false), 700); if (liked) return; }
    const next = !liked;
    setLiked(next); setCount((c) => c + (next ? 1 : -1));
    await toggleLike(reel.id, userId, !next);
    qc.invalidateQueries({ queryKey: ["posts"] });
  }
  async function save() {
    if (!userId) return;
    const next = !saved;
    setSaved(next);
    const { error } = next
      ? await supabase.from("saves").insert({ post_id: reel.id, user_id: userId })
      : await supabase.from("saves").delete().eq("post_id", reel.id).eq("user_id", userId);
    if (error) { setSaved(!next); toast.error("Could not update saved reels"); return; }
    toast.success(next ? "Saved" : "Removed from saved");
    qc.invalidateQueries({ queryKey: ["saves"] });
  }

  const p = reel.profiles;
  const audioTitle = `Original audio · ${p?.display_name || p?.username || "Talkigram creator"}`;
  return (
    <section ref={section} data-reel aria-label={`Reel by ${p?.username ?? "creator"}`}
      className="relative flex h-full snap-start snap-always items-center justify-center bg-black text-white">
      <div className="relative h-full w-full max-w-md overflow-hidden md:my-4 md:h-[calc(100%-2rem)] md:rounded-3xl">
        <video ref={ref} src={near ? reel.media_url : undefined} preload={isActive ? "auto" : "metadata"} loop={!autoScroll} playsInline muted={muted}
          onEnded={onEnded}
          onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
          onClick={() => setPaused((x) => !x)} onDoubleClick={() => like(true)} className="h-full w-full object-cover" />
        <AnimatePresence>
          {paused && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-black/50 p-5 backdrop-blur"><Play className="h-10 w-10 fill-white" /></span>
            </motion.div>
          )}
          {burst && (
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.2, opacity: 1 }} exit={{ scale: 1.6, opacity: 0 }} className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Heart className="h-28 w-28 fill-primary text-primary drop-shadow-[0_0_24px_var(--brand)]" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-4">
          <h2 className="font-display text-lg font-bold drop-shadow">Reels</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setAutoScroll(!autoScroll)} aria-pressed={autoScroll}
              className={cn("rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur transition", autoScroll ? "bg-primary text-primary-foreground" : "bg-black/40 text-white")}>
              Auto-scroll {autoScroll ? "on" : "off"}
            </button>
            <button type="button" onClick={() => setMuted(!muted)} className="rounded-full bg-black/40 p-2 backdrop-blur" aria-label={muted ? "Unmute" : "Mute"}>
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="absolute bottom-8 right-3 z-10 flex flex-col items-center gap-5">
          <Action label={liked ? "Unlike" : "Like"} pressed={liked} count={count} onClick={() => like()}>
            <Heart className={cn("h-7 w-7 transition-all", liked && "scale-110 fill-primary text-primary")} />
          </Action>
          <Action label="Comments" count={reel.comments[0]?.count ?? 0} onClick={onComments}><MessageCircle className="h-7 w-7" /></Action>
          {reel.privacy === "public"
            ? <Action label="Share" count={reel.shares[0]?.count ?? 0} onClick={onShare}><Share2 className="h-7 w-7" /></Action>
            : <span className="rounded-full p-2" title="Private reels can't be shared"><Lock className="h-6 w-6 text-white/60" /></span>}
          <Action label={saved ? "Remove from saved" : "Save"} pressed={saved} onClick={save}>
            <Bookmark className={cn("h-7 w-7 transition-all", saved && "fill-primary text-primary")} />
          </Action>
          <span className={cn("mt-1 flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border-2 border-white/80", isActive && !paused && "animate-[spin_4s_linear_infinite]")} aria-hidden>
            <Avatar src={p?.avatar_url} name={p?.username} size={32} />
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pb-6 pr-20">
          {p && (
            <div className="flex items-center gap-2">
              <Link to="/u/$username" params={{ username: p.username }} className="flex min-w-0 items-center gap-2">
                <Avatar src={p.avatar_url} name={p.username} size={36} ring />
                <span className="inline-flex min-w-0 items-center gap-1 text-sm font-semibold drop-shadow"><span className="truncate">{p.display_name || p.username}</span><VerifiedBadge userId={p.id} /></span>
              </Link>
              <FollowButton targetId={p.id} onMedia />
            </div>
          )}
          {reel.caption && (
            <button type="button" onClick={() => setExpanded((x) => !x)} className={cn("mt-2 block text-left text-sm text-white/95 drop-shadow", !expanded && "line-clamp-2")}>
              <Caption text={reel.caption} />
            </button>
          )}
          <p className="mt-2 flex items-center gap-2 text-xs text-white/90">
            <Music2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="overflow-hidden whitespace-nowrap">
              <span className={cn("inline-block", isActive && !paused && "animate-[marquee_8s_linear_infinite]")}>{audioTitle}</span>
            </span>
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/20" aria-hidden>
          <div className="h-full bg-primary transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </section>
  );
}

function Action({ label, count, onClick, children, pressed }: { label: string; count?: number; onClick: () => void; children: React.ReactNode; pressed?: boolean }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.8 }} onClick={onClick} className="flex flex-col items-center gap-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]" aria-label={label} aria-pressed={pressed}>
      {children}
      {count !== undefined && <span className="text-xs font-semibold tabular-nums">{count.toLocaleString()}</span>}
    </motion.button>
  );
}

function ShareSheet({ reel, onClose }: { reel: ReelRow | null; onClose: () => void }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: people = [] } = useQuery({
    queryKey: ["share-people", q],
    enabled: !!reel && !!userId,
    queryFn: async () => {
      let query = supabase.from("profiles").select("id, username, display_name, avatar_url").neq("id", userId!).limit(30);
      if (q.trim()) query = query.ilike("username", `%${q.trim()}%`);
      return (await query).data ?? [];
    },
  });

  async function recordShare() {
    if (!reel || !userId) return;
    await supabase.from("shares").upsert({ post_id: reel.id, user_id: userId }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
  }
  async function shareToFeed() {
    if (!reel || !userId) return;
    setBusy(true);
    const author = reel.profiles?.username ?? "creator";
    const { error } = await supabase.from("posts").insert({
      user_id: userId, kind: "post", media_type: "video", media_url: reel.media_url, privacy: "public",
      caption: `Shared a reel from @${author}${reel.caption ? ` — ${reel.caption}` : ""}`,
    });
    if (!error) await recordShare();
    setBusy(false);
    if (error) { toast.error("Could not share to feed"); return; }
    toast.success("Shared to your feed");
    qc.invalidateQueries({ queryKey: ["posts"] });
    onClose();
  }
  async function sendTo(id: string, name: string) {
    if (!reel || !userId) return;
    setBusy(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: userId, recipient_id: id, media_url: reel.media_url, media_type: "video",
      body: `🎬 Reel from @${reel.profiles?.username ?? "creator"}${reel.caption ? `: ${reel.caption}` : ""}`,
    });
    if (!error) await recordShare();
    setBusy(false);
    if (error) { toast.error("Could not send reel"); return; }
    toast.success(`Sent to ${name}`);
    qc.invalidateQueries({ queryKey: ["posts"] });
  }

  return (
    <AnimatePresence>
      {reel && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 sm:items-center" onClick={onClose}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} onClick={(e) => e.stopPropagation()}
            className="flex max-h-[75vh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-card sm:rounded-3xl" role="dialog" aria-label="Share reel">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="font-display text-sm font-bold">Share reel</span>
              <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <button disabled={busy} onClick={shareToFeed} className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-surface p-3 text-left text-sm font-semibold disabled:opacity-50">
              <span className="rounded-full bg-neon p-2"><Repeat2 className="h-4 w-4 text-primary-foreground" /></span> Share to your feed
            </button>
            <p className="px-5 pb-2 pt-4 text-xs font-semibold uppercase text-muted-foreground">Send in Messenger</p>
            <div className="mx-4 flex items-center gap-2 rounded-full bg-surface px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" className="flex-1 bg-transparent text-sm outline-none" />
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {people.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No people found.</p>}
              {people.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <Avatar src={u.avatar_url} name={u.username} size={36} />
                  <span className="flex-1 text-sm font-semibold">{u.display_name || u.username}</span>
                  <button disabled={busy} onClick={() => sendTo(u.id, u.display_name || u.username)} className="flex items-center gap-1 rounded-full bg-neon px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50" aria-label={`Send to ${u.username}`}>
                    <Send className="h-3.5 w-3.5" /> Send
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
