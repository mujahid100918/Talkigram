import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Link2, MessageCircle, Send, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { POST_SELECT, type FeedPost } from "@/lib/queries";
import { timeAgo } from "@/lib/media";
import { Button } from "./ui/button";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./SocialIdentity";

type Comment = { id: string; body: string; user_id: string; parent_id: string | null; profiles: { username: string; avatar_url: string | null } | null };

export function MediaPostDetails({ postId }: { postId: string }) {
  const { userId, profile } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [reply, setReply] = useState<Comment | null>(null);
  const [sharing, setSharing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { data: post, isPending, error } = useQuery({
    queryKey: ["media-post", userId, postId],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select(POST_SELECT).eq("id", postId).single();
      if (error) throw error;
      return data as unknown as FeedPost & { privacy: string };
    },
  });
  const { data: comments = [] } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase.from("comments").select("id, body, user_id, parent_id, profiles(username, avatar_url)").eq("post_id", postId).order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Comment[];
    },
  });
  const liked = post?.likes.some((like) => like.user_id === userId) ?? false;
  function refresh() {
    void qc.invalidateQueries({ queryKey: ["media-post"] });
    void qc.invalidateQueries({ queryKey: ["posts"] });
    void qc.invalidateQueries({ queryKey: ["comments", postId] });
  }
  const like = useMutation({ mutationFn: async () => {
    if (!userId) throw new Error("Sign in to like this post.");
    const { error } = liked ? await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId) : await supabase.from("likes").insert({ post_id: postId, user_id: userId });
    if (error) throw error;
  }, onSuccess: refresh, onError: () => toast.error("Could not update like.") });
  const comment = useMutation({ mutationFn: async () => {
    if (!userId || !text.trim()) throw new Error("Write a comment first.");
    const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: userId, body: text.trim(), parent_id: reply ? reply.parent_id ?? reply.id : null });
    if (error) throw error;
  }, onSuccess: () => { setText(""); setReply(null); refresh(); }, onError: () => toast.error("Could not post comment. Please try again.") });
  async function share(native: boolean) {
    if (!post || post.privacy !== "public" || !userId) return;
    const url = `${window.location.origin}/${post.kind === "reel" ? "reels?r=" : "feed?p="}${encodeURIComponent(postId)}`;
    try {
      if (native && navigator.share) await navigator.share({ title: "Talkigram", text: post.caption ?? "", url });
      else { await navigator.clipboard.writeText(url); toast.success("Post link copied"); }
      const { error } = await supabase.from("shares").upsert({ post_id: postId, user_id: userId }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
      if (error) throw error;
      setSharing(false); refresh();
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Could not share this post."); }
  }
  if (isPending) return <aside className="bg-card p-6 text-sm text-muted-foreground">Loading post…</aside>;
  if (error || !post) return <aside className="bg-card p-6 text-sm text-muted-foreground">This post is unavailable.</aside>;
  const author = post.profiles;
  return (
    <aside aria-label="Post details" className="flex min-h-0 flex-col border-t border-border bg-card lg:border-l lg:border-t-0">
      <div className="border-b border-border p-4">
        {author && <Link to="/u/$username" params={{ username: author.username }} className="flex items-center gap-3">
          <Avatar src={author.avatar_url} name={author.username} size={40} />
          <div className="min-w-0"><p className="flex items-center gap-1 text-sm font-semibold">{author.display_name || author.username}<VerifiedBadge userId={author.id} /></p><p className="text-xs text-muted-foreground">@{author.username} · {timeAgo(post.created_at)}</p></div>
        </Link>}
        {post.caption && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{post.caption}</p>}
      </div>
      <div className="border-b border-border px-4 py-2">
        <p className="mb-1 text-xs text-muted-foreground">{post.likes.length} likes · {comments.length} comments</p>
        <div className="flex gap-1">
          <Button variant="ghost" disabled={like.isPending} aria-pressed={liked} onClick={() => like.mutate()} className={liked ? "flex-1 text-cyan" : "flex-1"}><Heart className={liked ? "fill-current" : ""} />Like</Button>
          <Button variant="ghost" className="flex-1" onClick={() => input.current?.focus()}><MessageCircle />Comment</Button>
          <Button variant="ghost" className="flex-1" disabled={post.privacy !== "public"} title={post.privacy !== "public" ? "Private posts cannot be shared" : "Share post"} onClick={() => setSharing(!sharing)}><Share2 />Share</Button>
        </div>
        {sharing && <div className="flex flex-wrap gap-2 border-t border-border pt-2"><Button size="sm" variant="secondary" onClick={() => share(false)}><Link2 />Copy link</Button><Button size="sm" variant="secondary" onClick={() => share(true)}><Share2 />Share via…</Button></div>}
      </div>
      <div className="min-h-24 flex-1 space-y-4 overflow-y-auto p-4">
        {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {comments.map((c) => <div key={c.id} className={c.parent_id ? "ml-6 flex gap-2" : "flex gap-2"}>
          <Avatar src={c.profiles?.avatar_url} name={c.profiles?.username} size={28} />
          <div className="min-w-0 text-sm"><p className="font-semibold">{c.profiles?.username}<VerifiedBadge userId={c.user_id} /></p><p className="whitespace-pre-wrap break-words">{c.body}</p><Button variant="link" size="sm" className="h-6 p-0 text-xs" onClick={() => { setReply(c); input.current?.focus(); }}>Reply</Button></div>
        </div>)}
      </div>
      {reply && <div className="flex items-center justify-between px-4 text-xs text-muted-foreground">Replying to @{reply.profiles?.username}<Button variant="link" size="sm" onClick={() => setReply(null)}>Cancel</Button></div>}
      <form onSubmit={(e) => { e.preventDefault(); comment.mutate(); }} className="flex items-center gap-2 border-t border-border p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
        <Avatar src={profile?.avatar_url} name={profile?.username} size={28} />
        <input ref={input} aria-label="Write a comment" placeholder={reply ? "Write a reply…" : "Write a comment…"} value={text} onChange={(e) => setText(e.target.value)} className="min-w-0 flex-1 rounded-full bg-surface px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        <Button type="submit" variant="ghost" size="icon" aria-label="Post comment" disabled={!text.trim() || comment.isPending}><Send /></Button>
      </form>
    </aside>
  );
}