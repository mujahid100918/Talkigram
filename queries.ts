import { supabase } from "@/integrations/supabase/client";

export const POST_SELECT = "*, profiles!posts_user_id_fkey(id, username, avatar_url, display_name), likes(user_id), comments(count)";

export type FeedPost = {
  id: string; user_id: string; media_url: string; media_type: string; kind: string; caption: string | null; created_at: string;
  profiles: { id: string; username: string; avatar_url: string | null; display_name: string | null } | null;
  likes: { user_id: string }[];
  comments: { count: number }[];
  media_items?: unknown;
};

export async function fetchPosts(opts: { kind?: string; userId?: string; limit?: number; privacy?: "public" } = {}) {
  let q = supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: false }).limit(opts.limit ?? 50);
  if (opts.kind) q = q.eq("kind", opts.kind);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  if (opts.privacy) q = q.eq("privacy", opts.privacy);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as FeedPost[];
}

export async function toggleLike(postId: string, userId: string, liked: boolean) {
  if (liked) await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
  else await supabase.from("likes").insert({ post_id: postId, user_id: userId });
}
