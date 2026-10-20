import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, UserPlus, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VerifiedBadge({ userId }: { userId: string }) {
  const { data: verified = [] } = useQuery({
    queryKey: ["verified-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("account_verifications").select("user_id");
      if (error) throw error;
      return data?.map((v) => v.user_id) ?? [];
    },
  });
  return verified.includes(userId) ? <BadgeCheck aria-label="Verified account" className="inline-block h-4 w-4 shrink-0 text-verification" /> : null;
}

function useFollows(targetId: string) {
  return useQuery({
    queryKey: ["follows", targetId],
    queryFn: async () => {
      const { data, error } = await supabase.from("follows").select("follower_id,following_id").or(`follower_id.eq.${targetId},following_id.eq.${targetId}`);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function FollowButton({ targetId, compact, onMedia }: { targetId: string; compact?: boolean; onMedia?: boolean }) {
  const { userId } = useAuth();
  const { data: rows, isLoading, error } = useFollows(targetId);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  if (!userId || targetId === userId) return null;
  const serverFollowing = !!rows?.some((r) => r.follower_id === userId && r.following_id === targetId);
  const following = optimistic ?? serverFollowing;
  const followsMe = rows?.some((r) => r.follower_id === targetId && r.following_id === userId);
  async function toggle() {
    if (!userId) return;
    const next = !following;
    setOptimistic(next);
    setBusy(true);
    try {
      const { error } = next
        ? await supabase.from("follows").insert({ follower_id: userId, following_id: targetId })
        : await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", targetId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["follows"] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setOptimistic(null); setBusy(false); }
  }
  const label = following ? "Following" : followsMe ? "Follow Back" : "Follow";
  if (compact || onMedia) {
    return (
      <button type="button" disabled={busy || isLoading || !!error} onClick={toggle} aria-pressed={following}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-60",
          following
            ? onMedia ? "border border-white/60 bg-white/10 text-white backdrop-blur" : "bg-secondary text-foreground hover:bg-secondary/80"
            : "bg-primary text-primary-foreground shadow-sm hover:brightness-110",
        )}>
        {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}{label}
      </button>
    );
  }
  return <Button size="sm" variant={following ? "secondary" : "default"} disabled={busy || isLoading || !!error} onClick={toggle} aria-pressed={following} title={following ? "Unfollow" : undefined}>
    {following ? <UserCheck /> : <UserPlus />}{label}
  </Button>;
}

export function FollowCounts({ targetId }: { targetId: string }) {
  const { data: rows, error } = useFollows(targetId);
  return <div className="mt-4 flex justify-center gap-8 border-y border-border py-3 text-sm">
    <span><strong>{error || !rows ? "—" : rows.filter((r) => r.following_id === targetId).length}</strong> <span className="text-muted-foreground">Followers</span></span>
    <span><strong>{error || !rows ? "—" : rows.filter((r) => r.follower_id === targetId).length}</strong> <span className="text-muted-foreground">Following</span></span>
  </div>;
}

export function VerificationRequest() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["verification-request", userId], enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.from("verification_requests").select("status").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || reason.trim().length < 10) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("verification_requests").insert({ user_id: userId, reason: reason.trim() });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["verification-request", userId] });
      toast.success("Verification request submitted"); setOpen(false);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return <>
    <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)} disabled={isLoading || !!error}><BadgeCheck className="text-verification" />{data ? "Verification status" : "Get Verified / Blue Tick"}</Button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby="verification-title" className="w-full max-w-md rounded-lg border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 id="verification-title" className="font-semibold">Talkigram verification</h2><Button variant="ghost" size="icon" aria-label="Close verification" onClick={() => setOpen(false)}><X /></Button></div>
        {data ? <p role="status" className="mt-4 text-sm">Request status: <strong className="capitalize">{data.status}</strong></p> : <form onSubmit={submit} className="mt-4 space-y-4">
          <label className="block text-sm">Why should your account be verified?
            <textarea required minLength={10} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2 h-28 w-full rounded-md border border-input bg-surface p-3" />
          </label>
          <p className="text-sm text-muted-foreground">Requests are reviewed before a blue tick is awarded.</p>
          <Button type="submit" disabled={busy || reason.trim().length < 10}>{busy ? "Submitting…" : "Request verification"}</Button>
        </form>}
      </section>
    </div>}
  </>;
}
