import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Hash, Play, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPosts, POST_SELECT, type FeedPost } from "@/lib/queries";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/_authenticated/explore")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => (typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {}),
  head: () => ({ meta: [{ title: "Explore — Talkigram" }, { name: "description", content: "Discover trending posts, creators and hashtags." }, { property: "og:title", content: "Explore — Talkigram" }, { property: "og:description", content: "Discover trending posts, creators and hashtags." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Explore,
});

function Explore() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const [text, setText] = useState(q ?? "");
  useEffect(() => setText(q ?? ""), [q]);
  useEffect(() => {
    const t = setTimeout(() => navigate({ search: text ? { q: text } : {}, replace: true }), 300);
    return () => clearTimeout(t);
  }, [text, navigate]);

  const term = (q ?? "").trim();
  const { data: posts = [] } = useQuery({
    queryKey: ["posts", "explore", term],
    queryFn: async () => {
      if (!term) {
        const all = await fetchPosts({ limit: 60 });
        return all.sort((a, b) => b.likes.length - a.likes.length);
      }
      const { data } = await supabase.from("posts").select(POST_SELECT).ilike("caption", `%${term}%`).order("created_at", { ascending: false }).limit(60);
      return (data ?? []) as unknown as FeedPost[];
    },
  });
  const { data: people = [] } = useQuery({
    queryKey: ["people", term],
    queryFn: async () => {
      let qy = supabase.from("profiles").select("id, username, display_name, avatar_url").limit(12);
      if (term) qy = qy.or(`username.ilike.%${term.replace("#", "")}%,display_name.ilike.%${term.replace("#", "")}%`);
      return (await qy).data ?? [];
    },
  });
  const tags = [...new Set(posts.flatMap((p) => p.caption?.match(/#\w+/g) ?? []))].slice(0, 12);

  return (
    <div className="mx-auto max-w-4xl px-3 py-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search creators, #hashtags, captions"
          className="w-full rounded-2xl border border-input bg-surface py-3 pl-11 pr-4 text-sm outline-none focus:border-cyan focus:glow-cyan" />
      </div>

      {people.length > 0 && (
        <div className="no-scrollbar mt-5 flex gap-4 overflow-x-auto pb-1">
          {people.map((p) => (
            <Link key={p.id} to="/u/$username" params={{ username: p.username }} className="flex w-20 shrink-0 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3">
              <Avatar src={p.avatar_url} name={p.username} size={48} ring />
              <span className="w-full truncate text-center text-xs font-semibold">{p.username}</span>
            </Link>
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((t) => (
            <button key={t} onClick={() => setText(t)} className="flex items-center gap-1 rounded-full border border-cyan/40 bg-cyan/10 px-3 py-1 text-xs font-semibold text-foreground hover:border-cyan">
              <Hash className="h-3 w-3 text-cyan" />{t.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 columns-2 gap-2 sm:columns-3">
        {posts.map((p, i) => (
          <div key={p.id} className="relative mb-2 break-inside-avoid overflow-hidden rounded-2xl bg-surface">
            {p.media_type === "video"
              ? <video src={p.media_url} muted loop playsInline autoPlay className={i % 3 === 0 ? "aspect-[3/5] w-full object-cover" : "aspect-[4/5] w-full object-cover"} />
              : <img src={p.media_url} alt={p.caption ?? ""} loading="lazy" className={i % 4 === 1 ? "aspect-[3/4] w-full object-cover" : "w-full object-cover"} />}
            {p.media_type === "video" && <Play className="absolute right-2 top-2 h-4 w-4 fill-foreground" />}
          </div>
        ))}
      </div>
      {posts.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">Nothing found{term && ` for "${term}"`}.</p>}
    </div>
  );
}
