import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const NOTIF_SELECT =
  "*, actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_url), post:posts(id, kind)";

export type AppNotification = {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  post_id: string | null;
  comment_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
  post: { id: string; kind: string } | null;
};

export const NOTIF_FILTERS = {
  all: [] as string[],
  unread: [] as string[],
  likes: ["like", "reel_like"],
  comments: ["comment", "reply", "reel_comment"],
  friends: ["friend_request", "friend_accept"],
  followers: ["follow"],
  shares: ["share"],
  mentions: ["mention"],
} as const;

export type NotifFilter = keyof typeof NOTIF_FILTERS;

export function useNotifications(userId: string | null, filter: NotifFilter = "all") {
  return useQuery({
    queryKey: ["notifications", "list", userId, filter],
    enabled: !!userId,
    queryFn: async () => {
      let q = supabase
        .from("notifications")
        .select(NOTIF_SELECT)
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter === "unread") q = q.is("read_at", null);
      else if (filter !== "all") q = q.in("type", [...NOTIF_FILTERS[filter]]);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AppNotification[];
    },
  });
}

export function useUnreadCount(userId: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications", "unread", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  return query;
}

export async function markNotificationRead(id: string) {
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
}

export async function markAllNotificationsRead(userId: string) {
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
}

export async function dismissNotification(id: string) {
  await supabase.from("notifications").delete().eq("id", id);
}

export function notificationText(type: string): string {
  switch (type) {
    case "like": return "liked your post";
    case "reel_like": return "liked your reel";
    case "comment": return "commented on your post";
    case "reel_comment": return "commented on your reel";
    case "reply": return "replied to your comment";
    case "follow": return "started following you";
    case "friend_request": return "sent you a friend request";
    case "friend_accept": return "accepted your friend request";
    case "share": return "shared your post";
    case "mention": return "mentioned you";
    default: return "interacted with you";
  }
}
