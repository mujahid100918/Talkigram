import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { CornerDownRight, Send, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/media";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./SocialIdentity";

type C = { id: string; user_id: string; body: string; created_at: string; parent_id: string | null; profiles: { username: string; display_name: string | null; avatar_url: string | null } | null };

export function CommentsSheet({ postId, onClose }: { postId: string | null; onClose: () => void }) {
  const { userId, profile } = useAuth();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<C | null>(null);
  const qc = useQueryClient();
  const { data: comments = [] } = useQuery({
    queryKey: ["comments", postId],
    enabled: !!postId,
    queryFn: async () => {
      if (!postId) return [];
      const { data } = await supabase.from("comments").select("*, profiles(username, display_name, avatar_url)").eq("post_id", postId).order("created_at");
      return (data ?? []) as unknown as C[];
    },
  });
  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !userId || !postId) return;
    const body = text.trim();
    const parent = replyTo ? (replyTo.parent_id ?? replyTo.id) : null;
    setText(""); setReplyTo(null);
    const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: userId, body, parent_id: parent });
    if (error) toast.error("Could not post comment");
    qc.invalidateQueries({ queryKey: ["comments", postId] });
    qc.invalidateQueries({ queryKey: ["posts"] });
  }

  const Row = ({ c, small }: { c: C; small?: boolean }) => (
    <div className="flex gap-3">
      <Avatar src={c.profiles?.avatar_url} name={c.profiles?.username} size={small ? 26 : 32} />
      <div className="text-sm">
        <span className="inline-flex items-center gap-1 font-semibold">{c.profiles?.display_name || c.profiles?.username}<VerifiedBadge userId={c.user_id} /></span> <span className="text-foreground/90">{c.body}</span>
        <p className="flex gap-3 text-xs text-muted-foreground">{timeAgo(c.created_at)}
          <button type="button" onClick={() => { setReplyTo(c); setText(`@${c.profiles?.username ?? ""} `); }} className="font-semibold hover:text-foreground">Reply</button>
        </p>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {postId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 sm:items-center" onClick={onClose}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }}
            onClick={(e) => e.stopPropagation()} className="flex h-[70vh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-card sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="font-display text-sm font-bold">Comments</span>
              <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {roots.length === 0 && <p className="pt-10 text-center text-sm text-muted-foreground">No comments yet. Start the conversation.</p>}
              {roots.map((c) => (
                <div key={c.id} className="space-y-3">
                  <Row c={c} />
                  {repliesOf(c.id).map((r) => <div key={r.id} className="ml-10"><Row c={r} small /></div>)}
                </div>
              ))}
            </div>
            {replyTo && (
              <div className="flex items-center gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
                <CornerDownRight className="h-3.5 w-3.5" /> Replying to {replyTo.profiles?.username}
                <button onClick={() => { setReplyTo(null); setText(""); }} className="ml-auto" aria-label="Cancel reply"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
            <form onSubmit={send} className="flex items-center gap-3 border-t border-border p-3">
              <Avatar src={profile?.avatar_url} name={profile?.username} size={32} />
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={replyTo ? "Write a reply…" : "Add a comment…"} className="flex-1 bg-transparent text-sm outline-none" />
              <button disabled={!text.trim()} className="text-cyan disabled:opacity-30" aria-label="Post comment"><Send className="h-5 w-5" /></button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
