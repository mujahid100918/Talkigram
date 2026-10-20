import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Trash2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/media";
import {
  useNotifications, markNotificationRead, markAllNotificationsRead, dismissNotification,
  notificationText, type AppNotification, type NotifFilter,
} from "@/lib/notifications";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/SocialIdentity";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Talkigram" },
      { name: "description", content: "Your likes, comments, follows, friend requests and mentions on Talkigram." },
      { property: "og:title", content: "Notifications — Talkigram" },
      { property: "og:description", content: "Your latest activity on Talkigram." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

const TABS: { key: NotifFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "friends", label: "Friend requests" },
  { key: "followers", label: "Followers" },
  { key: "shares", label: "Shares" },
  { key: "mentions", label: "Mentions" },
];

function NotificationsPage() {
  const { userId } = useAuth();
  const [filter, setFilter] = useState<NotifFilter>("all");
  const { data: notifications, isLoading } = useNotifications(userId, filter);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });

  async function open(n: AppNotification) {
    if (!n.read_at) {
      await markNotificationRead(n.id);
      refresh();
    }
    if (n.post) {
      if (n.post.kind === "reel") navigate({ to: "/reels", search: { r: n.post.id } });
      else navigate({ to: "/feed", search: { p: n.post.id } });
    } else if (n.actor) {
      navigate({ to: "/u/$username", params: { username: n.actor.username } });
    }
  }

  async function markAll() {
    if (!userId) return;
    await markAllNotificationsRead(userId);
    refresh();
    toast.success("All notifications marked as read");
  }

  async function dismiss(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await dismissNotification(id);
    refresh();
  }

  async function respondFriendRequest(e: React.MouseEvent, n: AppNotification, accept: boolean) {
    e.stopPropagation();
    if (!userId) return;
    if (accept) {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("requester_id", n.actor_id)
        .eq("recipient_id", userId);
      if (error) { toast.error(error.message); return; }
      toast.success("Friend request accepted");
    } else {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("requester_id", n.actor_id)
        .eq("recipient_id", userId);
      if (error) { toast.error(error.message); return; }
      toast.success("Friend request declined");
    }
    await markNotificationRead(n.id);
    refresh();
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <h1 className="font-display text-lg font-bold">Notifications</h1>
        <button
          onClick={markAll}
          className="flex items-center gap-1.5 rounded-full border border-cyan/40 px-3 py-1.5 text-xs font-semibold text-cyan transition-colors hover:bg-cyan/10"
        >
          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
        </button>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border px-4 py-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              filter === t.key ? "bg-neon text-primary-foreground glow-cyan" : "bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface" />)}
        </div>
      )}

      {notifications?.length === 0 && (
        <div className="flex flex-col items-center px-8 py-20 text-center">
          <Bell className="h-12 w-12 text-cyan" />
          <h2 className="mt-4 font-display text-lg font-bold">Nothing here yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">When people interact with you, it shows up here.</p>
        </div>
      )}

      <div className="divide-y divide-border">
        {notifications?.map((n) => (
          <div
            key={n.id}
            onClick={() => open(n)}
            className={cn(
              "flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface",
              !n.read_at && "bg-cyan/5",
            )}
          >
            <Avatar src={n.actor?.avatar_url} name={n.actor?.username} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="inline-flex items-center gap-1 font-semibold">
                  {n.actor?.display_name || n.actor?.username || "Someone"}
                  {n.actor && <VerifiedBadge userId={n.actor.id} />}
                </span>{" "}
                <span className="text-muted-foreground">{notificationText(n.type)}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
              {n.type === "friend_request" && !n.read_at && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={(e) => respondFriendRequest(e, n, true)}
                    className="flex items-center gap-1 rounded-full bg-neon px-3 py-1 text-xs font-semibold text-primary-foreground"
                  >
                    <UserCheck className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button
                    onClick={(e) => respondFriendRequest(e, n, false)}
                    className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold"
                  >
                    <UserX className="h-3.5 w-3.5" /> Decline
                  </button>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {!n.read_at && (
                <button
                  onClick={async (e) => { e.stopPropagation(); await markNotificationRead(n.id); refresh(); }}
                  aria-label="Mark as read"
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-surface hover:text-cyan"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={(e) => dismiss(e, n.id)}
                aria-label="Dismiss notification"
                className="rounded-full p-1.5 text-muted-foreground hover:bg-surface hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {!n.read_at && <span className="h-2.5 w-2.5 rounded-full bg-cyan glow-cyan" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
