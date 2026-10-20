import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchPosts } from "@/lib/queries";
import { StoryBar } from "@/components/Stories";
import { PostCard } from "@/components/PostCard";
import { CommentsSheet } from "@/components/Comments";
import { useOpenCreate } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/feed")({
  validateSearch: (s: Record<string, unknown>): { p?: string } => (typeof s["p"] === "string" ? { p: s["p"] } : {}),
  head: () => ({ meta: [{ title: "For You — Talkigram" }, { name: "description", content: "The latest public posts and reels from the Talkigram community." }, { property: "og:title", content: "For You — Talkigram" }, { property: "og:description", content: "The latest public posts and reels from the Talkigram community." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Feed,
});

function Feed() {
  const { userId } = useAuth();
  const { p: pinned } = Route.useSearch();
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const openCreate = useOpenCreate();
  const { data: rawPosts, isLoading, error } = useQuery({
    queryKey: ["posts", "feed", userId],
    enabled: !!userId,
    queryFn: () => fetchPosts({ privacy: "public" }),
    refetchInterval: 10_000,
    refetchOnWindowFocus: "always",
    staleTime: 0,
  });
  const { data: saves = [] } = useQuery({
    queryKey: ["saves", userId], enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      return (await supabase.from("saves").select("post_id").eq("user_id", userId)).data?.map((s) => s.post_id) ?? [];
    },
  });
  const posts = pinned && rawPosts?.some((p) => p.id === pinned)
    ? [...rawPosts.filter((p) => p.id === pinned), ...rawPosts.filter((p) => p.id !== pinned)]
    : rawPosts;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="border-b border-border px-4 py-4 font-display text-lg font-bold">For You</h1>
      <StoryBar />
      <div className="h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
      <div className="sm:pt-4">
        {error && <p role="alert" className="px-4 py-6 text-sm text-destructive">Posts could not load. Please try again.</p>}
        {isLoading && <div className="space-y-4 p-4">{[0, 1].map((i) => <div key={i} className="aspect-square animate-pulse rounded-3xl bg-surface" />)}</div>}
        {posts?.length === 0 && (
          <div className="flex flex-col items-center px-8 py-20 text-center">
            <Sparkles className="h-12 w-12 text-cyan" />
            <h2 className="mt-4 font-display text-lg font-bold">Your feed is quiet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Be the first spark — share a photo or video.</p>
            <button onClick={openCreate} className="mt-6 rounded-full bg-neon px-6 py-2.5 text-sm font-semibold text-primary-foreground glow-cyan">Create post</button>
          </div>
        )}
        {posts?.map((p) => <PostCard key={p.id} post={p} saved={saves.includes(p.id)} onComments={() => setCommentsFor(p.id)} />)}
      </div>
      <CommentsSheet postId={commentsFor} onClose={() => setCommentsFor(null)} />
    </div>
  );
}
