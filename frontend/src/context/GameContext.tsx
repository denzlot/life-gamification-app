import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api/http";
import type { ProfileResponse } from "../api/types";
import { applyHpState } from "../utils/hp";
import { useAuth } from "./AuthContext";

interface GameContextValue {
  profile: ProfileResponse | null;
  loading: boolean;
  refreshProfile: () => Promise<ProfileResponse | null>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      applyHpState(null);
      return null;
    }
    setLoading(true);
    try {
      const next = await api.profile.get();
      setProfile(next);
      applyHpState(next.gameStats);
      return next;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshProfile().catch(() => undefined);
  }, [refreshProfile]);

  const value = useMemo(() => ({ profile, loading, refreshProfile }), [profile, loading, refreshProfile]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame должен использоваться внутри GameProvider");
  return context;
}
