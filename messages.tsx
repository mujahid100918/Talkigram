import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ImagePlus, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { timeAgo, uploadMedia } from "@/lib/media";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: (s: Record<string, unknown>): { to?: string } => (typeof s["to"] === "string" ? { to: s["to"] } : {}),
  head: () => ({ meta: [{ title: "Messages — Talkigram" }, { name: "description", content: "Real-time direct messages." }, { property: "og:title", content: "Messages — Talkigram" }, { property: "og:description", content: "Real-time direct messages." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Messages,
});

type Msg = { id: string; sender_id: string; recipient_id: string; body: string | null; media_url: string | null; created_at: string };

function useOnline(userId: string | null) {
  const [online, setOnline] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel("online", { config: { presence: { key: userId } } });
    ch.on("presence", { event: "sync" }, () => setOnline(new Set(Object.keys(ch.presenceState()))))
      .subscribe((s) => { if (s === "SUBSCRIBED") ch.track({ at: Date.now() }); });
    return () => { supabase.removeChannel(ch); };
  }, [userId]);
  return online;
}

function Messages() {
  const { userId } = useAuth();
  const { to } = Route.useSearch();
  const navigate = useNavigate({ from: "/messages" });
  const qc = useQueryClient();
  const online = useOnline(userId);

  const { data: people = [] } = useQuery({
    queryKey: ["people-all"],
    queryFn: async () => (await supabase.from("profiles").select("id, username, display_name, avatar_url").neq("id", userId!).limit(100)).data ?? [],
    enabled: !!userId,
  });
  const { data: all = [] } = useQuery({
    queryKey: ["messages", userId],
    enabled: !!userId,
    queryFn: async () => ((await supabase.from("messages").select("*").order("created_at").limit(1000)).data ?? []) as Msg[],
  });

  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel("dm-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Msg;
        if (m.sender_id !== userId && m.recipient_id !== userId) return;
        qc.setQueryData<Msg[]>(["messages", userId], (old = []) => (old.some((o) => o.id === m.id) ? old : [...old, m]));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc]);

  const contacts = useMemo(() => {
    const last = new Map<string, Msg>();
    for (const m of all) last.set(m.sender_id === userId ? m.recipient_id : m.sender_id, m);
    return people
      .map((p) => ({ ...p, last: last.get(p.id) }))
      .sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));
  }, [people, all, userId]);

  const peer = people.find((p) => p.id === to);
  const thread = all.filter((m) => to && ((m.sender_id === userId && m.recipient_id === to) || (m.sender_id === to && m.recipient_id === userId)));

  return (
    <div className="flex h-[100dvh] pb-16 md:pb-0">
      <aside className={cn("w-full flex-col border-r border-border md:flex md:w-80", to ? "hidden" : "flex")}>
        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <Link to="/feed" className="md:hidden" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="font-display text-lg font-bold">Messages</h1>
        </div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto border-b border-border px-4 py-3">
          {contacts.filter((c) => online.has(c.id)).map((c) => (
            <button key={c.id} onClick={() => navigate({ search: { to: c.id } })} className="flex w-14 shrink-0 flex-col items-center gap-1">
              <Avatar src={c.avatar_url} name={c.username} size={48} online />
              <span className="w-full truncate text-[10px]">{c.username}</span>
            </button>
          ))}
          {contacts.every((c) => !online.has(c.id)) && <p className="text-xs text-muted-foreground">No one else is online right now.</p>}
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.map((c) => (
            <button key={c.id} onClick={() => navigate({ search: { to: c.id } })}
              className={cn("flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface", to === c.id && "bg-surface")}>
              <Avatar src={c.avatar_url} name={c.username} size={48} online={online.has(c.id)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.display_name || c.username}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.last ? `${c.last.sender_id === userId ? "You: " : ""}${c.last.body || "📷 Photo"} · ${timeAgo(c.last.created_at)}` : `@${c.username}`}
                </p>
              </div>
            </button>
          ))}
          {contacts.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No other users yet. Invite a friend!</p>}
        </div>
      </aside>
      <section className={cn("flex-1 flex-col", to ? "flex" : "hidden md:flex")}>
        {peer ? (
          <ChatWindow peer={peer} thread={thread} online={online.has(peer.id)} onBack={() => navigate({ search: {} })} />
        ) : (
          <div className="grid-bg flex flex-1 items-center justify-center text-sm text-muted-foreground">Pick a conversation</div>
        )}
      </section>
    </div>
  );
}

function ChatWindow({ peer, thread, online, onBack }: {
  peer: { id: string; username: string; display_name: string | null; avatar_url: string | null }; thread: Msg[]; online: boolean; onBack: () => void;
}) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [thread.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if ((!text.trim() && !file) || !userId) return;
    setBusy(true);
    try {
      const media_url = file ? (await uploadMedia(userId, file)).url : null;
      const { data, error } = await supabase.from("messages").insert({ sender_id: userId, recipient_id: peer.id, body: text.trim(), media_url }).select().single();
      if (error) throw error;
      qc.setQueryData<Msg[]>(["messages", userId], (old = []) => (old.some((o) => o.id === data.id) ? old : [...old, data as Msg]));
      setText(""); setFile(null); setPreview(null);
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <>
      <header className="glass flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="md:hidden" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
        <Link to="/u/$username" params={{ username: peer.username }} className="flex items-center gap-3">
          <Avatar src={peer.avatar_url} name={peer.username} size={38} online={online} />
          <div>
            <p className="text-sm font-semibold">{peer.display_name || peer.username}</p>
            <p className={cn("text-xs", online ? "text-online" : "text-muted-foreground")}>{online ? "Online" : "Offline"}</p>
          </div>
        </Link>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {thread.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] overflow-hidden rounded-3xl text-sm", mine ? "rounded-br-md bg-neon text-primary-foreground" : "rounded-bl-md bg-surface")}>
                {m.media_url && ((m as Msg & { media_type?: string | null }).media_type === "video" || /\.(mp4|webm|mov)/i.test(m.media_url)
                  ? <video src={m.media_url} controls className="max-h-64 w-full" />
                  : <img src={m.media_url} alt="" className="max-h-64 w-full object-cover" />)}
                {m.body && <p className="px-4 py-2">{m.body}</p>}
              </div>
            </motion.div>
          );
        })}
        {thread.length === 0 && <p className="pt-16 text-center text-sm text-muted-foreground">Say hi to {peer.username} 👋</p>}
        <div ref={endRef} />
      </div>
      {preview && (
        <div className="relative mx-4 mb-2 w-24 overflow-hidden rounded-xl border border-cyan">
          {file?.type.startsWith("video") ? <video src={preview} className="h-24 w-24 object-cover" /> : <img src={preview} alt="" className="h-24 w-24 object-cover" />}
          <button onClick={() => { setFile(null); setPreview(null); }} className="glass absolute right-1 top-1 rounded-full p-0.5" aria-label="Remove"><X className="h-3 w-3" /></button>
        </div>
      )}
      <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
        <button type="button" onClick={() => fileRef.current?.click()} className="p-2 text-cyan" aria-label="Attach media"><ImagePlus className="h-5 w-5" /></button>
        <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); } e.target.value = ""; }} />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" className="flex-1 rounded-full border border-input bg-surface px-4 py-2.5 text-sm outline-none focus:border-cyan" />
        <button disabled={busy || (!text.trim() && !file)} className="flex h-10 w-10 items-center justify-center rounded-full bg-neon disabled:opacity-40" aria-label="Send">
          {busy ? <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" /> : <Send className="h-4 w-4 text-primary-foreground" />}
        </button>
      </form>
    </>
  );
}
