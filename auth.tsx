import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Talkigram" },
      { name: "description", content: "Sign in or create your Talkigram account." },
      { property: "og:title", content: "Sign in — Talkigram" },
      { property: "og:description", content: "Join Talkigram to share stories, posts and reels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (session) navigate({ to: "/feed", replace: true }); }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { username } },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message);
  }

  const input = "w-full rounded-xl border border-input bg-surface px-4 py-3 text-sm outline-none transition-shadow focus:border-cyan focus:glow-cyan";
  return (
    <main className="grid-bg relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-cyan/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-teal/15 blur-3xl" />
      <div className="relative w-full max-w-sm rounded-3xl border border-cyan/15 bg-card/80 p-7 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-2">
          <span className="font-display text-xl font-bold text-neon">Talkigram</span>
        </div>
        <h1 className="font-display text-2xl font-bold">{mode === "in" ? "Welcome back" : "Create account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{mode === "in" ? "Sign in to continue your conversations." : "Join the neon side of social."}</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "up" && <input className={input} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />}
          <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={input} type="password" placeholder="Password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button disabled={busy} className="w-full rounded-xl bg-neon py-3 font-semibold text-primary-foreground glow-cyan disabled:opacity-50">
            {busy ? "..." : mode === "in" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button onClick={google} className="mt-3 w-full rounded-xl border border-border bg-surface py-3 text-sm font-semibold transition-colors hover:border-cyan">
          Continue with Google
        </button>
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-5 w-full text-sm text-muted-foreground">
          {mode === "in" ? "New here? " : "Have an account? "}
          <span className="text-cyan">{mode === "in" ? "Create account" : "Sign in"}</span>
        </button>
      </div>
    </main>
  );
}
