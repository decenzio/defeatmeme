import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import type { GameResultResponse } from "~~/services/golemdb/GolemGameService";

interface UseGolemDBReturn {
  saveGameResult: (data: {
    killsByType: number[];
    transactionHash?: string;
    blockNumber?: number;
    gameSession?: string;
  }) => Promise<GameResultResponse>;
  getLeaderboard: (limit?: number) => Promise<GameResultResponse[]>;
  getPlayerHistory: (playerAddress?: string) => Promise<GameResultResponse[]>;
  getGlobalStats: () => Promise<{
    totalGames: number;
    totalKills: number;
    averageScore: number;
    topScore: number;
    killsByMemeType: number[];
  }>;
  getMemeStats: (memeTypeIndex: number) => Promise<{
    totalKills: number;
    gamesPlayed: number;
    averageKillsPerGame: number;
  }>;
  loading: boolean;
  error: string | null;
}

export const useGolemDB = (): UseGolemDBReturn => {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveGameResult = async (data: {
    killsByType: number[];
    transactionHash?: string;
    blockNumber?: number;
    gameSession?: string;
  }): Promise<GameResultResponse> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/golemdb", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerAddress: address,
          ...data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save game result");
      }

      const result = await response.json();
      return result.gameResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getLeaderboard = useCallback(async (limit = 10): Promise<GameResultResponse[]> => {
    setLoading(true);
    setError(null);

    try {
      console.log("🔍 Fetching leaderboard from GolemDB API...");
      const response = await fetch(`/api/golemdb?action=leaderboard&limit=${limit}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ API Error:", errorData);
        throw new Error(errorData.error || "Failed to fetch leaderboard");
      }

      const result = await response.json();
      console.log("✅ Leaderboard fetched:", result.leaderboard?.length || 0, "entries");
      return result.leaderboard || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("❌ Leaderboard fetch failed:", errorMessage);
      setError(errorMessage);
      return []; // Return empty array instead of throwing
    } finally {
      setLoading(false);
    }
  }, []);

  const getPlayerHistory = async (playerAddress?: string): Promise<GameResultResponse[]> => {
    const addressToUse = playerAddress || address;
    if (!addressToUse) {
      throw new Error("Player address not provided and wallet not connected");
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/golemdb?action=player-history&playerAddress=${addressToUse}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch player history");
      }

      const result = await response.json();
      return result.history;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getGlobalStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("📊 Fetching global stats from GolemDB API...");
      const response = await fetch("/api/golemdb?action=global-stats");

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Stats API Error:", errorData);
        throw new Error(errorData.error || "Failed to fetch global stats");
      }

      const result = await response.json();
      console.log("✅ Global stats fetched:", result.stats);
      return result.stats || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("❌ Global stats fetch failed:", errorMessage);
      setError(errorMessage);
      return null; // Return null instead of throwing
    } finally {
      setLoading(false);
    }
  }, []);

  const getMemeStats = async (memeTypeIndex: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/golemdb?action=meme-stats&memeTypeIndex=${memeTypeIndex}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch meme stats");
      }

      const result = await response.json();
      return result.stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    saveGameResult,
    getLeaderboard,
    getPlayerHistory,
    getGlobalStats,
    getMemeStats,
    loading,
    error,
  };
};
