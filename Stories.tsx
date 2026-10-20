import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Send, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/media";
import { Avatar } from "./Avatar";
import { useOpenCreate } from "./AppShell";

type Story = { id: string; user_id: string; media_url: string; media_type: string; created_at: string; profiles: { username: string; avatar_url: string | null } | null };
type Group = { userId: string; username: string; avatar: string | null; items: Story[] };

const DURATION = 5000;

export function StoryBar() {
  const { userId, profile } = useAuth();
  const openCreate = useOpenCreate();
  const [active, setActive] = useState<number | null>(null);
  const { data: stories = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { data } = await supabase.from("stories").select("*, profiles(username, avatar_url)").gte("created_at", since).order("created_at");
      return (data ?? []) as unknown as Story[];
    },
  });

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const s of stories) {
      if (!map.has(s.user_id)) map.set(s.user_id, { userId: s.user_id, username: s.profiles?.username ?? "", avatar: s.profiles?.avatar_url ?? null, items: [] });
      map.get(s.user_id)!.items.push(s);
    }
    return [...map.values()].sort((a) => (a.userId === userId ? -1 : 1));
  }, [stories, userId]);
  const mineIndex = groups.findIndex((g) => g.userId === userId);
  const others = groups.map((g, i) => ({ g, i })).filter(({ g }) => g.userId !== userId);

  return (
    <>
      <nav aria-label="Stories" className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4 py-4">
        <div className="flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-1.5">
          <div className="relative">
            <button type="button" onClick={() => (mineIndex >= 0 ? setActive(mineIndex) : openCreate())}
              aria-label={mineIndex >= 0 ? "View your story" : "Add to your story"} className="rounded-full transition-transform active:scale-95">
              <Avatar src={profile?.avatar_url} name={profile?.username} size={64} ring={mineIndex >= 0} />
            </button>
            <button type="button" onClick={openCreate} aria-label="Add story"
              className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow transition-transform hover:scale-110 active:scale-95">
              <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
          </div>
          <span className="w-full truncate text-center text-xs text-muted-foreground">Your story</span>
        </div>
        {others.map(({ g, i }) => (
          <button key={g.userId} type="button" onClick={() => setActive(i)} aria-label={`View ${g.username}'s story`}
            className="flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-1.5 transition-transform active:scale-95">
            <Avatar src={g.avatar} name={g.username} size={64} ring />
            <span className="w-full truncate text-center text-xs">{g.username}</span>
          </button>
        ))}
        {others.length === 0 && (
          <p className="flex items-center self-center pb-5 text-xs text-muted-foreground">Follow people to see their stories here.</p>
        )}
      </nav>
      <AnimatePresence>
        {active !== null && groups[active] && (
          <StoryViewer groups={groups} start={active} onClose={() => setActive(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

function StoryViewer({ groups, start, onClose }: { groups: Group[]; start: number; onClose: () => void }) {
  const [g, setG] = useState(start);
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const { userId } = useAuth();
  const group = groups[g]!;
  const story = group.items[i]!;
  const raf = useRef<number>(0);

  function next() {
    if (i < group.items.length - 1) setI(i + 1);
    else if (g < groups.length - 1) { setG(g + 1); setI(0); }
    else onClose();
  }
  function prev() {
    if (i > 0) setI(i - 1);
    else if (g > 0) { setG(g - 1); setI(0); }
  }

  useEffect(() => {
    setProgress(0);
    let last = performance.now();
    let acc = 0;
    const tick = (t: number) => {
      if (!pausedRef.current) acc += t - last;
      last = t;
      const p = Math.min(acc / DURATION, 1);
      setProgress(p);
      if (p >= 1) { next(); return; }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, i]);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !userId) return;
    await supabase.from("messages").insert({ sender_id: userId, recipient_id: group.userId, body: `↩ Story reply: ${reply.trim()}`, media_url: story.media_type === "image" ? story.media_url : null });
    setReply("");
    toast.success("Reply sent");
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="relative h-full w-full max-w-md overflow-hidden sm:h-[92vh] sm:rounded-3xl">
        <AnimatePresence mode="wait">
          <motion.div key={story.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
            {story.media_type === "video"
              ? <video src={story.media_url} autoPlay playsInline muted className="h-full w-full object-cover" />
              : <img src={story.media_url} alt="" className="h-full w-full object-cover" />}
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-background/80 to-transparent p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex gap-1">
            {group.items.map((s, idx) => (
              <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-foreground/25">
                <div className="h-full bg-neon" style={{ width: `${idx < i ? 100 : idx === i ? progress * 100 : 0}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Avatar src={group.avatar} name={group.username} size={32} />
            <span className="text-sm font-semibold">{group.username}</span>
            <span className="text-xs text-muted-foreground">{timeAgo(story.created_at)}</span>
            <button onClick={onClose} className="ml-auto" aria-label="Close"><X className="h-6 w-6" /></button>
          </div>
        </div>
        <div className="absolute inset-0 top-20 bottom-20 flex"
          onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
          <button className="w-1/3" onClick={prev} aria-label="Previous" />
          <button className="w-2/3" onClick={next} aria-label="Next" />
        </div>
        {group.userId !== userId && (
          <form onSubmit={sendReply} className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-background/90 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <input value={reply} onChange={(e) => setReply(e.target.value)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
              placeholder={`Reply to ${group.username}…`} className="flex-1 rounded-full border border-foreground/30 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-cyan" />
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-neon" aria-label="Send reply"><Send className="h-4 w-4 text-primary-foreground" /></button>
          </form>
        )}
      </div>
    </motion.div>
  );
}
