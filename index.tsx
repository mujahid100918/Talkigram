import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Clapperboard, MessageCircle, Sparkles, Zap } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Talkigram — share moments in neon" },
      { name: "description", content: "Talkigram is a social app for stories, posts, reels and real-time chat." },
      { property: "og:title", content: "Talkigram — share moments in neon" },
      { property: "og:description", content: "Stories, posts, reels and real-time chat in one glowing feed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Zap, label: "Stories that glow" },
  { icon: Clapperboard, label: "Reels that loop" },
  { icon: MessageCircle, label: "Chats that land instantly" },
];

function Landing() {
  const { session, ready } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (ready && session) navigate({ to: "/feed", replace: true }); }, [ready, session, navigate]);

  return (
    <main className="grid-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-teal/20 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-1/3 h-64 w-64 rounded-full bg-cyan/10 blur-3xl" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mx-auto mb-8 w-fit rounded-[2rem] border border-cyan/20 bg-card/60 p-4 glow-cyan backdrop-blur"
        >
          <AppLogo className="h-28 w-28 rounded-3xl" />
        </motion.div>
        <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
          <span className="text-neon">Talkigram</span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-muted-foreground">Your world, in neon. Share stories, reels and moments with the people who matter.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {features.map((f, i) => (
            <motion.span
              key={f.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex items-center gap-2 rounded-full border border-cyan/25 bg-card/70 px-4 py-2 text-xs font-semibold text-foreground backdrop-blur"
            >
              <f.icon className="h-4 w-4 text-cyan" /> {f.label}
            </motion.span>
          ))}
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <Link to="/auth" className="mt-10 inline-flex items-center gap-2 rounded-full bg-neon px-8 py-3 font-semibold text-primary-foreground glow-cyan transition-transform active:scale-95">
            <Sparkles className="h-4 w-4" /> Get started
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
