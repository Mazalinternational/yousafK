import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setViewSeasonScope } from "@/api/client";
import { useActiveSeason } from "./hooks";

const VIEW_SEASON_STORAGE_KEY = "yk_view_season_id";

type SeasonScopeContextValue = {
  selectedSeasonId: string | null;
  activeSeasonId: string | null;
  setSelectedSeasonId: (seasonId: string | null) => void;
};

const SeasonScopeContext = createContext<SeasonScopeContextValue | undefined>(
  undefined,
);

export function SeasonScopeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: activeSeason } = useActiveSeason();

  const [selectedSeasonId, setSelectedSeasonIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(VIEW_SEASON_STORAGE_KEY);
  });

  useEffect(() => {
    if (!selectedSeasonId && activeSeason?.id) {
      setSelectedSeasonIdState(activeSeason.id);
    }
  }, [activeSeason?.id, selectedSeasonId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (selectedSeasonId) {
        window.localStorage.setItem(VIEW_SEASON_STORAGE_KEY, selectedSeasonId);
      } else {
        window.localStorage.removeItem(VIEW_SEASON_STORAGE_KEY);
      }
    }

    setViewSeasonScope(selectedSeasonId);
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== "seasons",
    });
  }, [queryClient, selectedSeasonId]);

  const value = useMemo<SeasonScopeContextValue>(
    () => ({
      selectedSeasonId,
      activeSeasonId: activeSeason?.id ?? null,
      setSelectedSeasonId: (seasonId: string | null) => {
        setSelectedSeasonIdState(seasonId?.trim() || null);
      },
    }),
    [activeSeason?.id, selectedSeasonId],
  );

  return (
    <SeasonScopeContext.Provider value={value}>
      {children}
    </SeasonScopeContext.Provider>
  );
}

export function useSeasonScope() {
  const context = useContext(SeasonScopeContext);
  if (!context) {
    throw new Error("useSeasonScope must be used within SeasonScopeProvider");
  }
  return context;
}
