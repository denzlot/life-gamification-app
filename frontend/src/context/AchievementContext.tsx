import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { api } from "../api/http";
import type { AchievementResponse } from "../api/types";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

interface AchievementContextValue {
  syncAchievements: (silent?: boolean) => Promise<AchievementResponse[]>;
}

const AchievementContext = createContext<AchievementContextValue | null>(null);

export function AchievementProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { notify } = useToast();

  const storageKey = user ? `flowvizior.achievements.${user.id}` : "flowvizior.achievements.guest";

  const syncAchievements = useCallback(
    async (silent = false) => {
      if (!user) return [];
      const list = await api.profile.achievements();
      const nextKeys = list.map((item) => item.key);
      const raw = localStorage.getItem(storageKey);
      const known = raw ? (JSON.parse(raw) as string[]) : [];
      const knownSet = new Set(known);
      const fresh = list.filter((item) => !knownSet.has(item.key));

      if (!silent && known.length > 0) {
        fresh.forEach((item) => {
          notify({
            tone: "success",
            title: "Достижение открыто",
            text: `${item.title} · +${item.xpReward} XP`
          });
        });
      }

      localStorage.setItem(storageKey, JSON.stringify(nextKeys));
      return list;
    },
    [notify, storageKey, user]
  );

  useEffect(() => {
    syncAchievements(true).catch(() => undefined);
  }, [syncAchievements]);

  const value = useMemo(() => ({ syncAchievements }), [syncAchievements]);
  return <AchievementContext.Provider value={value}>{children}</AchievementContext.Provider>;
}

export function useAchievementWatcher() {
  const context = useContext(AchievementContext);
  if (!context) throw new Error("useAchievementWatcher должен использоваться внутри AchievementProvider");
  return context;
}
