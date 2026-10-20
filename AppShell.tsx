import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUnreadCount } from "@/lib/notifications";
import { CreateModal } from "./CreateModal";
import { DesktopSidebar } from "./nav/DesktopSidebar";
import { MobileBottomNav } from "./nav/MobileBottomNav";
import { MobileTopBar } from "./nav/MobileTopBar";
import { cn } from "@/lib/utils";

const CreateCtx = createContext<() => void>(() => {});
export const useOpenCreate = () => useContext(CreateCtx);

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { profile, userId } = useAuth();
  const { data: unread = 0 } = useUnreadCount(userId);
  const loc = useLocation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const immersive = loc.pathname.startsWith("/reels") || loc.pathname.startsWith("/messages");
  const openCreate = () => setOpen(true);
  const navProfile = profile ? { username: profile.username, avatar_url: profile.avatar_url ?? null } : null;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <CreateCtx.Provider value={openCreate}>
      <div className="min-h-screen bg-background md:pl-20 lg:pl-64">
        <DesktopSidebar profile={navProfile} unread={unread} onCreate={openCreate} onSignOut={signOut} />

        {!immersive && <MobileTopBar unread={unread} onSignOut={signOut} />}

        <main className={cn(!immersive && "pb-20 md:pb-0")}>
          <Outlet />
        </main>

        <MobileBottomNav profile={navProfile} onCreate={openCreate} />
      </div>
      <CreateModal open={open} onClose={() => setOpen(false)} />
    </CreateCtx.Provider>
  );
}
