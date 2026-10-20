import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadMedia } from "@/lib/media";
import { cn } from "@/lib/utils";

type Kind = "post" | "reel" | "story";

export function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("post");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { userId } = useAuth();
  const qc = useQueryClient();
  const isVideo = file?.type.startsWith("video");

  function reset() {
    setStep(0); setFile(null); setPreview(null); setCaption(""); setKind("post"); onClose();
  }

  function pick(f?: File) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setKind(f.type.startsWith("video") ? "reel" : "post");
    setStep(1);
  }

  async function share() {
    if (!file || !userId) return;
    setBusy(true);
    try {
      const { url, type } = await uploadMedia(userId, file);
      if (kind === "story") {
        const { error } = await supabase.from("stories").insert({ user_id: userId, media_url: url, media_type: type });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("posts").insert({ user_id: userId, media_url: url, media_type: type, kind, caption, privacy: "public" });
        if (error) throw error;
      }
      toast.success(kind === "story" ? "Story is live" : "Shared!");
      qc.invalidateQueries();
      reset();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  const steps = ["Select media", "Preview", "Details"];
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center" onClick={reset}>
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              {step > 0 ? <button onClick={() => setStep(step - 1)} aria-label="Back"><ArrowLeft className="h-5 w-5" /></button> : <span className="w-5" />}
              <div className="text-center">
                <p className="font-display text-sm font-bold">{steps[step]}</p>
                <div className="mt-1 flex justify-center gap-1">{steps.map((_, i) => <span key={i} className={cn("h-1 w-6 rounded-full", i <= step ? "bg-neon" : "bg-muted")} />)}</div>
              </div>
              <button onClick={reset} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>

            {step === 0 && (
              <div className="p-6">
                <button onClick={() => inputRef.current?.click()} className="grid-bg flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-cyan/50 text-muted-foreground hover:border-cyan">
                  <ImagePlus className="h-12 w-12 text-cyan" />
                  <span className="text-sm font-semibold">Choose a photo or video</span>
                </button>
                <input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
              </div>
            )}

            {step === 1 && preview && (
              <div className="p-4">
                <div className="overflow-hidden rounded-2xl bg-background">
                  {isVideo ? <video src={preview} controls autoPlay muted loop className="max-h-[60vh] w-full object-contain" /> : <img src={preview} alt="" className="max-h-[60vh] w-full object-contain" />}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {(["post", "reel", "story"] as Kind[]).map((k) => (
                    <button key={k} disabled={k === "reel" && !isVideo} onClick={() => setKind(k)}
                      className={cn("rounded-xl border py-2 text-sm font-semibold capitalize disabled:opacity-30", kind === k ? "border-cyan text-cyan glow-cyan" : "border-border")}>{k}</button>
                  ))}
                </div>
                <button onClick={() => (kind === "story" ? share() : setStep(2))} disabled={busy} className="mt-4 w-full rounded-xl bg-neon py-3 font-semibold text-primary-foreground">
                  {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : kind === "story" ? "Share story" : "Next"}
                </button>
              </div>
            )}

            {step === 2 && preview && (
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                    {isVideo ? <video src={preview} muted className="h-full w-full object-cover" /> : <img src={preview} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2200} placeholder="Write a caption… use #hashtags"
                    className="h-28 flex-1 resize-none rounded-xl border border-input bg-surface p-3 text-sm outline-none focus:border-cyan" />
                </div>
                <button onClick={share} disabled={busy} className="mt-4 w-full rounded-xl bg-neon py-3 font-semibold text-primary-foreground glow-cyan">
                  {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : `Share ${kind}`}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
