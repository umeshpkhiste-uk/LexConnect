import type { RealtimeChannel } from "@supabase/supabase-js";
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "@/features/auth/AuthProvider";
import { getMyProfile } from "@/features/profile/api";
import { supabase } from "@/shared/lib/supabase";

/**
 * "Who's online" via Supabase Realtime Presence — no table, nothing stored.
 * Every signed-in app joins one channel keyed by user id; the channel's
 * presence state *is* the online list. Presence entries vanish on their own
 * when the socket closes (app killed, network lost), and we untrack when the
 * app goes to the background so "online" means "has the app open".
 *
 * Advocates with a private profile still see others online but don't
 * announce themselves.
 */

const CHANNEL = "presence:online-advocates";

const OnlineContext = createContext<ReadonlySet<string>>(new Set());

export function PresenceProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [onlineIds, setOnlineIds] = useState<ReadonlySet<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    let isActive = true;
    let shouldAnnounce = true;
    const channel = supabase.channel(CHANNEL, { config: { presence: { key: userId } } });
    channelRef.current = channel;

    const announce = () => {
      if (shouldAnnounce && AppState.currentState === "active") {
        channel.track({ online_at: new Date().toISOString() });
      }
    };

    channel
      .on("presence", { event: "sync" }, () => {
        if (isActive) setOnlineIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") announce();
      });

    getMyProfile()
      .then((profile) => {
        shouldAnnounce = profile.profile_visibility !== "private";
        if (!shouldAnnounce) channel.untrack();
      })
      .catch(() => {});

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") announce();
      else channel.untrack();
    });

    return () => {
      isActive = false;
      appStateSub.remove();
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setOnlineIds(new Set());
    };
  }, [userId]);

  return <OnlineContext.Provider value={onlineIds}>{children}</OnlineContext.Provider>;
}

/** True when the advocate currently has LexxBridge open. */
export function useIsOnline(userId: string | null | undefined): boolean {
  const online = useContext(OnlineContext);
  return !!userId && online.has(userId);
}
